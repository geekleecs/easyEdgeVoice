import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.middleware'
import { getUserRecords, getUserStats, getAllRecords, deleteRecordController } from '../controllers/dashboard.controller'

const router = Router()

// 所有路由都需要认证
router.use(authenticateToken)

// 获取用户的 TTS 记录
router.get('/records', getUserRecords)

// 获取用户的统计信息
router.get('/stats', getUserStats)

// 管理员获取所有记录
router.get('/admin/records', getAllRecords)

// 删除记录
router.delete('/records/:id', deleteRecordController)

export default router


