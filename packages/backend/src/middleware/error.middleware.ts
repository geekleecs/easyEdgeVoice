import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
import { ErrorMessages } from '../services/tts.service'

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  const errorDetails = {
    name: err.name,
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params,
      ip: req.ip,
    },
  }

  logger.error('Error occurred:', {
    ...errorDetails,
    request: {
      ...errorDetails.request,
      body: {
        ...errorDetails.request.body,
        password: undefined,
        authorization: undefined,
      },
    },
  })
  const { code, message } = getErrorResponse(err.message)
  res.status(code).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  })
}

function getErrorResponse(errorMessage: string): { code: number; message: string } {
  // 网络连接相关错误
  if (errorMessage.includes('Network connection failed') || 
      errorMessage.includes('ECONNREFUSED') || 
      errorMessage.includes('ENOTFOUND')) {
    return { code: 503, message: '网络连接失败，请检查网络设置' }
  }
  
  // 超时错误
  if (errorMessage.includes('Database query timeout') || 
      errorMessage.includes('ETIMEDOUT') || 
      errorMessage.includes('timeout')) {
    return { code: 408, message: '请求超时，请稍后重试' }
  }
  
  // 数据库访问权限错误
  if (errorMessage.includes('Database access denied') || 
      errorMessage.includes('ER_ACCESS_DENIED_ERROR')) {
    return { code: 503, message: '数据库连接失败，请稍后重试' }
  }
  
  // 数据库连接池不可用
  if (errorMessage.includes('MySQL connection pool is not available')) {
    return { code: 503, message: '数据库连接失败，请稍后重试' }
  }
  
  // 数据库查询失败
  if (errorMessage.includes('Database query failed')) {
    return { code: 500, message: '系统繁忙，请稍后重试' }
  }
  
  // TTS 相关错误
  if (errorMessage.includes(ErrorMessages.ENG_MODEL_INVALID_TEXT)) {
    return { code: 400, message: '文本内容无效' }
  }
  
  // 默认服务器错误
  return { code: 500, message: '服务器内部错误' }
}
