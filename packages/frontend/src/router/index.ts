import { createWebHistory, createRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

import HomeView from '@/views/Home.vue'
import AboutView from '@/views/About.vue'
import Generate from '@/views/Generate.vue'
import Login from '@/views/Login.vue'
import Register from '@/views/Register.vue'
import Dashboard from '@/views/Dashboard.vue'
import Profile from '@/views/Profile.vue'
import Admin from '@/views/Admin.vue'
import NotFound from '@/views/NotFound.vue'

const routes = [
  { path: '/', component: HomeView },
  { path: '/login', component: Login, meta: { requiresGuest: true } },
  { path: '/register', component: Register, meta: { requiresGuest: true } },
  { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/generate', component: Generate, meta: { requiresAuth: true } },
  { path: '/profile', component: Profile, meta: { requiresAuth: true } },
  { path: '/admin', component: Admin, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/about', component: AboutView },
  { path: "/:pathMatch(.*)*", name: "NotFound", component: NotFound },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
})

// 路由守卫
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  
  console.log('路由守卫检查:', {
    to: to.path,
    isAuthenticated: authStore.isAuthenticated,
    hasToken: !!authStore.token,
    loading: authStore.loading,
    requiresAuth: to.meta.requiresAuth,
    requiresGuest: to.meta.requiresGuest
  })
  
  // 如果有token但未认证，尝试初始化认证状态
  if (authStore.token && !authStore.isAuthenticated) {
    console.log('尝试初始化认证状态...')
    const isValid = await authStore.initAuth()
    console.log('认证状态初始化结果:', isValid, 'loading状态:', authStore.loading)
  } else if (!authStore.token) {
    // 没有token时，确保loading为false
    console.log('没有token，确保loading状态为false，当前loading:', authStore.loading)
    authStore.resetLoading()
    console.log('重置后loading状态:', authStore.loading)
  }
  
  // 检查是否需要认证
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    console.log('需要认证但未登录，重定向到登录页，loading状态:', authStore.loading)
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
    return
  }
  
  // 检查是否需要管理员权限
  if (to.meta.requiresAdmin && (!authStore.isAuthenticated || !authStore.isAdmin)) {
    console.log('需要管理员权限但用户不是管理员，重定向到dashboard')
    ElMessage.warning('您没有权限访问此页面')
    next('/dashboard')
    return
  }
  
  // 检查是否需要游客状态（已登录用户不能访问登录/注册页）
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    console.log('已登录用户访问登录页，重定向到dashboard，loading状态:', authStore.loading)
    next('/dashboard')
    return
  }
  
  console.log('路由守卫通过，继续导航，最终loading状态:', authStore.loading)
  next()
})