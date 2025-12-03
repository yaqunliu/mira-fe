// 积分相关类型定义

// 积分类型
export type PointsType = 'normal' | 'daily_checkin' | 'checkin'

// 记录类型
export type RecordType = 'consume' | 'recharge' | 'reward' | 'refund' | 'expire' | 'checkin'

// 操作类型
export type OperationType =
  | 'create_creation'
  | 'generate_character'
  | 'generate_shot'
  | 'generate_audio'
  | 'generate_video'
  | 'upload_novel'
  | 'llm_call'
  | 'register'
  | 'daily_checkin'
  | 'temporary_points_expire'

// 积分余额响应
export interface PointsBalance {
  total_points: number
  available_points: number
  frozen_points: number
  today_consumed: number
  month_consumed: number
  points_by_type: PointsByType[]
}

// 按类型分组的积分
export interface PointsByType {
  points_type: PointsType
  points: number
  expires_at: string | null
}

// 积分记录
export interface PointsRecord {
  record_id: number
  account_id: number
  user_id: number
  record_type: RecordType
  operation_type: OperationType | null
  points: number // 正数表示增加，负数表示减少
  points_type: PointsType
  expires_at: string | null
  balance_before: number
  balance_after: number
  creation_id: number | null
  novel_id: number | null
  description: string | null
  metadata: Record<string, any> | null
  created_at: string
}

// 积分记录查询参数
export interface PointsRecordsParams {
  page?: number
  page_size?: number
  record_type?: RecordType
  operation_type?: OperationType
  creation_id?: number
  novel_id?: number
  start_date?: string
  end_date?: string
}

// 积分记录列表响应
export interface PointsRecordsResponse {
  items: PointsRecord[]
  total: number
  page: number
  page_size: number
}

// 签到响应
export interface CheckinResponse {
  record_id: number
  points: number
  expires_at: string
  balance_after: number
}

// 积分统计响应
export interface PointsStatistics {
  total_earned: number
  total_consumed: number
  today_consumed: number
  month_consumed: number
  by_operation_type: Record<string, number>
}

// 积分统计查询参数
export interface PointsStatisticsParams {
  start_date?: string
  end_date?: string
}

// 积分检查请求参数
export interface PointsCheckParams {
  operation_type: 'llm_call' | 'generate_audio' | 'generate_video' | 'generate_image'
  // LLM调用参数
  model_name?: string
  estimated_prompt_tokens?: number
  estimated_completion_tokens?: number
  // 音频生成参数
  text_bytes?: number
  audio_duration_seconds?: number
  audio_model_name?: string
  // 视频生成参数
  shot_count?: number
  // 图片生成参数
  image_count?: number
  image_model_name?: string
}

// 积分检查响应
export interface PointsCheckResponse {
  available: boolean
  required_points: number
  available_points: number
  message: string
}

