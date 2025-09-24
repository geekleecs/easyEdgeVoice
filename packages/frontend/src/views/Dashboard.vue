<template>
  <div class="dashboard-container">
    
    <div class="dashboard-content">
      <el-row :gutter="20">
        <el-col :span="24" :md="12">
          <el-card class="stats-card">
            <template #header>
              <div class="card-header">
                <span>我的统计</span>
              </div>
            </template>
            <div class="stats-content">
              <div class="stat-item">
                <div class="stat-value">{{ userStats.totalRecords || 0 }}</div>
                <div class="stat-label">总记录数</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ userStats.successCount || 0 }}</div>
                <div class="stat-label">成功</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ userStats.failedCount || 0 }}</div>
                <div class="stat-label">失败</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ userStats.pendingCount || 0 }}</div>
                <div class="stat-label">处理中</div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="24" :md="12">
          <el-card class="quick-actions-card">
            <template #header>
              <div class="card-header">
                <span>快速操作</span>
              </div>
            </template>
            <div class="quick-actions">
              <el-button type="primary" @click="goToGenerate">
                <el-icon><Microphone /></el-icon>
                生成语音
              </el-button>
              <el-button @click="goToProfile">
                <el-icon><User /></el-icon>
                个人资料
              </el-button>
              <el-button v-if="authStore.isAdmin" @click="goToAdmin">
                <el-icon><Setting /></el-icon>
                管理后台
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
      
      <el-row :gutter="20" style="margin-top: 20px;">
        <el-col :span="24">
          <el-card class="recent-tasks-card">
            <template #header>
              <div class="card-header">
                <span>生成记录</span>
                <el-button type="text" @click="refreshTasks">刷新</el-button>
              </div>
            </template>
            
            <!-- 搜索区域 -->
            <div class="search-section" style="margin-bottom: 20px;">
              <el-form :model="searchForm" inline class="search-form">
                <el-form-item label="内容搜索">
                  <el-input
                    v-model="searchForm.text"
                    placeholder="搜索内容..."
                    clearable
                    style="width: 200px;"
                    @keyup.enter="handleSearch"
                  />
                </el-form-item>
                <el-form-item label="开始时间">
                  <el-date-picker
                    v-model="searchForm.start_date"
                    type="datetime"
                    placeholder="选择开始时间"
                    format="YYYY-MM-DD HH:mm:ss"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    style="width: 200px;"
                  />
                </el-form-item>
                <el-form-item label="结束时间">
                  <el-date-picker
                    v-model="searchForm.end_date"
                    type="datetime"
                    placeholder="选择结束时间"
                    format="YYYY-MM-DD HH:mm:ss"
                    value-format="YYYY-MM-DD HH:mm:ss"
                    style="width: 200px;"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button type="primary" @click="handleSearch" :loading="loading">
                    搜索
                  </el-button>
                  <el-button @click="handleReset">
                    重置
                  </el-button>
                </el-form-item>
              </el-form>
            </div>
            
            <el-table :data="recentTasks" v-loading="loading">
              <el-table-column prop="text" label="内容" width="410" show-overflow-tooltip>
                <template #default="{ row }">
                  <span>{{ row.text || '无内容' }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="voice" label="音色" width="140" show-overflow-tooltip>
                <template #default="{ row }">
                  <span>{{ getVoiceDisplayName(row.voice) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="70">
                <template #default="{ row }">
                  <el-tag :type="getStatusType(row.status)">
                    {{ getStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="text_len" label="长度" width="58" />
              <el-table-column prop="created_at" label="创建时间" width="180">
                <template #default="{ row }">
                  <span>{{ formatDateTime(row.created_at) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="320">
                <template #default="{ row }">
                  <div class="actions">
                    <!-- 播放按钮 -->
                    <el-button
                      v-if="row.status === 'success' && row.file_name"
                      type="success"
                      size="small"
                      round
                      @click="playAudio(row)"
                      :icon="row.isPlaying ? VideoPause : VideoPlay"
                      class="play-button compact-button"
                    >
                      <transition name="text-fade" mode="out-in">
                        <span :key="row.isPlaying ? 'playing' : 'play'">
                          {{ row.isPlaying ? '暂停' : '播放' }}
                        </span>
                      </transition>
                    </el-button>
                    
                    <!-- 下载音频按钮 -->
                    <el-button
                      v-if="row.status === 'success' && row.file_name"
                      type="primary"
                      size="small"
                      round
                      @click="downloadAudio(row)"
                      :disabled="row.isDownloading"
                      :loading="row.isDownloading"
                      :icon="Service"
                      class="compact-button"
                    >
                      {{ row.isDownloading ? '下载中' : '下载' }}
                    </el-button>
                    
                    <!-- 下载字幕按钮 -->
                    <el-button
                      v-if="row.status === 'success' && row.srt_file"
                      type="primary"
                      size="small"
                      round
                      @click="downloadSrt(row)"
                      :disabled="row.isSrtLoading"
                      :loading="row.isSrtLoading"
                      :icon="ChatLineSquare"
                      class="compact-button"
                    >
                      {{ row.isSrtLoading ? '下载中' : '字幕' }}
                    </el-button>
                    
                    <!-- 删除按钮 -->
                    <el-button
                      type="danger"
                      size="small"
                      round
                      @click="deleteRecord(row)"
                      :disabled="row.isDownloading"
                      :icon="Delete"
                      class="compact-button"
                    >
                      删除
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
            
            <!-- 分页组件 -->
            <div class="pagination-section" style="margin-top: 20px; text-align: center;">
              <el-pagination
                v-model:current-page="currentPage"
                v-model:page-size="pageSize"
                :page-sizes="[10, 15, 20, 50]"
                :total="totalRecords"
                layout="total, sizes, prev, pager, next, jumper"
                @current-change="handlePageChange"
                @size-change="handleSizeChange"
              />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<style scoped>
        .actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: nowrap;
        }

        /* 紧凑按钮样式 */
        .compact-button {
          padding: 4px 8px !important;
          font-size: 12px !important;
          min-width: auto !important;
        }

/* 按钮样式优化 - 完全复制generate页面样式 */
.play-button {
  transition: all 0.3s ease;
  padding: 6px 16px; /* 稍微增加内边距 */
}

.play-button:hover {
  transform: scale(1.05); /* 悬浮时轻微放大 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); /* 添加阴影 */
}

.play-button:deep(.el-icon) {
  transition: transform 0.2s ease; /* 图标动画 */
}

.play-button:hover:deep(.el-icon) {
  transform: scale(1.1); /* 图标悬浮放大 */
}

/* 文字切换动画 */
.text-fade-enter-active,
.text-fade-leave-active {
  transition: all 0.2s ease;
}

.text-fade-enter-from,
.text-fade-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

.recent-tasks-card {
  margin-top: 20px;
}

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        /* 搜索区域样式 */
        .search-section {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }

        .search-form {
          margin: 0;
        }

        .search-form .el-form-item {
          margin-bottom: 0;
          margin-right: 16px;
        }

        .search-form .el-form-item:last-child {
          margin-right: 0;
        }

        /* 分页样式 */
        .pagination-section {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }
</style>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Microphone, 
  User, 
  Setting, 
  VideoPause, 
  VideoPlay, 
  Service, 
  ChatLineSquare, 
  Delete
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { dashboardApi, type TTSRecord } from '@/api/dashboard'
import { mapZHVoiceName } from '@/utils'

const router = useRouter()
const authStore = useAuthStore()

// 状态
const loading = ref(false)
const userStats = reactive({
  totalRecords: 0,
  successCount: 0,
  failedCount: 0,
  pendingCount: 0,
  totalFileSize: 0,
  totalDurationMs: 0,
  avgLatencyMs: 0
})
const recentTasks = ref<TTSRecord[]>([])

// 搜索和分页状态
const searchForm = reactive({
  text: '',
  start_date: '',
  end_date: ''
})
const currentPage = ref(1)
const pageSize = ref(15)
const totalRecords = ref(0)

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
    default: return '未知'
  }
}

// 获取音色显示名称
const getVoiceDisplayName = (voice: string) => {
  return mapZHVoiceName(voice) || voice
}

// 格式化时间
const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 跳转到生成页面
const goToGenerate = () => {
  router.push('/generate')
}

// 跳转到个人资料
const goToProfile = () => {
  router.push('/profile')
}

// 跳转到管理后台
const goToAdmin = () => {
  router.push('/admin')
}

// 播放音频
const playAudio = async (row: TTSRecord) => {
  if (row.file_name) {
    try {
      // 如果已经在播放，则暂停
      if (row.isPlaying) {
        if (row.audioInstance) {
          row.audioInstance.pause()
          row.isPlaying = false
        }
        return
      }

      const token = localStorage.getItem('authToken')
      // 使用完整的API URL，确保在开发环境中正确代理
      const audioUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://0.0.0.0:3000'}/api/v1/tts/download/${row.file_name}`
      
      if (token) {
        // 使用fetch获取带认证的音频流
        const response = await fetch(audioUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const blob = await response.blob()
        const audioUrlWithAuth = URL.createObjectURL(blob)
        const audio = new Audio(audioUrlWithAuth)
        
        // 保存音频实例到row对象
        row.audioInstance = audio
        
        audio.onended = () => {
          row.isPlaying = false
          URL.revokeObjectURL(audioUrlWithAuth)
        }
        
        audio.onpause = () => {
          row.isPlaying = false
        }
        
        await audio.play()
        row.isPlaying = true
      } else {
        // 如果没有token，直接播放（会触发401重定向）
        const audio = new Audio(audioUrl)
        row.audioInstance = audio
        
        audio.onended = () => {
          row.isPlaying = false
        }
        
        audio.onpause = () => {
          row.isPlaying = false
        }
        
        await audio.play()
        row.isPlaying = true
      }
    } catch (error) {
      console.error('播放音频失败:', error)
      ElMessage.error('播放音频失败')
      row.isPlaying = false
    }
  }
}

// 下载音频
const downloadAudio = async (row: TTSRecord) => {
  if (row.file_name) {
    try {
      row.isDownloading = true
      const { downloadFile } = await import('@/api/tts')
      const response = await downloadFile(row.file_name)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = row.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      ElMessage.success('下载音频成功！')
    } catch (error) {
      console.error('下载音频失败:', error)
      ElMessage.error('下载音频失败')
    } finally {
      setTimeout(() => {
        row.isDownloading = false
      }, 200)
    }
  }
}

// 下载字幕
const downloadSrt = async (row: TTSRecord) => {
  if (row.srt_file) {
    try {
      row.isSrtLoading = true
      const { downloadFile } = await import('@/api/tts')
      const response = await downloadFile(row.srt_file)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = row.srt_file
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      ElMessage.success('下载字幕成功！')
    } catch (error) {
      console.error('下载字幕失败:', error)
      ElMessage.error('下载字幕失败')
    } finally {
      setTimeout(() => {
        row.isSrtLoading = false
      }, 200)
    }
  }
}

// 删除记录
const deleteRecord = async (row: TTSRecord) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除任务 "${row.task_id}" 吗？此操作将同时删除数据库记录和相关文件，且不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    const response = await dashboardApi.deleteRecord(row.id!)
    if (response.data.success) {
      ElMessage.success('删除成功')
      await refreshTasks()
      await loadUserStats()
    } else {
      ElMessage.error(response.data.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除记录失败:', error)
      ElMessage.error('删除记录失败')
    }
  }
}

// 加载用户统计信息
const loadUserStats = async () => {
  try {
    const response = await dashboardApi.getUserStats()
    if (response.data.success) {
      const stats = response.data.data
      Object.assign(userStats, stats.overview)
    }
  } catch (error) {
    console.error('Load user stats error:', error)
    ElMessage.error('加载统计信息失败')
  }
}

// 加载用户记录
const loadUserRecords = async () => {
  try {
    loading.value = true
    const response = await dashboardApi.getUserRecords({
      page: currentPage.value,
      limit: pageSize.value,
      text: searchForm.text || undefined,
      start_date: searchForm.start_date || undefined,
      end_date: searchForm.end_date || undefined
    })
    
    if (response.data.success) {
      // 为每个记录添加状态字段
      recentTasks.value = response.data.data.records.map((record: TTSRecord) => ({
        ...record,
        isPlaying: false,
        isDownloading: false,
        isSrtLoading: false,
        audioInstance: undefined
      }))
      totalRecords.value = response.data.data.pagination.total
    }
  } catch (error) {
    console.error('Load user records error:', error)
    ElMessage.error('加载记录失败')
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = async () => {
  currentPage.value = 1 // 搜索时重置到第一页
  await loadUserRecords()
}

// 重置搜索
const handleReset = async () => {
  searchForm.text = ''
  searchForm.start_date = ''
  searchForm.end_date = ''
  currentPage.value = 1
  await loadUserRecords()
}

// 分页处理
const handlePageChange = async (page: number) => {
  currentPage.value = page
  await loadUserRecords()
}

// 每页条数变化处理
const handleSizeChange = async (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  await loadUserRecords()
}

// 刷新任务列表
const refreshTasks = async () => {
  await Promise.all([
    loadUserStats(),
    loadUserRecords()
  ])
}

// 组件挂载时初始化
onMounted(async () => {
  // 初始化认证状态
  await authStore.initAuth()
  
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  
  // 加载用户数据
  await refreshTasks()
})
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.dashboard-title {
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  color: #606266;
}

.stats-card,
.quick-actions-card,
.recent-tasks-card {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #2c3e50;
}

.stats-content {
  display: flex;
  justify-content: space-around;
  text-align: center;
}

.stat-item {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-actions .el-button {
  justify-content: flex-start;
}

@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }
  
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .stats-content {
    flex-direction: column;
    gap: 20px;
  }
}
</style>
