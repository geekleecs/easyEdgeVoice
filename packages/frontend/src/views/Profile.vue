<template>
  <div class="profile-container">
    <div class="profile-header">
      <h1 class="profile-title">个人资料</h1>
      <el-button type="text" @click="goBack">返回</el-button>
    </div>
    
    <div class="profile-content">
      <el-row :gutter="20">
        <el-col :span="16">
          <el-card class="profile-card">
            <template #header>
              <div class="card-header">
                <span>基本信息</span>
              </div>
            </template>
            
            <el-form
              :model="profileForm"
              :rules="rules"
              ref="profileFormRef"
              label-width="100px"
              class="profile-form"
            >
              <el-form-item label="用户ID">
                <span>{{ profileForm.id || '-' }}</span>
              </el-form-item>
              
              <el-form-item label="用户名" prop="username">
                <el-input
                  v-model="profileForm.username"
                  :disabled="!isEditing"
                  placeholder="请输入用户名"
                />
              </el-form-item>
              
              <el-form-item label="邮箱" prop="email">
                <el-input
                  v-model="profileForm.email"
                  :disabled="!isEditing"
                  placeholder="请输入邮箱"
                />
              </el-form-item>
              
              <el-form-item label="角色" prop="role">
                <el-tag :type="profileForm.role === 'admin' ? 'danger' : 'primary'">
                  {{ profileForm.role === 'admin' ? '管理员' : '普通用户' }}
                </el-tag>
              </el-form-item>
              
              <el-form-item>
                <el-button 
                  v-if="!isEditing" 
                  type="primary" 
                  @click="startEdit"
                  :loading="loading"
                >
                  编辑资料
                </el-button>
                <template v-else>
                  <el-button 
                    type="primary" 
                    @click="saveProfile"
                    :loading="loading"
                  >
                    保存
                  </el-button>
                  <el-button @click="cancelEdit">
                    取消
                  </el-button>
                </template>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
        
        <el-col :span="8">
          <el-card class="password-card">
            <template #header>
              <div class="card-header">
                <span>修改密码</span>
              </div>
            </template>
            
            <el-form
              :model="passwordForm"
              :rules="passwordRules"
              ref="passwordFormRef"
              label-width="100px"
              class="password-form"
            >
              <el-form-item label="当前密码" prop="currentPassword">
                <el-input
                  v-model="passwordForm.currentPassword"
                  type="password"
                  placeholder="请输入当前密码"
                  show-password
                />
              </el-form-item>
              
              <el-form-item label="新密码" prop="newPassword">
                <el-input
                  v-model="passwordForm.newPassword"
                  type="password"
                  placeholder="请输入新密码"
                  show-password
                />
              </el-form-item>
              
              <el-form-item label="确认密码" prop="confirmPassword">
                <el-input
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  placeholder="请再次输入新密码"
                  show-password
                />
              </el-form-item>
              
              <el-form-item>
                <el-button 
                  type="primary" 
                  @click="changePassword"
                  :loading="passwordLoading"
                >
                  修改密码
                </el-button>
                <el-button @click="resetPasswordForm">
                  重置
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'

const router = useRouter()
const authStore = useAuthStore()

// 状态
const loading = ref(false)
const passwordLoading = ref(false)
const isEditing = ref(false)
const originalProfile = ref<any>(null)

// 表单引用
const profileFormRef = ref()
const passwordFormRef = ref()

// 个人资料表单
const profileForm = reactive({
  id: '',
  username: '',
  email: '',
  role: '',
  created_at: '',
  last_login_at: ''
})

// 密码修改表单
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 表单验证规则
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const passwordRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: Function) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 格式化时间
// const formatDateTime = (dateString: string) => {
//   if (!dateString) return '未记录'
//   const date = new Date(dateString)
//   const year = date.getFullYear()
//   const month = String(date.getMonth() + 1).padStart(2, '0')
//   const day = String(date.getDate()).padStart(2, '0')
//   const hours = String(date.getHours()).padStart(2, '0')
//   const minutes = String(date.getMinutes()).padStart(2, '0')
//   const seconds = String(date.getSeconds()).padStart(2, '0')
//   return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
// }

// 加载用户资料
const loadProfile = async () => {
  try {
    loading.value = true
    console.log('开始加载用户资料...')
    const response = await authApi.getProfile()
    console.log('用户资料API响应:', response.data)
    
    if (response.data.success) {
      const userData = response.data.data
      console.log('用户数据:', userData)
      Object.assign(profileForm, {
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        created_at: userData.created_at,
        last_login_at: userData.last_login_at
      })
      originalProfile.value = { ...profileForm }
      console.log('个人资料表单数据:', profileForm)
    } else {
      console.error('API返回失败:', response.data.message)
      ElMessage.error(response.data.message || '加载个人资料失败')
    }
  } catch (error) {
    console.error('Load profile error:', error)
    ElMessage.error('加载个人资料失败')
  } finally {
    loading.value = false
  }
}

// 开始编辑
const startEdit = () => {
  isEditing.value = true
}

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false
  Object.assign(profileForm, originalProfile.value)
}

// 保存资料
const saveProfile = async () => {
  try {
    await profileFormRef.value.validate()
    loading.value = true
    
    const response = await authApi.updateProfile({
      username: profileForm.username,
      email: profileForm.email
    })
    
    if (response.data.success) {
      ElMessage.success('个人资料更新成功')
      isEditing.value = false
      originalProfile.value = { ...profileForm }
      
      // 更新store中的用户信息
      if (authStore.user) {
        authStore.user.username = profileForm.username
        authStore.user.email = profileForm.email
        localStorage.setItem('user', JSON.stringify(authStore.user))
      }
    }
  } catch (error: any) {
    console.error('Save profile error:', error)
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('保存失败')
    }
  } finally {
    loading.value = false
  }
}

// 修改密码
const changePassword = async () => {
  try {
    await passwordFormRef.value.validate()
    passwordLoading.value = true
    
    const response = await authApi.changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })
    
    if (response.data.success) {
      ElMessage.success('密码修改成功')
      resetPasswordForm()
    }
  } catch (error: any) {
    console.error('Change password error:', error)
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('密码修改失败')
    }
  } finally {
    passwordLoading.value = false
  }
}

// 重置密码表单
const resetPasswordForm = () => {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordFormRef.value?.resetFields()
}

// 返回
const goBack = () => {
  router.back()
}

// 组件挂载时加载资料
onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.profile-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.profile-title {
  margin: 0;
  color: #303133;
}

.profile-content {
  margin-top: 20px;
}

.profile-card,
.password-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-form,
.password-form {
  max-width: 500px;
}

.el-form-item {
  margin-bottom: 20px;
}

.el-tag {
  font-size: 14px;
}
</style>
