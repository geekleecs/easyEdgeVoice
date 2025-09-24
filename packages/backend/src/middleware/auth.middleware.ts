import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { logger } from '../utils/logger'

// 扩展 Request 类型以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        username: string
        email: string
        role: 'user' | 'admin'
      }
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'

// 确保 JWT_SECRET 不为空
if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
  logger.warn('JWT_SECRET 未设置或使用默认值，生产环境请设置安全的密钥')
}

export interface JWTPayload {
  id: number
  username: string
  email: string
  role: 'user' | 'admin'
}

/**
 * JWT 认证中间件
 * 验证请求头中的 Authorization token
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

  logger.info(`Auth middleware - URL: ${req.url}, Auth header: ${authHeader}, Token: ${token ? 'present' : 'missing'}`)

  if (!token) {
    logger.warn(`Authentication failed - No token provided for ${req.url}`)
    return res.status(401).json({
      code: 401,
      message: 'Access token required',
      success: false
    })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    }
    logger.info(`Authentication successful - User: ${decoded.username} (${decoded.role}) for ${req.url}`)
    next()
  } catch (error) {
    // 改进错误处理，区分不同类型的JWT错误
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn(`JWT token expired for ${req.url}: ${error.expiredAt}`)
      return res.status(401).json({
        code: 401,
        message: 'Token expired',
        success: false,
        data: {
          expiredAt: error.expiredAt
        }
      })
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn(`Invalid JWT token for ${req.url}: ${error.message}`)
      return res.status(401).json({
        code: 401,
        message: 'Invalid token',
        success: false
      })
    } else {
      logger.error('JWT verification failed:', error)
      return res.status(403).json({
        code: 403,
        message: 'Token verification failed',
        success: false
      })
    }
  }
}

/**
 * 管理员权限中间件
 * 只有管理员角色才能访问
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      code: 401,
      message: 'Authentication required',
      success: false
    })
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      code: 403,
      message: 'Admin access required',
      success: false
    })
  }

  next()
}

/**
 * 生成 JWT token
 */
export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

/**
 * 验证 JWT token（不抛出异常）
 */
export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}
