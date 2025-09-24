import { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { getPool, deleteRecord } from '../services/db/mysql'
import { authenticateToken } from '../middleware/auth.middleware'

/**
 * 获取用户的 TTS 记录
 */
export const getUserRecords = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    const { 
      page = 1, 
      limit = 15, 
      status, 
      engine, 
      voice, 
      text, 
      start_date, 
      end_date 
    } = req.query
    
    if (!userId) {
      return res.status(401).json({
        code: 401,
        message: '用户未认证',
        success: false
      })
    }

    const pool = await getPool()
    if (!pool) {
      return res.status(500).json({
        code: 500,
        message: '数据库连接不可用',
        success: false
      })
    }
    
    const offset = (Number(page) - 1) * Number(limit)
    
    // 记录搜索参数
    logger.info(`User ${userId} search params:`, {
      page, limit, status, engine, voice, text, start_date, end_date
    })
    
    // 构建查询条件
    let whereConditions = ['user_id = ?']
    let queryParams: any[] = [userId]
    
    if (status) {
      whereConditions.push('status = ?')
      queryParams.push(status)
    }
    
    if (engine) {
      whereConditions.push('engine = ?')
      queryParams.push(engine)
    }
    
    if (voice) {
      whereConditions.push('voice = ?')
      queryParams.push(voice)
    }
    
    // 添加内容搜索条件
    if (text) {
      whereConditions.push('text LIKE ?')
      queryParams.push(`%${text}%`)
    }
    
    // 添加时间范围过滤条件
    if (start_date) {
      whereConditions.push('created_at >= ?')
      queryParams.push(start_date)
    }
    
    if (end_date) {
      whereConditions.push('created_at <= ?')
      queryParams.push(end_date)
    }
    
    const whereClause = whereConditions.join(' AND ')
    
    // 查询记录
    const [records] = await pool.execute(
      `SELECT id, task_id, engine, voice, rate, pitch, volume, use_llm, 
              text, text_len, language, status, error_message, file_name, srt_file, 
              file_size, duration_ms, latency_ms, requester_ip, user_id, username,
              created_at, updated_at
       FROM tts_records 
       WHERE ${whereClause}
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...queryParams, Number(limit), offset]
    )
    
    // 查询总数
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM tts_records WHERE ${whereClause}`,
      queryParams
    )
    
    const total = (countResult as any[])[0]?.total || 0
    
    logger.info(`User ${userId} fetched ${(records as any[]).length} records`)
    
    res.json({
      code: 200,
      message: '获取记录成功',
      success: true,
      data: {
        records: records,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    })
  } catch (error) {
    logger.error('Get user records error:', error)
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      success: false
    })
  }
}

/**
 * 获取用户的统计信息
 */
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    
    if (!userId) {
      return res.status(401).json({
        code: 401,
        message: '用户未认证',
        success: false
      })
    }

    const pool = await getPool()
    if (!pool) {
      return res.status(500).json({
        code: 500,
        message: '数据库连接不可用',
        success: false
      })
    }
    
    // 获取基本统计
    const [statsResult] = await pool.execute(
      `SELECT 
        COUNT(*) as total_records,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN file_size IS NOT NULL THEN file_size ELSE 0 END) as total_file_size,
        SUM(CASE WHEN duration_ms IS NOT NULL THEN duration_ms ELSE 0 END) as total_duration_ms,
        AVG(CASE WHEN latency_ms IS NOT NULL THEN latency_ms ELSE NULL END) as avg_latency_ms
       FROM tts_records 
       WHERE user_id = ?`,
      [userId]
    )
    
    // 获取引擎使用统计
    const [engineStats] = await pool.execute(
      `SELECT engine, COUNT(*) as count 
       FROM tts_records 
       WHERE user_id = ? 
       GROUP BY engine 
       ORDER BY count DESC`,
      [userId]
    )
    
    // 获取语音使用统计
    const [voiceStats] = await pool.execute(
      `SELECT voice, COUNT(*) as count 
       FROM tts_records 
       WHERE user_id = ? 
       GROUP BY voice 
       ORDER BY count DESC 
       LIMIT 10`,
      [userId]
    )
    
    // 获取最近7天的记录数
    const [recentStats] = await pool.execute(
      `SELECT DATE(created_at) as date, COUNT(*) as count 
       FROM tts_records 
       WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at) 
       ORDER BY date DESC`,
      [userId]
    )
    
    const stats = (statsResult as any[])[0] || {}
    
    logger.info(`User ${userId} stats: ${JSON.stringify(stats)}`)
    
    res.json({
      code: 200,
      message: '获取统计信息成功',
      success: true,
      data: {
        overview: {
          totalRecords: stats.total_records || 0,
          successCount: stats.success_count || 0,
          failedCount: stats.failed_count || 0,
          pendingCount: stats.pending_count || 0,
          totalFileSize: stats.total_file_size || 0,
          totalDurationMs: stats.total_duration_ms || 0,
          avgLatencyMs: Math.round(stats.avg_latency_ms || 0)
        },
        engineStats: engineStats,
        voiceStats: voiceStats,
        recentStats: recentStats
      }
    })
  } catch (error) {
    logger.error('Get user stats error:', error)
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      success: false
    })
  }
}

