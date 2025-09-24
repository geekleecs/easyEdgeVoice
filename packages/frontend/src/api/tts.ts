import axios from 'axios'

// 开发环境使用相对路径，生产环境使用完整URL
const isDev = import.meta.env.MODE === 'development'
const baseURL = isDev ? '/api/v1/tts' : (import.meta.env.VITE_API_URL || '/api/v1/tts')

const api = axios.create({
  baseURL: baseURL,
  timeout: 60000,
})

// 添加请求拦截器，自动添加认证 token
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

// 添加响应拦截器，处理 401 错误
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // 清除本地存储的 token
      localStorage.removeItem('authToken')
      // 重定向到登录页
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export interface GenerateRequest {
  text: string
  voice?: string
  rate?: string
  pitch?: string
  useLLM?: boolean
  openaiBaseUrl?: string
  openaiKey?: string
  openaiModel?: string
}
export interface TaskRequest {
  id: string
}
export interface TaskResponse {
  success: string
  url: string
  progress: number
  message?: string
}

export interface ResponseWrapper<T> {
  success: boolean
  data?: T
  code: number
  message?: string
}
export interface GenerateResponse {
  audio: string
  file: string
  srt?: string
  size?: number
  id: string
}
export type Voice = {
  Name: string
  cnName?: string
  Gender: string
  ContentCategories: string[]
  VoicePersonalities: string[]
}
export interface Task {
  id: string
  fields: any
  status: string
  progress: number
  message: string
  code?: string | number
  result: any
  createdAt: Date
  updatedAt?: Date
  updateProgress?: (taskId: string, progress: number) => Task | undefined
}
export const getVoiceList = async () => {
  const response = await api.get<ResponseWrapper<Voice[]>>('/voiceList')
  if (response.data?.code !== 200 || !response.data?.success) {
    throw new Error(response.data?.message || '生成语音失败')
  }
  return response.data
}

export const generateTTS = async (data: GenerateRequest) => {
  const response = await api.post<ResponseWrapper<GenerateResponse>>('/generate', data)
  if (response.data?.code !== 200 || !response.data?.success) {
    throw new Error(response.data?.message || '生成语音失败')
  }
  return response.data
}
export const getTask = async (data: TaskRequest) => {
  const response = await api.get<ResponseWrapper<Task>>(`/task/${data.id}`)
  if (response.data?.code !== 200 || !response.data?.success) {
    throw new Error(response.data?.message || '获取任务')
  }
  return response.data
}
export const createTask = async (data: TaskRequest) => {
  const response = await api.post<ResponseWrapper<Task>>(`/create`, data)
  if (response.data?.code !== 200 || !response.data?.success) {
    throw new Error(response.data?.message || '获取任务')
  }
  return response.data
}

export const createTaskStream = async (data: TaskRequest) => {
  const response = await api.post<ReadableStream | ResponseWrapper<GenerateResponse>>(
    `/createStream`,
    data,
    {
      responseType: 'stream',
      adapter: 'fetch',
      timeout: 0,
    }
  )
  const ttsType = response.headers['x-generate-tts-type']
  const contentType = response.headers['content-type']
  if (
    response.status !== 200 ||
    ttsType === 'application/json' ||
    contentType?.includes?.('application/json')
  ) {
    const text = await new Response(response.data as any).text()
    const responseData = JSON.parse(text)
    return responseData
  }
  return response.data as ReadableStream
}

export const downloadFile = async (file: string) => {
  const token = localStorage.getItem('authToken')
  const url = `${api.defaults.baseURL}/download/${file}`
  
  if (token) {
    // 使用 fetch 添加认证头
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`)
    }
    
    return response
  } else {
    // 如果没有token，直接返回URL（会触发401重定向到登录页）
    return fetch(url)
  }
}
