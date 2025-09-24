import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'

export interface User {
  id: number
  username: string
  email: string
  role: 'user' | 'admin'
}

export interface LoginData {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  password: string
  email: string
}

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('authToken'))
  const loading = ref(false)
  
  console.log('Auth store 初始化，loading状态:', loading.value)

  // 计算属性
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  // 登录
  const login = async (loginData: LoginData) => {
    try {
      console.log('开始登录，设置loading为true')
      loading.value = true
      const response = await authApi.login(loginData)
      
      if (response.data.success) {
        token.value = response.data.data.token
        user.value = response.data.data.user
        
        // 保存到本地存储
        localStorage.setItem('authToken', token.value!)
        localStorage.setItem('user', JSON.stringify(user.value))
        
        return { success: true, message: response.data.message }
      } else {
        return { success: false, message: response.data.message }
      }
    } catch (error: any) {
      console.error('Login error:', error)
      
      // 根据不同的错误类型返回更具体的错误信息
      let errorMessage = '登录失败，请重试'
      
      if (error.response) {
        // 服务器返回的错误
        const status = error.response?.status
        const serverMessage = error.response?.data?.message
        
        // 优先使用服务器返回的详细错误信息
        if (serverMessage) {
          errorMessage = serverMessage
        } else {
          // 如果没有服务器消息，根据状态码提供默认提示
          if (status === 401) {
            errorMessage = '用户名或密码错误'
          } else if (status === 403) {
            errorMessage = '账户已被禁用'
          } else if (status === 408) {
            errorMessage = '请求超时，请稍后重试'
          } else if (status === 503) {
            errorMessage = '服务暂时不可用，请稍后重试'
          } else if (status === 500) {
            errorMessage = '服务器内部错误，请稍后重试'
          }
        }
      } else if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        errorMessage = '网络连接失败，请检查网络连接'
      } else if (error.message?.includes('timeout')) {
        errorMessage = '请求超时，请重试'
      }
      
      return { 
        success: false, 
        message: errorMessage
      }
    } finally {
      loading.value = false
    }
  }

  // 注册
  const register = async (registerData: RegisterData) => {
    try {
      console.log('开始注册，设置loading为true')
      loading.value = true
      const response = await authApi.register(registerData)
      
      if (response.data.success) {
        return { success: true, message: response.data.message }
      } else {
        return { success: false, message: response.data.message }
      }
    } catch (error: any) {
      console.error('Register error:', error)
      return { 
        success: false, 
        message: error.response?.data?.message || '注册失败，请重试' 
      }
    } finally {
      loading.value = false
    }
  }

  // 登出
  const logout = () => {
    console.log('登出，重置loading状态')
    user.value = null
    token.value = null
    loading.value = false
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
  }

  // 重置loading状态
  const resetLoading = () => {
    console.log('重置loading状态，当前值:', loading.value)
    loading.value = false
    console.log('重置后loading状态:', loading.value)
  }

  // 刷新token
  const refreshToken = async () => {
    try {
      if (!token.value) {
        console.log('没有token，无法刷新')
        return false
      }
      
      console.log('正在刷新token...')
      const response = await authApi.refreshToken()
      
      if (response.data.success) {
        token.value = response.data.data.token
        localStorage.setItem('authToken', token.value || '')
        console.log('Token刷新成功')
        return true
      } else {
        console.log('Token刷新失败:', response.data.message)
        return false
      }
    } catch (error: any) {
      console.error('Refresh token error:', error)
      return false
    }
  }

  // 获取用户信息
  const fetchProfile = async () => {
    try {
      if (!token.value) {
        console.log('没有token，无法获取用户信息')
        return false
      }
      
      console.log('正在获取用户信息，当前loading状态:', loading.value)
      const response = await authApi.getProfile()
      console.log('获取用户信息响应:', response.data)
      
      if (response.data.success) {
        user.value = response.data.data
        localStorage.setItem('user', JSON.stringify(user.value))
        console.log('用户信息获取成功:', user.value)
        return true
      } else {
        console.log('获取用户信息失败:', response.data.message)
        logout()
        return false
      }
    } catch (error: any) {
      console.error('Fetch profile error:', error)
      
      // 改进错误处理，区分token过期和其他错误
      if (error.response?.status === 401) {
        const errorData = error.response?.data
        if (errorData?.message === 'Token expired') {
          console.log('Token已过期，尝试刷新token...')
          const refreshSuccess = await refreshToken()
          if (refreshSuccess) {
            console.log('Token刷新成功，重新获取用户信息')
            return await fetchProfile()
          } else {
            console.log('Token刷新失败，清除认证状态')
            logout()
            return false
          }
        } else {
          console.log('Token无效，清除认证状态')
          logout()
          return false
        }
      }
      
      // 其他错误也清除状态
      logout()
      return false
    } finally {
      // 确保loading状态为false
      loading.value = false
    }
  }

  // 更新用户信息
  const updateProfile = async (updateData: Partial<User>) => {
    try {
      console.log('开始更新用户信息，设置loading为true')
      loading.value = true
      const response = await authApi.updateProfile(updateData)
      
      if (response.data.success) {
        user.value = { ...user.value, ...response.data.data }
        localStorage.setItem('user', JSON.stringify(user.value))
        return { success: true, message: response.data.message }
      } else {
        return { success: false, message: response.data.message }
      }
    } catch (error: any) {
      console.error('Update profile error:', error)
      return { 
        success: false, 
        message: error.response?.data?.message || '更新失败，请重试' 
      }
    } finally {
      loading.value = false
    }
  }

  // 初始化认证状态
  const initAuth = async () => {
    console.log('初始化认证状态，token:', token.value, 'loading:', loading.value)
    
    if (token.value) {
      // 尝试从本地存储恢复用户信息
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        try {
          user.value = JSON.parse(savedUser)
          console.log('从本地存储恢复用户信息:', user.value)
        } catch (error) {
          console.error('Parse saved user error:', error)
          logout()
          return false
        }
      }
      
      // 验证token有效性
      console.log('验证token有效性...')
      const isValid = await fetchProfile()
      console.log('Token验证结果:', isValid)
      return isValid
    } else {
      console.log('没有token，用户未登录')
      // 确保loading状态为false
      loading.value = false
      return false
    }
  }

  return {
    // 状态
    user,
    token,
    loading,
    
    // 计算属性
    isAuthenticated,
    isAdmin,
    
    // 方法
    login,
    register,
    logout,
    fetchProfile,
    updateProfile,
    initAuth,
    resetLoading,
    refreshToken
  }
})
