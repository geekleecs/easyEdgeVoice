import dotenv from 'dotenv'
import { resolve } from 'path'

/**
 * 统一的环境变量加载器
 * 支持多级配置加载和优先级管理
 */
export function loadEnvironmentConfig() {
  const configPaths = [
    // 1. 根目录主配置文件（最高优先级）
    resolve(__dirname, '..', '..', '..', '..', '.env'),
    // 2. 后端专用配置文件
    resolve(__dirname, '..', '..', '.env.local'),
    // 3. 后端目录配置文件（向后兼容）
    resolve(__dirname, '..', '..', '.env'),
  ]

  // 按优先级加载配置文件
  for (const configPath of configPaths) {
    try {
      dotenv.config({ path: configPath })
      console.log(`Loaded config from: ${configPath}`)
    } catch (error) {
      // 忽略文件不存在的错误
      if ((error as any).code !== 'ENOENT') {
        console.warn(`Failed to load config from ${configPath}:`, error)
      }
    }
  }
}

/**
 * 获取环境变量，支持默认值
 */
export function getEnv(key: string, defaultValue?: string): string | undefined {
  return process.env[key] || defaultValue
}

/**
 * 获取必需的环境变量，如果不存在则抛出错误
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`)
  }
  return value
}

/**
 * 获取布尔类型的环境变量
 */
export function getBooleanEnv(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key]
  if (value === undefined) return defaultValue
  return value.toLowerCase() === 'true'
}

/**
 * 获取数字类型的环境变量
 */
export function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key]
  if (value === undefined) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}