/**
 * 管理员获取所有用户的记录
 */
export const getAllRecords = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, engine, voice, userId, username } = req.query
    
    const pool = await getPool()
    if (!pool) {
      return res.status(500).json({
        code: 500,
        message: '数据库连接不可用',
        success: false
      })
    }
    
    const offset = (Number(page) - 1) * Number(limit)
    
    // 构建查询条件
    let whereConditions: string[] = []
    let queryParams: any[] = []
    
    if (status) {
      whereConditions.push('status = ?')
      queryParams.push(status)
    }
    
    if (engine) {
      whereConditions.push('engine = ?')
      queryParams.push(engine)
    }
    
    if (voice) {
      whereConditions.push('voice = ?')
      queryParams.push(voice)
    }
    
    if (userId) {
      whereConditions.push('user_id = ?')
      queryParams.push(userId)
    }
    
    if (username) {
      whereConditions.push('username LIKE ?')
      queryParams.push(`%${username}%`)
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''
    
    // 查询记录
    const [records] = await pool.execute(
      `SELECT id, task_id, engine, voice, rate, pitch, volume, use_llm, 
              text, text_len, language, status, error_message, file_name, srt_file, 
              file_size, duration_ms, latency_ms, requester_ip, user_id, username,
              created_at, updated_at
       FROM tts_records 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...queryParams, Number(limit), offset]
    )
    
    // 查询总数
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM tts_records ${whereClause}`,
      queryParams
    )
    
    const total = (countResult as any[])[0]?.total || 0
    
    logger.info(`Admin fetched ${(records as any[]).length} records`)
    
    res.json({
      code: 200,
      message: '获取记录成功',
      success: true,
      data: {
        records: records,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    })
  } catch (error) {
    logger.error('Get all records error:', error)
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      success: false
    })
  }
}

/**
 * 删除 TTS 记录
 */
export const deleteRecordController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    const { id } = req.params
    
    if (!userId) {
      return res.status(401).json({
        code: 401,
        message: '用户未认证',
        success: false
      })
    }

    if (!id) {
      return res.status(400).json({
        code: 400,
        message: '缺少记录ID',
        success: false
      })
    }

    // 检查记录是否属于当前用户（非管理员）
    if (req.user?.role !== 'admin') {
      const pool = await getPool()
      if (!pool) {
        return res.status(500).json({
          code: 500,
          message: '数据库连接不可用',
          success: false
        })
      }
      
      const [records] = await pool.execute(
        'SELECT user_id FROM tts_records WHERE id = ?',
        [id]
      )
      
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(404).json({
          code: 404,
          message: '记录不存在',
          success: false
        })
      }
      
      const record = records[0] as { user_id: number }
      if (record.user_id !== userId) {
        return res.status(403).json({
          code: 403,
          message: '无权限删除此记录',
          success: false
        })
      }
    }

    const deleted = await deleteRecord({ id: parseInt(id) }, userId)
    
    if (deleted) {
      logger.info(`User ${userId} deleted record ${id}`)
      res.json({
        code: 200,
        message: '删除成功',
        success: true
      })
    } else {
      res.status(404).json({
        code: 404,
        message: '记录不存在或删除失败',
        success: false
      })
    }
  } catch (error) {
    logger.error('Delete record error:', error)
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      success: false
    })
  }
}


