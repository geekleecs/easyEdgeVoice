import { Router } from 'express'
import {
  generateAudio,
  downloadAudio,
  getVoiceList,
  createTask,
  getTask,
  getTaskStats,
} from '../controllers/tts.controller'
import { pickSchema } from '../controllers/pick.controller'
import { ttsPluginManager } from '../tts/pluginManager'
import { createTaskStream, generateJson } from '../controllers/stream.controller'
import { validateJson } from '../schema/generate'
import { authenticateToken } from '../middleware/auth.middleware'

const router = Router()

router.get('/engines', (req, res) => {
  const engines = ttsPluginManager.getAllEngines().map((engine) => ({
    name: engine.name,
    languages: engine.getSupportedLanguages(),
    voices: engine.getVoiceOptions?.() || [],
  }))
  res.json(engines)
})

router.get('/voiceList', getVoiceList)
router.get('/task/stats', authenticateToken, getTaskStats)
router.get('/task/:id', authenticateToken, getTask)
router.get('/download/:file', authenticateToken, downloadAudio)

router.post('/create', authenticateToken, pickSchema, createTask)
router.post('/createStream', authenticateToken, pickSchema, createTaskStream)
router.post('/generate', authenticateToken, pickSchema, generateAudio)
router.post('/generateJson', authenticateToken, validateJson, generateJson)

export default router
