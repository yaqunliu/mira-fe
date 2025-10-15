import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// 确保上传目录存在
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'chunks')
const COMPLETED_DIR = join(process.cwd(), 'uploads', 'completed')

async function ensureDirectories() {
  if (!existsSync(COMPLETED_DIR)) {
    await mkdir(COMPLETED_DIR, { recursive: true })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDirectories()
    
    const { uploadId, fileName, metadata } = await request.json()

    if (!uploadId || !fileName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const uploadDir = join(UPLOAD_DIR, uploadId)
    if (!existsSync(uploadDir)) {
      return NextResponse.json(
        { success: false, error: 'Upload not found' },
        { status: 404 }
      )
    }

    // 读取所有分片文件
    const files = await readdir(uploadDir)
    const chunkFiles = files
      .filter(file => file.startsWith('chunk_'))
      .sort((a, b) => {
        const aIndex = parseInt(a.split('_')[1])
        const bIndex = parseInt(b.split('_')[1])
        return aIndex - bIndex
      })

    if (chunkFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No chunks found' },
        { status: 400 }
      )
    }

    // 合并分片
    const chunks = []
    for (const chunkFile of chunkFiles) {
      const chunkPath = join(uploadDir, chunkFile)
      const chunkData = await readFile(chunkPath)
      chunks.push(chunkData)
    }

    const completeFile = Buffer.concat(chunks)
    
    // 保存完整文件
    const finalFileName = `${Date.now()}_${fileName}`
    const finalPath = join(COMPLETED_DIR, finalFileName)
    await writeFile(finalPath, completeFile)

    // 清理分片文件
    for (const chunkFile of chunkFiles) {
      const chunkPath = join(uploadDir, chunkFile)
      await unlink(chunkPath)
    }

    // 删除上传目录
    try {
      await unlink(uploadDir)
    } catch (error) {
      console.warn('Failed to remove upload directory:', error)
    }

    // 这里可以添加数据库保存逻辑
    // 例如保存到数据库，记录文件信息等
    const fileInfo = {
      id: uploadId,
      originalName: fileName,
      fileName: finalFileName,
      filePath: finalPath,
      fileSize: completeFile.length,
      uploadDate: new Date().toISOString(),
      metadata: metadata || {}
    }

    // 模拟保存到数据库
    console.log('File uploaded successfully:', fileInfo)

    return NextResponse.json({
      success: true,
      file: fileInfo
    })

  } catch (error) {
    console.error('Complete upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to complete upload' },
      { status: 500 }
    )
  }
}
