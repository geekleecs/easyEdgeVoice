import { Request, Response, NextFunction } from 'express'
import { generateTTS } from '../services/tts.service'
import { logger } from '../utils/logger'
import path from 'path'
import fs from 'fs/promises'
import { ALLOWED_EXTENSIONS, AUDIO_DIR } from '../config'
import { EdgeSchema } from '../schema/generate'
import taskManager from '../utils/taskManager'
import crypto from 'crypto'
import {
  ENABLE_MYSQL,
  STORE_ERR_DETAIL,
  STORE_TTS_TEXT,
} from '../config'
import {
  insertImmediate as dbInsertImmediate,
  insertInitial as dbInsertInitial,
  markFailed as dbMarkFailed,
  markSuccess as dbMarkSuccess,
} from '../services/db/mysql'
import { authenticateToken } from '../middleware/auth.middleware'
function formatBody({ text, pitch, voice, volume, rate }: EdgeSchema) {
  const positivePercent = (value: string | undefined) => {
    if (value === '0%' || value === '0' || value === undefined) return '+0%'
    return value
  }
  const positiveHz = (value: string | undefined) => {
    if (value === '0Hz' || value === '0' || value === undefined) return '+0Hz'
    return value
  }
  return {
    text: text.trim(),
    pitch: positiveHz(pitch),
    voice: positivePercent(voice),
    rate: positivePercent(rate),
    volume: positivePercent(volume),
  }
}
export async function createTask(req: Request, res: Response, next: NextFunction) {
  try {
    logger.debug('Generating audio with body:', req.body)
    const formattedBody = formatBody(req.body)
    const task = taskManager.createTask(formattedBody)
    logger.info(`Generated task ID: ${task.id}`)

    // DB: insert pending
    try {
      if (ENABLE_MYSQL) {
        const text = String(formattedBody.text || '')
        const text_hash = crypto.createHash('sha256').update(text).digest('hex')
        await dbInsertInitial({
          task_id: task.id,
          engine: 'edge-tts',
          voice: formattedBody.voice,
          rate: formattedBody.rate,
          pitch: formattedBody.pitch,
          volume: formattedBody.volume,
          use_llm: 0,
          text: STORE_TTS_TEXT ? text : null,
          text_hash,
          text_len: text.length,
          status: 'pending',
          requester_ip: req.headers['x-forwarded-for']?.toString() || req.ip,
          user_id: req.user?.id || null,
          username: req.user?.username || null,
        })
      }
    } catch (e) {
      logger.warn(`DB insertInitial failed: ${(e as Error).message}`)
    }

    generateTTS(formattedBody, task)
      .then((result) => {
        const data = {
          ...result,
          file: path.parse(result.audio).base,
          srt: path.parse(result.srt).base,
        }
        taskManager.updateTask(task.id, { result: data })
        logger.info(`Updated task ID: ${task.id} with result`, result)

        // DB: mark success
        ;(async () => {
          try {
            if (ENABLE_MYSQL) {
              await dbMarkSuccess(
                { task_id: task.id },
                {
                  status: 'success',
                  file_name: data.file,
                  srt_file: data.srt,
                }
              )
            }
          } catch (e) {
            logger.warn(`DB markSuccess failed: ${(e as Error).message}`)
          }
        })()
      })
      .catch((err) => {
        const data = {
          message: (err as Error).message,
        }
        taskManager.failTask(task.id, data)

        // DB: mark failed
        ;(async () => {
          try {
            if (ENABLE_MYSQL) {
              await dbMarkFailed({ task_id: task.id }, STORE_ERR_DETAIL ? data.message : 'failed')
            }
          } catch (e) {
            logger.warn(`DB markFailed failed: ${(e as Error).message}`)
          }
        })()
      })
    const data = {
      success: true,
      data: { ...task },
      code: 200,
    }
    res.json(data)
  } catch (error) {
    next(error)
  }
}
export async function getTask(req: Request, res: Response, next: NextFunction) {
  const taskId = req.params.id
  try {
    const task = taskManager.getTask(taskId)
    if (!task) {
      res.status(404).json({ success: false, message: 'Task not found', code: 404 })
      return
    }
    const data = {
      success: true,
      data: { ...task },
      code: 200,
    }
    res.json(data)
  } catch (error) {
    next(error)
  }
}
export async function getTaskStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = taskManager.getTaskStats()
    logger.debug('stats:', stats)
    if (!stats) {
      res.status(404).json({ success: false, message: 'stats not found', code: 404 })
      return
    }
    const data = {
      success: true,
      data: { ...stats },
      code: 200,
    }
    res.json(data)
  } catch (error) {
    next(error)
  }
}
export async function generateAudio(req: Request, res: Response, next: NextFunction) {
  try {
    logger.debug('Generating audio with body:', req.body)
    const formattedBody = formatBody(req.body)
    const task = taskManager.createTask(formattedBody)
    logger.info(`Generated task ID: ${task.id}`)
    
    const start = Date.now()
    let result = await generateTTS(formattedBody, task)
    const responseResult = {
      success: true,
      data: {
        ...result,
        file: path.parse(result.audio).base,
        srt: path.parse(result.srt).base,
      },
      code: 200,
    }
    
    // DB: insert initial pending
    try {
      if (ENABLE_MYSQL) {
        const text = String(formattedBody.text || '')
        const text_hash = crypto.createHash('sha256').update(text).digest('hex')
        await dbInsertInitial({
          task_id: task.id,
          engine: 'edge-tts',
          voice: formattedBody.voice,
          rate: formattedBody.rate,
          pitch: formattedBody.pitch,
          volume: formattedBody.volume,
          use_llm: 0,
          text: STORE_TTS_TEXT ? text : null,
          text_hash,
          text_len: text.length,
          status: 'pending',
          requester_ip: req.headers['x-forwarded-for']?.toString() || req.ip,
          user_id: req.user?.id || null,
          username: req.user?.username || null,
        })
      }
    } catch (e) {
      logger.warn(`DB insertInitial failed: ${(e as Error).message}`)
    }
    
    // DB: mark success
    try {
      if (ENABLE_MYSQL) {
        await dbMarkSuccess(
          { task_id: task.id },
          {
            status: 'success',
            file_name: path.parse(result.audio).base,
            srt_file: path.parse(result.srt).base,
            latency_ms: Date.now() - start,
          }
        )
      }
    } catch (e) {
      logger.warn(`DB markSuccess failed: ${(e as Error).message}`)
    }
    
    res.json(responseResult)
  } catch (error) {
    // DB: mark failed
    try {
      if (ENABLE_MYSQL) {
        const formattedBody = formatBody(req.body)
        const task = taskManager.createTask(formattedBody)
        const text = String(formattedBody.text || '')
        const text_hash = crypto.createHash('sha256').update(text).digest('hex')
        
        // Insert initial pending record
        await dbInsertInitial({
          task_id: task.id,
          engine: 'edge-tts',
          voice: formattedBody.voice,
          rate: formattedBody.rate,
          pitch: formattedBody.pitch,
          volume: formattedBody.volume,
          use_llm: 0,
          text: STORE_TTS_TEXT ? text : null,
          text_hash,
          text_len: text.length,
          status: 'pending',
          requester_ip: req.headers['x-forwarded-for']?.toString() || req.ip,
          user_id: req.user?.id || null,
          username: req.user?.username || null,
        })
        
        // Mark as failed
        await dbMarkFailed(
          { task_id: task.id },
          STORE_ERR_DETAIL ? (error as Error).message : 'failed'
        )
      }
    } catch (e) {
      logger.warn(`DB markFailed failed: ${(e as Error).message}`)
    }
    next(error)
  }
}

