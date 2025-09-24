import { Request, Response } from 'express'
import { z } from 'zod'
import { logger } from '../utils/logger'
import {
  findUserByUsername,
  findUserByEmail,
  createUser,
  verifyPassword,
  updateLastLogin,
  getAllUsers,
  getUserCount,
  updateUser,
  deleteUser,
  findUserById,
  findUserByIdIncludeInactive
} from '../services/db/user.repo'
import { getPool } from '../services/db/mysql'
import { generateToken } from '../middleware/auth.middleware'

// 验证模式
const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空')
})

const registerSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(50, '用户名最多50个字符'),
  password: z.string().min(6, '密码至少6个字符').max(100, '密码最多100个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  role: z.enum(['user', 'admin']).optional()
})

const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).max(100).optional(),
  role: z.enum(['user', 'admin']).optional(),
  is_active: z.boolean().optional()
})

/**
 * 用户登录
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = loginSchema.parse(req.body)
    
    // 检查 MySQL 是否启用
    if (!process.env.ENABLE_MYSQL || process.env.ENABLE_MYSQL !== 'true') {
      return res.status(503).json({
        code: 503,
        message: '数据库未启用，请先配置并启动MySQL数据库',
        success: false
      })
    }
    
    // 查找用户（支持用户名或邮箱登录）
    let user = await findUserByUsername(username)
    if (!user) {
      user = await findUserByEmail(username)
    }
    
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在，请检查用户名或邮箱',
        success: false
      })
    }
    
    // 检查用户是否被停用
    if (!user.is_active) {
      return res.status(403).json({
        code: 403,
        message: '账户已被停用，请联系管理员',
        success: false
      })
    }
    
    // 验证密码
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({
        code: 401,
        message: '密码错误，请重新输入',
        success: false
      })
    }
    
    // 更新最后登录时间
    await updateLastLogin(user.id)
    
    // 生成JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    })
    
    logger.info(`User ${user.username} logged in successfully`)
    
    res.json({
      code: 200,
      message: '登录成功',
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        code: 400,
        message: '输入验证失败',
        errors: error.errors,
        success: false
      })
    }
    
    // 详细的错误处理
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        return res.status(503).json({
          code: 503,
          message: '网络连接失败，请检查网络设置',
          success: false
        })
      }
      
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        return res.status(408).json({
          code: 408,
          message: '请求超时，请稍后重试',
          success: false
        })
      }
      
      if (error.message.includes('MySQL connection pool is not available')) {
        return res.status(503).json({
          code: 503,
          message: '数据库连接失败，请稍后重试',
          success: false
        })
      }
      
      if (error.message.includes('Database query failed')) {
        return res.status(500).json({
          code: 500,
          message: '系统繁忙，请稍后重试',
          success: false
        })
      }
    }
    
    logger.error('Login error:', error)
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      success: false
    })
  }
}

/**
 * 用户注册
 */
export const register = async (req: Request, res: Response) => {
  try {
    // 检查 MySQL 是否启用
    if (!process.env.ENABLE_MYSQL || process.env.ENABLE_MYSQL !== 'true') {
      return res.status(503).json({
        code: 503,
        message: '数据库未启用，请先配置并启动MySQL数据库',
        success: false
      })
    }
    
    const { username, password, email, role } = registerSchema.parse(req.body)
    
    // 检查用户名是否已存在
    const existingUser = await findUserByUsername(username)
    if (existingUser) {
      return res.status(400).json({
        code: 400,
        message: '用户名已存在',
        success: false
      })
    }
    
    // 检查邮箱是否已存在
    const existingEmail = await findUserByEmail(email)
    if (existingEmail) {
      return res.status(400).json({
        code: 400,
        message: '邮箱已被注册',
        success: false
      })
    }
    
    // 创建用户
    const newUser = await createUser({
      username,
      password,
      email,
      role: role || 'user'
    })
    
    logger.info(`New user registered: ${username}`)
    
    res.status(201).json({
      code: 201,
      message: '注册成功',
      success: true,
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        }
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        code: 400,
        message: '输入验证失败',
        errors: error.errors,
        success: false
      })
    }
    
    logger.error('Registration error:', error)
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      success: false
    })
  }
}

/**
 * 刷新token
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const user = req.user!
    
    // 生成新的JWT token
    const newToken = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    })
    
    logger.info(`Token refreshed for user: ${user.username}`)
    
    res.json({
      code: 200,
      message: 'Token refreshed successfully',
      success: true,
      data: {
        token: newToken
      }
    })
  } catch (error) {
    logger.error('Refresh token error:', error)
    res.status(500).json({
      code: 500,
      message: 'Token refresh failed',
      success: false
    })
  }
}

/**
 * 获取用户信息
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user!
    
    res.json({
      code: 200,
      message: '获取用户信息成功',
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    logger.error('Get profile error:', error)
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      success: false
    })
  }
}

/**
 * 更新用户信息
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    // 检查 MySQL 是否启用
    if (!process.env.ENABLE_MYSQL || process.env.ENABLE_MYSQL !== 'true') {
      return res.status(503).json({
        code: 503,
        message: '数据库未启用，请先配置并启动MySQL数据库',
        success: false
      })
    }
    
    const userId = req.user!.id
    const updateData = updateUserSchema.parse(req.body)
    
    const updatedUser = await updateUser(userId, updateData)
    if (!updatedUser) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        success: false
      })
    }
    
    res.json({
      code: 200,
      message: '更新成功',
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role
        }
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        code: 400,
        message: '输入验证失败',
        errors: error.errors,
        success: false
      })
    }
    
    logger.error('Update profile error:', error)
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      success: false
    })
  }
}

/**
 * 获取所有用户（管理员功能）
 */
