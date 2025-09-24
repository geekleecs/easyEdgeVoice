import path from 'path'
import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
import taskManager from '../utils/taskManager'
import { EdgeSchema } from '../schema/generate'
import { generateTTSStream, generateTTSStreamJson } from '../services/tts.stream.service'
import { generateId, streamWithLimit } from '../utils'
import crypto from 'crypto'
import { ENABLE_MYSQL, STORE_TTS_TEXT, STORE_ERR_DETAIL } from '../config'
import { insertInitial as dbInsertInitial, markFailed as dbMarkFailed, markSuccess as dbMarkSuccess } from '../services/db/mysql'
function formatBody({ text, pitch, voice, volume, rate }: EdgeSchema) {
  const positivePercent = (value: string | undefined) => {
    if (value === '0%' || value === '0' || value === undefined || value === '') return '+0%'
    return value
  }
  const positiveHz = (value: string | undefined) => {
    if (value === '0Hz' || value === '0' || value === undefined || value === '') return '+0Hz'
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
/**
 * @description 流式返回音频, 支持长文本
 * @param req
 * @param res
 * @param next
 * @returns ReadableStream
 */
export async function createTaskStream(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.query?.mock) {
      logger.info('Mocking audio stream...')
      streamWithLimit(res, path.join(__dirname, '../../mock/flying.mp3'), 1280) // Mock stream with limit
      return
    }
    logger.debug('Generating audio with body:', req.body)
    const formattedBody = formatBody(req.body)
    const task = taskManager.createTask(formattedBody)
    task.context = { req, res, body: req.body, startAt: Date.now() }
    logger.info(`Generated stream task ID: ${task.id}`)

    // DB: insert pending
    try {
      if (ENABLE_MYSQL) {
        const text = String(formattedBody.text || '')
        const text_hash = crypto.createHash('sha256').update(text).digest('hex')
        const insertId = await dbInsertInitial({
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
        if (insertId) (task.context as any).dbId = insertId
      }
    } catch (e) {
      logger.warn(`DB insertInitial failed: ${(e as Error).message}`)
    }
    generateTTSStream(formattedBody, task)
  } catch (error) {
    console.log(`createTaskStream error:`, error)
    next(error)
  }
}
export async function generateJson(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body?.data
    logger.debug('generateJson with body:', data)
    const formatedBody = data.map((item: any) => formatBody(item))
    const text = data.map((item: any) => item.text).join('')
    const taskParams = {
      ...formatedBody[0],
      text,
    }
    const task = taskManager.createTask(taskParams)
    const voice = formatedBody[0].voice

    const segment: Segment = { id: generateId(voice, text), text }
    task.context = { req, res, segment, body: req.body, startAt: Date.now() }
    logger.info(`Generated stream task ID: ${task.id}`)

    // DB: insert pending for json flow
    try {
      if (ENABLE_MYSQL) {
        const text_hash = crypto.createHash('sha256').update(text).digest('hex')
        const insertId = await dbInsertInitial({
          task_id: task.id,
          engine: 'edge-tts',
          voice: voice,
          rate: taskParams.rate,
          pitch: taskParams.pitch,
          volume: taskParams.volume,
          use_llm: 0,
          text: STORE_TTS_TEXT ? text : null,
          text_hash,
          text_len: text.length,
          status: 'pending',
          requester_ip: req.headers['x-forwarded-for']?.toString() || req.ip,
          user_id: req.user?.id || null,
          username: req.user?.username || null,
        })
        if (insertId) (task.context as any).dbId = insertId
      }
    } catch (e) {
      logger.warn(`DB insertInitial(json) failed: ${(e as Error).message}`)
    }
    generateTTSStreamJson(formatedBody, task)
  } catch (error) {
    console.log(`createTaskStream error:`, error)
    next(error)
  }
}
