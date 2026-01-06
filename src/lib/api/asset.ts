import { apiClient } from './client';
import type { ApiResponse } from '@/types';
import {
  AssetType,
  type IAsset,
  type ICreateAssetRequest,
  type IUpdateAssetRequest,
  type IUS3SignatureResponse
} from '@/types/asset';
import axios from 'axios';

class AssetApi {
  /**
   * 获取US3上传签名
   */
  async getUploadSignature(fileName: string, fileType: string): Promise<ApiResponse<IUS3SignatureResponse>> {
    return apiClient.post('/api/v1/assets/upload-signature', {
      file_name: fileName,
      file_type: fileType,
    });
  }

  /**
   * 上传文件到US3 (使用POST表单上传)
   */
  async uploadToUS3(
    file: File,
    signature: IUS3SignatureResponse,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    // 根据US3文档，使用POST表单上传
    // 参考: https://docs.ucloud.cn/ufile/api/authorization
    const formData = new FormData();
    formData.append('FileName', signature.key);
    formData.append('Content-Type', file.type);  // 添加文件的 MIME 类型
    formData.append('file', file);

    await axios.post(signature.url, formData, {
      headers: {
        'Authorization': signature.authorization,  // Authorization 放在 HTTP Header 中
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return signature.key;
  }

  /**
   * 创建素材记录
   */
  async createAsset(data: ICreateAssetRequest): Promise<ApiResponse<IAsset>> {
    return apiClient.post('/api/v1/assets', data);
  }

  /**
   * 获取素材列表
   */
  async getAssets(novelId: number): Promise<ApiResponse<IAsset[]>> {
    return apiClient.get(`/api/v1/assets?novel_id=${novelId}`);
  }

  /**
   * 获取单个素材
   */
  async getAsset(assetId: string): Promise<ApiResponse<IAsset>> {
    return apiClient.get(`/api/v1/assets/${assetId}`);
  }

  /**
   * 更新素材
   */
  async updateAsset(assetId: string, data: IUpdateAssetRequest): Promise<ApiResponse<IAsset>> {
    return apiClient.put(`/api/v1/assets/${assetId}`, data);
  }

  /**
   * 删除素材
   */
  async deleteAsset(assetId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/api/v1/assets/${assetId}`);
  }

  /**
   * 获取音频/视频文件的时长(毫秒)
   */
  private async getMediaDuration(file: File): Promise<number | undefined> {
    return new Promise((resolve) => {
      const assetType = this.getAssetTypeFromFile(file);

      if (assetType === 'audio') {
        const audio = new Audio();
        audio.preload = 'metadata';

        audio.onloadedmetadata = () => {
          URL.revokeObjectURL(audio.src);
          // 转换为毫秒并四舍五入
          resolve(Math.round(audio.duration * 1000));
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audio.src);
          resolve(undefined); // 解析失败返回 undefined
        };

        audio.src = URL.createObjectURL(file);
      } else if (assetType === 'video') {
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
          URL.revokeObjectURL(video.src);
          // 转换为毫秒并四舍五入
          resolve(Math.round(video.duration * 1000));
        };

        video.onerror = () => {
          URL.revokeObjectURL(video.src);
          resolve(undefined); // 解析失败返回 undefined
        };

        video.src = URL.createObjectURL(file);
      } else {
        resolve(undefined); // 图片类型不需要时长
      }
    });
  }

  /**
   * 完整上传流程：获取签名 -> 上传到US3 -> 创建素材记录
   */
  async uploadAsset(
    file: File,
    novelId: number,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<IAsset>> {
    // 1. 获取上传签名
    const signatureRes = await this.getUploadSignature(file.name, file.type);

    if (!signatureRes.success || !signatureRes.data) {
      throw new Error(signatureRes.message || '获取上传签名失败');
    }

    // 2. 上传到US3
    const fileKey = await this.uploadToUS3(file, signatureRes.data, (progress) => {
      // 上传进度占总进度的80%
      onProgress?.(Math.floor(progress * 0.8));
    });

    // 3. 解析媒体文件时长（音频/视频）
    onProgress?.(85);
    const duration = await this.getMediaDuration(file);

    // 4. 创建素材记录
    onProgress?.(90);

    const assetType = this.getAssetTypeFromFile(file);
    const createRes = await this.createAsset({
      novel_id: novelId,
      type: assetType,
      name: file.name,
      url: signatureRes.data.download_url, // 使用下载URL保存到数据库
      size: file.size,
      duration: duration, // 添加时长信息
    });

    onProgress?.(100);
    return createRes;
  }

  /**
   * 根据文件类型判断素材类型
   */
  private getAssetTypeFromFile(file: File): AssetType {
    if (file.type.startsWith('audio/')) return 'audio' as AssetType;
    if (file.type.startsWith('image/')) return 'image' as AssetType;
    if (file.type.startsWith('video/')) return 'video' as AssetType;

    // 根据文件扩展名判断
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext || '')) return 'audio' as AssetType;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image' as AssetType;
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) return 'video' as AssetType;

    return 'audio' as AssetType; // 默认
  }
}

export default new AssetApi();
