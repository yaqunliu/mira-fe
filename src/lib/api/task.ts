import { apiClient } from './client'
import type { Task } from '@/types'

const taskApi = {
  // apiClient.get 返回的已经是 response.data，如果后端直接返回 Task，则这里返回的就是 Task
  queryTaskStatus: async (taskId: string): Promise<{data: Task, message: string}> => {
    // @ts-ignore - 后端直接返回 Task 而不是 ApiResponse<Task>
    return apiClient.get<ApiResponse<Task>>(`/api/v1/tasks/${taskId}`) as Promise<{data: Task, message: string}>
  },
}

export default taskApi;