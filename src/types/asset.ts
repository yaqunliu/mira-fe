/**
 * 素材类型枚举
 */
export enum AssetType {
  AUDIO = 'audio',
  IMAGE = 'image',
  VIDEO = 'video',
}

/**
 * 素材接口
 */
export interface IAsset {
  asset_id: number;
  uuid?: string;
  novel_id: number;
  type: AssetType;
  name: string;
  url: string; // US3地址
  size?: number; // 文件大小(字节)
  duration?: number; // 音频/视频时长(毫秒)
  created_at: string;
  updated_at: string;
}

/**
 * 创建素材请求
 */
export interface ICreateAssetRequest {
  novel_id: number;
  type: AssetType;
  name: string;
  url: string;
  size?: number;
  duration?: number; // 时长(毫秒)
}

/**
 * 更新素材请求
 */
export interface IUpdateAssetRequest {
  name?: string;
}

/**
 * US3上传签名响应
 */
export interface IUS3SignatureResponse {
  url: string; // 上传URL
  authorization: string; // 签名
  key: string; // 文件路径
  download_url: string; // 下载URL
}
