<template>
  <div class="home-container">
    <!-- 导航栏 -->
    <nav v-if="showNavbar" class="navbar">
      <div class="navbar-brand">
        <router-link to="/" class="brand-link">EasyEdgeVoice</router-link>
      </div>
      <div class="navbar-menu">
        <router-link to="/" class="nav-link">Index/首页</router-link>
        <!-- <router-link to="/about" class="nav-link">关于</router-link> -->
        <template v-if="authStore.isAuthenticated">
          <router-link to="/generate" class="nav-link">Generate/生成语音</router-link>
          <router-link to="/dashboard" class="nav-link">Dashboard/记录管理</router-link>
          <el-dropdown @command="handleUserCommand">
            <span class="user-dropdown">
              {{ authStore.user?.username }}
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人资料</el-dropdown-item>
                <el-dropdown-item v-if="authStore.isAdmin" command="admin">管理后台</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </template>
        <template v-else>
          <router-link to="/login" class="nav-link">Login/登录</router-link>
          <router-link to="/register" class="nav-link">Register/注册</router-link>
        </template>
      </div>
    </nav>
    
    <transition name="el-fade-in-linear">
      <router-view />
    </transition>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { defineComponent } from 'vue'
import Footer from '@/components/Footer.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// 是否显示导航栏（登录/注册页面不显示）
const showNavbar = computed(() => {
  const route = router.currentRoute.value
  return !['/login', '/register'].includes(route.path)
})

// 处理用户下拉菜单命令
const handleUserCommand = (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/profile')
      break
    case 'admin':
      router.push('/admin')
      break
    case 'logout':
      authStore.logout()
      ElMessage.success('已退出登录')
      router.push('/')
      break
  }
}

defineComponent({ name: 'App' })
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #333;
}

.navbar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.navbar-brand {
  font-size: 24px;
  font-weight: 700;
}

.brand-link {
  color: #2c3e50;
  text-decoration: none;
  transition: color 0.3s;
}

.brand-link:hover {
  color: #667eea;
}

.navbar-menu {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-link {
  color: #606266;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s;
  padding: 8px 12px;
  border-radius: 6px;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #606266;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.3s;
}

.user-dropdown:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

@media (max-width: 768px) {
  .navbar {
    padding: 0 16px;
    flex-wrap: wrap;
    height: auto;
    min-height: 60px;
  }
  
  .navbar-menu {
    gap: 16px;
    flex-wrap: wrap;
  }
  
  .nav-link {
    padding: 6px 8px;
    font-size: 14px;
  }
}
</style>
