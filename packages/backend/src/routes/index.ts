import { Application } from 'express'
import ttsRoutes from './tts.route'
import authRoutes from './auth.route'
import dashboardRoutes from './dashboard.route'
import history from 'connect-history-api-fallback'
import { healthHandler } from '../middleware/health.middleware'

export function setupRoutes(app: Application): void {
  app.use('/api/auth', authRoutes)
  app.use('/api/v1/tts', ttsRoutes)
  app.use('/api/dashboard', dashboardRoutes)
  app.use('/api/health', healthHandler)
  app.use(history())
}
