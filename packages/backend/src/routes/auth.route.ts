import { Router } from 'express'
import {
  login,
  register,
  getProfile,
  updateProfile,
  changePassword,
  getUsers,
  updateUserById,
  deleteUserById,
  toggleUserStatus,
  refreshToken
} from '../controllers/auth.controller'
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware'

const router = Router()

// 公开路由（无需认证）
router.post('/login', login)
router.post('/register', register)

// 需要认证的路由
router.get('/profile', authenticateToken, getProfile)
router.put('/profile', authenticateToken, updateProfile)
router.put('/change-password', authenticateToken, changePassword)
router.post('/refresh-token', authenticateToken, refreshToken)

// 管理员路由
router.get('/users', authenticateToken, requireAdmin, getUsers)
router.put('/users/:id', authenticateToken, requireAdmin, updateUserById)
router.delete('/users/:id', authenticateToken, requireAdmin, deleteUserById)
router.put('/users/:id/toggle-status', authenticateToken, requireAdmin, toggleUserStatus)

export default router

