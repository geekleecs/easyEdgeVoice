import { join } from 'path'
import { loadEnvironmentConfig, getEnv, getBooleanEnv, getNumberEnv } from './env-loader'

// 加载环境配置
loadEnvironmentConfig()
export const config = {
  port: getNumberEnv('PORT', 3000),
}

export const AUDIO_DIR = join(__dirname, '..', '..', 'audio')
export const AUDIO_CACHE_DIR = join(AUDIO_DIR, '.cache')
export const PUBLIC_DIR = join(__dirname, '..', '..', 'public')
export const ALLOWED_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.flac', '.srt'])

export const OPENAI_BASE_URL = getEnv('OPENAI_BASE_URL')
export const OPENAI_API_KEY = getEnv('OPENAI_API_KEY')
export const MODEL_NAME = getEnv('MODEL_NAME')

export const STATIC_DOMAIN = getEnv('NODE_ENV') === 'development' ? 'http://localhost:3000' : getEnv('STATIC_DOMAIN', '')

export const RATE_LIMIT_WINDOW = getNumberEnv('RATE_LIMIT_WINDOW', 10)
export const RATE_LIMIT = getNumberEnv('RATE_LIMIT', 1000000)

export const EDGE_API_LIMIT = getNumberEnv('EDGE_API_LIMIT', 3)

export const PORT = getNumberEnv('PORT', 3000)
export const HOST = getEnv('HOST', '0.0.0.0')

export const REGISTER_OPENAI_TTS = getBooleanEnv('REGISTER_OPENAI_TTS', false)

export const LIMIT_TEXT_LENGTH = getNumberEnv('LIMIT_TEXT_LENGTH', 0)
export const LIMIT_TEXT_LENGTH_ERROR_MESSAGE = getEnv('LIMIT_TEXT_LENGTH_ERROR_MESSAGE', '文本长度超出限制')
export const USE_HELMET = getBooleanEnv('USE_HELMET', false)
export const USE_LIMIT = getBooleanEnv('USE_LIMIT', false)
export const DIRECT_GEN_LIMIT = getNumberEnv('DIRECT_GEN_LIMIT', 200)

// MySQL related envs
export const ENABLE_MYSQL = getBooleanEnv('ENABLE_MYSQL', true)
export const MYSQL_HOST = getEnv('MYSQL_HOST', '127.0.0.1')
export const MYSQL_PORT = getNumberEnv('MYSQL_PORT', 3306)
export const MYSQL_USER = getEnv('MYSQL_USER', 'root')
export const MYSQL_PASSWORD = getEnv('MYSQL_PASSWORD', '')
export const MYSQL_DATABASE = getEnv('MYSQL_DATABASE', 'easyedgevoice')
export const MYSQL_CONNECTION_LIMIT = getNumberEnv('MYSQL_CONNECTION_LIMIT', 10)
export const MYSQL_SSL = getBooleanEnv('MYSQL_SSL', false)
export const STORE_TTS_TEXT = getBooleanEnv('STORE_TTS_TEXT', true)
export const STORE_ERR_DETAIL = getBooleanEnv('STORE_ERR_DETAIL', false)
