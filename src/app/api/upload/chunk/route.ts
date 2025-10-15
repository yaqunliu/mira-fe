import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// 确保上传目录存在
const UPLOAD_DIR = join(process.cwd(), 'uploads', 'chunks')

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureUploadDir()
    
    const formData = await request.formData()
    const chunk = formData.get('chunk') as File
    const index = formData.get('index') as string
    const totalChunks = formData.get('totalChunks') as string
    const uploadId = formData.get('uploadId') as string
    const fileName = formData.get('fileName') as string

    if (!chunk || !index || !totalChunks || !uploadId || !fileName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 创建上传ID目录
    const uploadDir = join(UPLOAD_DIR, uploadId)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // 保存分片文件
    const chunkPath = join(uploadDir, `chunk_${index}`)
    const buffer = Buffer.from(await chunk.arrayBuffer())
    await writeFile(chunkPath, buffer)

    // 检查是否所有分片都已上传
    const uploadedChunks = []
    for (let i = 0; i < parseInt(totalChunks); i++) {
      const chunkFile = join(uploadDir, `chunk_${i}`)
      if (existsSync(chunkFile)) {
        uploadedChunks.push(i)
      }
    }

    return NextResponse.json({
      success: true,
      chunkIndex: parseInt(index),
      uploadedChunks: uploadedChunks.length,
      totalChunks: parseInt(totalChunks),
      isComplete: uploadedChunks.length === parseInt(totalChunks)
    })

  } catch (error) {
    console.error('Chunk upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to upload chunk' },
      { status: 500 }
    )
  }
}
