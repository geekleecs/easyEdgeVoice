<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">EasyEdgeVoice</h1>
        <p class="login-subtitle">智能语音生成平台</p>
      </div>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="用户名或邮箱"
            size="large"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            size="large"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-checkbox v-model="rememberMe">记住我</el-checkbox>
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-button"
            :loading="authStore.loading"
            :disabled="authStore.loading"
            @click="handleLogin"
          >
            {{ authStore.loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <p>
          还没有账户？
          <router-link to="/register" class="register-link">立即注册</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// 表单数据
const loginForm = reactive({
  username: '',
  password: ''
})

const rememberMe = ref(false)

// 表单验证规则
const loginRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名或邮箱', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' }
  ]
}

const loginFormRef = ref<FormInstance>()

// 处理登录
const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  console.log('开始登录，表单数据:', loginForm)
  console.log('认证状态:', authStore.isAuthenticated)
  console.log('加载状态:', authStore.loading)
  
  // 如果已经在加载中，不重复提交
  if (authStore.loading) {
    console.log('登录请求已在进行中，忽略重复提交')
    return
  }
  
  try {
    await loginFormRef.value.validate()
    
    const result = await authStore.login(loginForm)
    console.log('登录结果:', result)
    
    if (result.success) {
      console.log('登录成功，显示成功提示')
      ElMessage.success(result.message)
      // 延迟重定向，让用户看到成功提示
      setTimeout(() => {
        const redirect = router.currentRoute.value.query.redirect as string || '/dashboard'
        console.log('登录成功，重定向到:', redirect)
        router.push(redirect)
      }, 1000)
    } else {
      console.log('登录失败，显示错误信息:', result.message)
      // 显示错误信息并等待用户确认
      await showErrorAndConfirm(result.message)
    }
  } catch (error) {
    console.error('Login validation error:', error)
    await showErrorAndConfirm('登录验证失败')
  }
}

// 显示错误信息并等待用户确认
const showErrorAndConfirm = async (message: string) => {
  return new Promise<void>((resolve) => {
    console.log('显示错误信息:', message)
    
    // 直接显示确认对话框，使用后端返回的详细错误信息
    ElMessageBox.alert(
      `登录失败：${message}`,
      '登录失败',
      {
        confirmButtonText: '确定',
        type: 'error',
        showClose: true,
        closeOnClickModal: false,
        closeOnPressEscape: false,
        beforeClose: (action, _instance, done) => {
          if (action === 'confirm') {
            // 用户点击确定后，清空表单并刷新页面状态
            loginForm.username = ''
            loginForm.password = ''
            if (loginFormRef.value) {
              loginFormRef.value.clearValidate()
            }
            done()
            resolve()
          }
        }
      }
    )
  })
}

// 页面加载时检查认证状态
onMounted(() => {
  console.log('登录页面加载，当前认证状态:', {
    isAuthenticated: authStore.isAuthenticated,
    hasToken: !!authStore.token,
    loading: authStore.loading,
    user: authStore.user
  })
  
  // 确保loading状态为false
  authStore.resetLoading()
  console.log('重置后认证状态:', {
    isAuthenticated: authStore.isAuthenticated,
    hasToken: !!authStore.token,
    loading: authStore.loading,
    user: authStore.user
  })
  
  // 如果已经登录，自动跳转
  if (authStore.isAuthenticated) {
    console.log('用户已登录，自动跳转到dashboard')
    router.push('/dashboard')
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  font-size: 32px;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 8px 0;
}

.login-subtitle {
  color: #7f8c8d;
  margin: 0;
  font-size: 14px;
}

.login-form {
  margin-bottom: 24px;
}

.login-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: #667eea !important;
  border-color: #667eea !important;
}

.login-button:hover {
  background: #5a6fd8 !important;
  border-color: #5a6fd8 !important;
}

.login-button:disabled {
  background: #c0c4cc !important;
  border-color: #c0c4cc !important;
  color: #ffffff !important;
}

.login-footer {
  text-align: center;
  color: #7f8c8d;
  font-size: 14px;
}

.register-link {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
}

.register-link:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .login-card {
    padding: 24px;
    margin: 10px;
  }
  
  .login-title {
    font-size: 24px;
  }
}
</style>