export async function downloadAudio(req: Request, res: Response): Promise<void> {
  const fileName = req.params.file

  try {
    if (!fileName || typeof fileName !== 'string') {
      throw new Error('Invalid file name')
    }

    const fileExt = path.extname(fileName).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(fileExt)) {
      throw new Error('Invalid file type')
    }

    const safeFileName = path.basename(fileName)
    const encodedFileName = encodeURIComponent(safeFileName)
    const filePath = path.join(AUDIO_DIR, safeFileName)

    await fs.access(filePath, fs.constants.R_OK)

    res.setHeader('Content-Type', `audio/${fileExt.slice(1)}`)
    res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"`)

    res.download(filePath, safeFileName, (err) => {
      if (err) {
        throw err
      }
      logger.info(`Successfully downloaded file: ${safeFileName}`)
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(`Download failed for ${fileName}: ${errorMessage}`)

    const statusCode = errorMessage.includes('Invalid')
      ? 400
      : errorMessage.includes('ENOENT')
      ? 404
      : 500

    res.status(statusCode).json({
      error: 'Failed to download file',
      message: errorMessage,
    })
  }
}

export async function getVoiceList(req: Request, res: Response, next: NextFunction) {
  try {
    logger.debug('Fetching voice list...')
    const voices = require('../llm/prompt/voice.json')
    res.json({
      code: 200,
      data: voices,
      success: true,
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error(`getVoiceList Error: ${errorMessage}`)
    res.status(500).json({
      code: 500,
      message: errorMessage,
      success: false,
    })
  }
}
