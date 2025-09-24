<template>
  <div class="admin-container">
    <div class="admin-header">
      <h1 class="admin-title">管理后台</h1>
      <div class="admin-actions">
        <el-button type="text" @click="goBack">返回</el-button>
      </div>
    </div>
    
    <div class="admin-content">
      <!-- 统计概览 -->
      <el-row :gutter="20" style="margin-bottom: 20px;">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ adminStats.totalUsers }}</div>
              <div class="stat-label">总用户数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ adminStats.totalRecords }}</div>
              <div class="stat-label">总记录数</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ adminStats.successRecords }}</div>
              <div class="stat-label">成功记录</div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-number">{{ adminStats.failedRecords }}</div>
              <div class="stat-label">失败记录</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      
      <!-- 用户管理 -->
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card class="users-card">
            <template #header>
              <div class="card-header">
                <span>用户管理</span>
                <el-button type="primary" size="small" @click="loadUsers">
                  刷新
                </el-button>
              </div>
            </template>
            
            <el-table :data="users" v-loading="usersLoading" height="400">
              <el-table-column prop="username" label="用户名" width="100" />
              <el-table-column prop="email" label="邮箱" width="180" show-overflow-tooltip />
              <el-table-column prop="role" label="角色" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'" size="small">
                    {{ row.role === 'admin' ? '管理员' : '用户' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="is_active" label="状态" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.is_active ? 'success' : 'danger'" size="small">
                    {{ row.is_active ? '正常' : '停用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="created_at" label="注册时间" width="130">
                <template #default="{ row }">
                  <span>{{ formatDate(row.created_at) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="{ row }">
                  <el-button
                    v-if="row.role !== 'admin'"
                    :type="row.is_active ? 'warning' : 'success'"
                    size="small"
                    @click="toggleUserStatus(row)"
                    :loading="row.toggling"
                  >
                    {{ row.is_active ? '停用' : '启用' }}
                  </el-button>
                  <span v-else class="admin-text">管理员</span>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
        
        <!-- 系统记录 -->
        <el-col :span="12">
          <el-card class="records-card">
            <template #header>
              <div class="card-header">
                <span>系统记录</span>
                <el-button type="primary" size="small" @click="loadAllRecords">
                  刷新
                </el-button>
              </div>
            </template>
            
            <el-table :data="allRecords" v-loading="recordsLoading" height="400">
              <el-table-column prop="username" label="用户" width="100" />
              <el-table-column prop="text" label="内容" width="150" show-overflow-tooltip>
                <template #default="{ row }">
                  <span>{{ row.text || '无内容' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="voice" label="音色" width="120" show-overflow-tooltip>
                <template #default="{ row }">
                  <span>{{ getVoiceDisplayName(row.voice) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="70">
                <template #default="{ row }">
                  <el-tag :type="getStatusType(row.status)" size="small">
                    {{ getStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="created_at" label="时间" width="120">
                <template #default="{ row }">
                  <span>{{ formatDate(row.created_at) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80">
                <template #default="{ row }">
                  <el-button
                    type="danger"
                    size="small"
                    @click="deleteRecord(row)"
                    :loading="row.deleting"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
// import { useAuthStore } from '@/stores/auth'
import { dashboardApi } from '@/api/dashboard'
import { authApi } from '@/api/auth'
import { mapZHVoiceName } from '@/utils'

const router = useRouter()
// const authStore = useAuthStore()

// 状态
const usersLoading = ref(false)
const recordsLoading = ref(false)

// 统计数据
const adminStats = reactive({
  totalUsers: 0,
  totalRecords: 0,
  successRecords: 0,
  failedRecords: 0
})

// 用户列表
const users = ref<any[]>([])
const allRecords = ref<any[]>([])

// 获取状态类型
const getStatusType = (status: string) => {
  switch (status) {
    case 'success': return 'success'
    case 'failed': return 'danger'
    case 'pending': return 'warning'
    default: return 'info'
  }
}

// 获取状态文本
const getStatusText = (status: string) => {
  switch (status) {
    case 'success': return '成功'
    case 'failed': return '失败'
    case 'pending': return '处理中'
    default: return status
  }
}

// 获取音色显示名称
const getVoiceDisplayName = (voice: string) => {
  return mapZHVoiceName(voice) || voice
}

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

// 加载统计数据
const loadAdminStats = async () => {
  try {
    const [usersResponse, recordsResponse] = await Promise.all([
      authApi.getUsers(),
      dashboardApi.getAllRecords({ page: 1, limit: 1 })
    ])
    
    if (usersResponse.data.success) {
      adminStats.totalUsers = usersResponse.data.data.users.length
    }
    
    if (recordsResponse.data.success) {
      const records = recordsResponse.data.data.records
      adminStats.totalRecords = recordsResponse.data.data.pagination.total
      adminStats.successRecords = records.filter((r: any) => r.status === 'success').length
      adminStats.failedRecords = records.filter((r: any) => r.status === 'failed').length
    }
  } catch (error) {
    console.error('Load admin stats error:', error)
    ElMessage.error('加载统计数据失败')
  }
}

// 加载用户列表
const loadUsers = async () => {
  try {
    usersLoading.value = true
    const response = await authApi.getUsers()
    
    if (response.data.success) {
      users.value = response.data.data.users.map((user: any) => ({
        ...user,
        deleting: false,
        toggling: false
      }))
    }
  } catch (error) {
    console.error('Load users error:', error)
    ElMessage.error('加载用户列表失败')
  } finally {
    usersLoading.value = false
  }
}

// 加载所有记录
const loadAllRecords = async () => {
  try {
    recordsLoading.value = true
    const response = await dashboardApi.getAllRecords({ page: 1, limit: 50 })
    
    if (response.data.success) {
      allRecords.value = response.data.data.records.map((record: any) => ({
        ...record,
        deleting: false
      }))
    }
  } catch (error) {
    console.error('Load all records error:', error)
    ElMessage.error('加载系统记录失败')
  } finally {
    recordsLoading.value = false
  }
}

// 删除用户功能已移除

// 切换用户状态
const toggleUserStatus = async (user: any) => {
  try {
    const action = user.is_active ? '停用' : '启用'
    await ElMessageBox.confirm(
      `确定要${action}用户 "${user.username}" 吗？`,
      `确认${action}`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: user.is_active ? 'warning' : 'success',
      }
    )
    
    user.toggling = true
    const response = await authApi.toggleUserStatus(user.id)
    
    if (response.data.success) {
      ElMessage.success(`用户${action}成功`)
      // 更新本地状态
      user.is_active = !user.is_active
      await loadAdminStats()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Toggle user status error:', error)
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method
      })
      ElMessage.error(`状态切换失败: ${error.response?.status} ${error.response?.statusText || error.message}`)
    }
  } finally {
    user.toggling = false
  }
}

// 删除记录
const deleteRecord = async (record: any) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这条记录吗？此操作不可恢复！',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    record.deleting = true
    const response = await dashboardApi.deleteRecord(record.id)
    
    if (response.data.success) {
      ElMessage.success('记录删除成功')
      await loadAllRecords()
      await loadAdminStats()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('Delete record error:', error)
      ElMessage.error('删除记录失败')
    }
  } finally {
    record.deleting = false
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 组件挂载时加载数据
onMounted(async () => {
  await Promise.all([
    loadAdminStats(),
    loadUsers(),
    loadAllRecords()
  ])
})
</script>

<style scoped>
.admin-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.admin-title {
  margin: 0;
  color: #303133;
}

.admin-content {
  margin-top: 20px;
}

.stat-card {
  text-align: center;
}

.stat-content {
  padding: 20px;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.users-card,
.records-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.admin-text {
  color: #909399;
  font-size: 12px;
}

.el-table {
  font-size: 12px;
}

.el-tag {
  font-size: 12px;
}
</style>
