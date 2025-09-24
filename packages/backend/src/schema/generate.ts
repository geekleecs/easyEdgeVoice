import { config, DIRECT_GEN_LIMIT, LIMIT_TEXT_LENGTH, LIMIT_TEXT_LENGTH_ERROR_MESSAGE } from './../config/index'
import { NextFunction, Response, Request } from 'express'
import { z } from 'zod'
import { logger } from '../utils/logger'
import { openai } from '../utils/openai'

export const edgeSchema = z.object({
  text: z.string().trim().min(5, { message: '文本最少 5 字符！' }),
  voice: z.string().min(1),
  pitch: z.string().optional(),
  volume: z.string().optional(),
  rate: z.string().optional(),
})


const dataItemSchema = z.object({
  text: z.string().min(1, '文本内容不能为空'),
  voice: z.string().min(1, '语音类型不能为空'),
  rate: z.string().default(''),
  pitch: z.string().default(''),
  volume: z.string().default(''),
})

const jsonSchema = z.object({
  data: z.array(dataItemSchema).min(1, '数据数组不能为空'),
})

// 导出类型（可选）
export type DataItem = z.infer<typeof dataItemSchema>
export type JsonSchema = z.infer<typeof jsonSchema>


export type EdgeSchema = z.infer<typeof edgeSchema>

const commonValidate = (req: Request, res: Response, next: NextFunction, schema: z.ZodTypeAny) => {
  try {
    schema.parse(req.body)
    openai.config({
      apiKey: req.body.openaiKey,
      baseURL: req.body.openaiBaseUrl,
      model: req.body.openaiModel,
    })
    if (LIMIT_TEXT_LENGTH) {
      const allTxt = req.body.text
      if (allTxt?.length > LIMIT_TEXT_LENGTH) {
        res.status(400).json({
          code: 400,
          message:
            LIMIT_TEXT_LENGTH_ERROR_MESSAGE || `文本内容不能超出 ${LIMIT_TEXT_LENGTH} 字符哦！`,
          success: false,
        })
        return
      }
    }
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ code: 400, errors: error.errors, success: false })
      return
    }
    res.status(500).json({ code: 500, message: 'Internal server error' })
    return
  }
}

export const validateEdge = (req: Request, res: Response, next: NextFunction) => {
  const body = req.body
  const isGenerate = req.url.includes('/generate')
  logger.info(`validateEdge`, body, req.url)
  if (isGenerate && body.text?.length > DIRECT_GEN_LIMIT) {
    res.status(400).json({
      code: 400,
      errors: [{ message: `文本长度不能超过 ${DIRECT_GEN_LIMIT} 个字符，长文本请用流式接口`, path: ['text'] }],
      success: false,
    })
    return
  }
  commonValidate(req, res, next, edgeSchema)
}
export const validateJson = (req: Request, res: Response, next: NextFunction) => {
  try {
    jsonSchema.parse(req.body)
    if (LIMIT_TEXT_LENGTH) {
      const allTxt = req.body.data.map((item: any) => item.text).join('')
      if (allTxt?.length > LIMIT_TEXT_LENGTH) {
        res.status(400).json({
          code: 400,
          message:
            LIMIT_TEXT_LENGTH_ERROR_MESSAGE || `文本内容不能超出 ${LIMIT_TEXT_LENGTH} 字符哦！`,
          success: false,
        })
        return
      }
    }
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ code: 400, errors: error.errors, success: false })
      return
    }
    res.status(500).json({ code: 500, message: 'Internal server error' })
    return
  }
}