export const getUsers = async (req: Request, res: Response) => {
  try {
    // 检查 MySQL 是否启用
    if (!process.env.ENABLE_MYSQL || process.env.ENABLE_MYSQL !== 'true') {
      return res.status(503).json({
        code: 503,
        message: '数据库未启用，请先配置并启动MySQL数据库',
        success: false
      })
    }
    
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const offset = (page - 1) * limit
    
    const [users, totalCount] = await Promise.all([
      getAllUsers(limit, offset),
      getUserCount()
    ])
    
    res.json({
      code: 200,
      message: '获取用户列表成功',
      success: true,
      data: {
        users: users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.created_at,
          last_login: user.last_login,
          is_active: user.is_active
        })),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      }
    })
  } catch (error) {
    logger.error('Get users error:', error)
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      success: false
    })
  }
}

/**
 * 更新用户信息（管理员功能）
 */
export const updateUserById = async (req: Request, res: Response) => {
  try {
    // 检查 MySQL 是否启用
    if (!process.env.ENABLE_MYSQL || process.env.ENABLE_MYSQL !== 'true') {
      return res.status(503).json({
        code: 503,
        message: '数据库未启用，请先配置并启动MySQL数据库',
        success: false
      })
    }
    
    const userId = parseInt(req.params.id)
    const updateData = updateUserSchema.parse(req.body)
    
    const updatedUser = await updateUser(userId, updateData)
    if (!updatedUser) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        success: false
      })
    }
    
    res.json({
      code: 200,
      message: '更新用户成功',
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          is_active: updatedUser.is_active
        }
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        code: 400,
        message: '输入验证失败',
        errors: error.errors,
        success: false
      })
    }
    
    logger.error('Update user error:', error)
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      success: false
    })
  }
}

/**
 * 删除用户（管理员功能）
 */
export const deleteUserById = async (req: Request, res: Response) => {
  try {
    // 检查 MySQL 是否启用
    if (!process.env.ENABLE_MYSQL || process.env.ENABLE_MYSQL !== 'true') {
      return res.status(503).json({
        code: 503,
        message: '数据库未启用，请先配置并启动MySQL数据库',
        success: false
      })
    }
    
    const userId = parseInt(req.params.id)
    
    // 不能删除自己
    if (userId === req.user!.id) {
      return res.status(400).json({
        code: 400,
        message: '不能删除自己的账户',
        success: false
      })
    }
    
    const success = await deleteUser(userId)
    if (!success) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        success: false
      })
    }
    
    res.json({
      code: 200,
      message: '删除用户成功',
      success: true
    })
  } catch (error) {
    logger.error('Delete user error:', error)
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      success: false
    })
  }
}

/**
 * 切换用户状态（管理员功能）
 */
export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    // 检查 MySQL 是否启用
    if (!process.env.ENABLE_MYSQL || process.env.ENABLE_MYSQL !== 'true') {
      return res.status(503).json({
        code: 503,
        message: '数据库未启用，请先配置并启动MySQL数据库',
        success: false
      })
    }
    
    const userId = parseInt(req.params.id)
    
    // 不能操作自己
    if (userId === req.user!.id) {
      return res.status(400).json({
        code: 400,
        message: '不能操作自己的账户',
        success: false
      })
    }
    
    // 获取目标用户信息（包括停用的用户）
    const targetUser = await findUserByIdIncludeInactive(userId)
    if (!targetUser) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        success: false
      })
    }
    
    // 不能操作其他管理员
    if (targetUser.role === 'admin') {
      return res.status(400).json({
        code: 400,
        message: '不能操作管理员账户',
        success: false
      })
    }
    
    // 切换用户状态
    const newStatus = !targetUser.is_active
    const updatedUser = await updateUser(userId, { is_active: newStatus })
    
    if (!updatedUser) {
      return res.status(500).json({
        code: 500,
        message: '状态更新失败',
        success: false
      })
    }
    
    const action = newStatus ? '启用' : '停用'
    logger.info(`User ${targetUser.username} status changed to ${action} by admin ${req.user!.username}`)
    
    res.json({
      code: 200,
      message: `用户${action}成功`,
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          is_active: updatedUser.is_active
        }
      }
    })
  } catch (error) {
    logger.error('Toggle user status error:', error)
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      success: false
    })
  }
}

// 修改密码
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user!.id
    
    // 验证当前密码
    const user = await findUserById(userId)
    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
        success: false
      })
    }
    
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password_hash)
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        code: 400,
        message: '当前密码不正确',
        success: false
      })
    }
    
    // 更新密码 - 直接更新数据库，避免双重加密
    const pool = await getPool()
    if (!pool) {
      return res.status(503).json({
        code: 503,
        message: '数据库连接失败',
        success: false
      })
    }
    
    const bcrypt = require('bcryptjs')
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)
    
    const [result] = await pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedNewPassword, userId]
    )
    
    const updateResult = result as any
    if (updateResult.affectedRows === 0) {
      return res.status(500).json({
        code: 500,
        message: '密码更新失败',
        success: false
      })
    }
    
    res.json({
      code: 200,
      message: '密码修改成功',
      success: true
    })
  } catch (error) {
    logger.error('Change password error:', error)
    res.status(500).json({
      code: 500,
      message: '密码修改失败',
      success: false
    })
  }
}
