import axios from 'axios'
import type { User, LoginData, RegisterData } from '@/stores/auth'

// 开发环境使用相对路径，生产环境使用完整URL
const isDev = import.meta.env.MODE === 'development'
const API_BASE_URL = isDev ? '' : (import.meta.env.VITE_API_BASE_URL || 'http://0.0.0.0:3000')

// 创建axios实例
const api = axios.create({
  baseURL: isDev ? '/api/auth' : `${API_BASE_URL}/api/auth`,
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
    // 检查是否是登录相关的请求，如果是则不自动重定向
    const isLoginRequest = error.config?.url?.includes('/login')
    const isRegisterRequest = error.config?.url?.includes('/register')
    const isProfileRequest = error.config?.url?.includes('/profile')
    
    if ((error.response?.status === 401 || error.response?.status === 403) && !isLoginRequest && !isRegisterRequest) {
      // 只有在非登录/注册请求时才自动重定向
      // 对于profile请求，让调用方处理错误
      if (!isProfileRequest) {
        localStorage.removeItem('authToken')
        localStorage.removeItem('user')
        // 重定向到登录页
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  // 登录
  login: (data: LoginData) => api.post('/login', data),
  
  // 注册
  register: (data: RegisterData) => api.post('/register', data),
  
  // 获取用户信息
  getProfile: () => api.get('/profile'),
  
  // 更新用户信息
  updateProfile: (data: Partial<User>) => api.put('/profile', data),
  
  // 修改密码
  changePassword: (data: { currentPassword: string; newPassword: string }) => 
    api.put('/change-password', data),
  
  // 获取用户列表（管理员）
  getUsers: (params?: { page?: number; limit?: number }) => 
    api.get('/users', { params }),
  
  // 更新用户信息（管理员）
  updateUser: (id: number, data: Partial<User>) => 
    api.put(`/users/${id}`, data),
  
  // 删除用户（管理员）
  deleteUser: (id: number) => api.delete(`/users/${id}`),
  
  // 切换用户状态（管理员）
  toggleUserStatus: (id: number) => api.put(`/users/${id}/toggle-status`),
  
  // 刷新token
  refreshToken: () => api.post('/refresh-token')
}
