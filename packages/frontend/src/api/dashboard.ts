import axios from 'axios'

// 开发环境使用相对路径，生产环境使用完整URL
const isDev = import.meta.env.MODE === 'development'
const API_BASE_URL = isDev ? '' : (import.meta.env.VITE_API_BASE_URL || 'http://0.0.0.0:3000')

// 创建axios实例
const api = axios.create({
  baseURL: isDev ? '/api/dashboard' : `${API_BASE_URL}/api/dashboard`,
  timeout: 10000,
})

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理认证错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // 清除本地认证信息
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      // 重定向到登录页
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export interface TTSRecord {
  id: number
  task_id: string
  engine: string
  voice: string
  rate: string
  pitch: string
  volume: string
  use_llm: number
  text_len: number
  language: string
  status: 'pending' | 'success' | 'failed'
  error_message?: string
  file_name?: string
  srt_file?: string
  file_size?: number
  duration_ms?: number
  latency_ms?: number
  requester_ip?: string
  user_id: number
  username: string
  created_at: string
  updated_at: string
  // 新增状态字段
  isPlaying?: boolean
  isDownloading?: boolean
  isSrtLoading?: boolean
  audioInstance?: HTMLAudioElement
}

export interface UserStats {
  overview: {
    totalRecords: number
    successCount: number
    failedCount: number
    pendingCount: number
    totalFileSize: number
    totalDurationMs: number
    avgLatencyMs: number
  }
  engineStats: Array<{ engine: string; count: number }>
  voiceStats: Array<{ voice: string; count: number }>
  recentStats: Array<{ date: string; count: number }>
}

export interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export interface RecordsResponse {
  success: boolean
  data: {
    records: TTSRecord[]
    pagination: Pagination
  }
}

export const dashboardApi = {
  // 获取用户的 TTS 记录
  getUserRecords: (params?: {
    page?: number
    limit?: number
    status?: string
    engine?: string
    voice?: string
    text?: string
    start_date?: string
    end_date?: string
  }) => api.get<RecordsResponse>('/records', { params }),

  // 获取用户的统计信息
  getUserStats: () => api.get<{ success: boolean; data: UserStats }>('/stats'),

  // 管理员获取所有记录
  getAllRecords: (params?: {
    page?: number
    limit?: number
    status?: string
    engine?: string
    voice?: string
    userId?: number
    username?: string
  }) => api.get<RecordsResponse>('/admin/records', { params }),

  // 删除记录
  deleteRecord: (id: number) => api.delete(`/records/${id}`)
}


