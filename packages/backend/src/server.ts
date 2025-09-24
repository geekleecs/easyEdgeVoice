import { createApp } from './app'
import { AUDIO_DIR, PUBLIC_DIR, RATE_LIMIT, RATE_LIMIT_WINDOW, PORT, HOST } from './config'
import { ttsPluginManager } from './tts/pluginManager'
import { ensureDatabaseAndTable } from './services/db/mysql'
import { initializeFFmpeg } from './services/ffmpeg-init'

const app = createApp({
  isDev: process.env.NODE_ENV === 'development',
  rateLimit: RATE_LIMIT,
  rateLimitWindow: RATE_LIMIT_WINDOW,
  audioDir: AUDIO_DIR,
  publicDir: PUBLIC_DIR,
})

app.listen(PORT, HOST || '0.0.0.0', async () => {
  await ensureDatabaseAndTable()
  await initializeFFmpeg()
  await ttsPluginManager.initializeEngines()
  console.log(`Server running on ${HOST}:${PORT}`)
})
