import { exec } from 'child_process'
import { promisify } from 'util'
import { setFfmpegPath } from 'fluent-ffmpeg'
import { logger } from '../utils/logger'

const execAsync = promisify(exec)

// 全局标志，确保只初始化一次
let isInitialized = false

async function findFfmpegPath() {
  const possiblePaths = [
    'ffmpeg',
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
    'C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe',
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg'
  ]
  
  for (const path of possiblePaths) {
    try {
      await execAsync(`${path} -version`)
      return path
    } catch (error) {
      continue
    }
  }
  return 'ffmpeg' // 默认值
}

/**
 * 初始化 FFmpeg 路径
 * 使用单例模式确保只初始化一次
 */
export async function initializeFFmpeg(): Promise<void> {
  if (isInitialized) {
    return
  }

  try {
    const path = await findFfmpegPath()
    setFfmpegPath(path)
    logger.info(`FFmpeg path set to: ${path}`)
    isInitialized = true
  } catch (error) {
    logger.warn(`Failed to find FFmpeg: ${(error as Error).message}`)
    setFfmpegPath('ffmpeg')
    isInitialized = true
  }
}

/**
 * 检查 FFmpeg 是否已初始化
 */
export function isFFmpegInitialized(): boolean {
  return isInitialized
}
