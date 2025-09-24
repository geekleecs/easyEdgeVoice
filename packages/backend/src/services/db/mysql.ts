import mysql, { Pool, PoolOptions } from 'mysql2/promise'
import {
  ENABLE_MYSQL,
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
  MYSQL_CONNECTION_LIMIT,
  MYSQL_SSL,
  AUDIO_DIR,
} from '../../config'
import { logger } from '../../utils/logger'

let pool: Pool | null = null

export function isMysqlEnabled(): boolean {
  return ENABLE_MYSQL === true
}

export async function getPool(): Promise<Pool | null> {
  if (!isMysqlEnabled()) return null
  if (pool) return pool
  try {
    const options: PoolOptions = {
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE,
      connectionLimit: MYSQL_CONNECTION_LIMIT,
      ssl: MYSQL_SSL ? { rejectUnauthorized: false } : undefined,
      charset: 'utf8mb4_general_ci',
    }
    pool = mysql.createPool(options)
    logger.info('MySQL pool created')
    return pool
  } catch (err) {
    logger.warn(`MySQL pool init failed: ${(err as Error).message}`)
    return null
  }
}

export async function ensureDatabaseAndTable(): Promise<void> {
  if (!isMysqlEnabled()) return
  try {
    // 先检查数据库和表是否已存在
    const p = await getPool()
    if (!p) {
      logger.warn('Database connection not available, skipping table check')
      return
    }

    try {
      // 检查关键表是否存在
      const [tables] = await p.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('users', 'tts_records')
      `, [MYSQL_DATABASE])
      
      const existingTables = Array.isArray(tables) ? tables.map((t: any) => t.TABLE_NAME) : []
      
      if (existingTables.includes('users') && existingTables.includes('tts_records')) {
        logger.info('MySQL database and tables already exist, skipping initialization')
        return
      }
      
      logger.info('Database tables missing, initializing from SQL script...')
    } catch (checkErr) {
      logger.warn(`Table check failed: ${(checkErr as Error).message}`)
      logger.info('Proceeding with database initialization...')
    }

    // 执行 SQL 初始化脚本
    const fs = await import('fs/promises')
    const path = await import('path')
    
    // 从 packages/backend 目录回到项目根目录
    const sqlFilePath = path.join(process.cwd(), '..', '..', 'scripts', 'sql', 'init_database.sql')
    
    try {
      logger.info(`Reading SQL script from: ${sqlFilePath}`)
      const sqlContent = await fs.readFile(sqlFilePath, 'utf-8')
      logger.info(`SQL script loaded, content length: ${sqlContent.length} characters`)
      
      // 先不用数据库名创建连接，避免库不存在时报错
      logger.info(`Creating MySQL connection to ${MYSQL_HOST}:${MYSQL_PORT} as user ${MYSQL_USER}`)
      const root = await mysql.createConnection({
        host: MYSQL_HOST,
        port: MYSQL_PORT,
        user: MYSQL_USER,
        password: MYSQL_PASSWORD,
        ssl: MYSQL_SSL ? { rejectUnauthorized: false } : undefined,
      })
      logger.info('MySQL connection established successfully')
      
      // 分割 SQL 语句并逐个执行
      // 先按分号分割，然后清理每个语句
      const rawStatements = sqlContent.split(';')
      logger.info(`Raw SQL statements after split: ${rawStatements.length}`)
      
      // 先显示所有原始语句
      rawStatements.forEach((stmt, index) => {
        const trimmed = stmt.trim()
        logger.info(`Raw statement ${index + 1}: "${trimmed.substring(0, 50)}${trimmed.length > 50 ? '...' : ''}" (length: ${trimmed.length})`)
      })
      
      const sqlStatements = rawStatements
        .map(stmt => stmt.trim())
        .filter(stmt => {
          // 过滤空语句
          if (stmt.length === 0) return false
          if (stmt.match(/^\s*$/)) return false
          
          // 过滤纯注释语句（不包含任何 SQL 命令）
          if (stmt.startsWith('--') && !stmt.includes('CREATE') && !stmt.includes('INSERT') && !stmt.includes('SELECT') && !stmt.includes('USE')) {
            return false
          }
          
          return true
        })
      
      logger.info(`SQL statements after filtering: ${sqlStatements.length}`)
      sqlStatements.forEach((stmt, index) => {
        logger.info(`Statement ${index + 1}: ${stmt.substring(0, 100)}${stmt.length > 100 ? '...' : ''}`)
      })
      
      logger.info(`Found ${sqlStatements.length} SQL statements to execute`)
      
      for (let i = 0; i < sqlStatements.length; i++) {
        const statement = sqlStatements[i]
        if (statement.trim()) {
          try {
            logger.info(`Executing SQL statement ${i + 1}/${sqlStatements.length}: ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`)
            await root.query(statement)
            logger.info(`Successfully executed SQL statement ${i + 1}/${sqlStatements.length}`)
          } catch (stmtErr) {
            logger.error(`Failed to execute SQL statement ${i + 1}/${sqlStatements.length}: ${(stmtErr as Error).message}`)
            logger.error(`Statement content: ${statement}`)
            throw stmtErr
          }
        }
      }
      
      logger.info('Closing MySQL connection')
      await root.end()
      logger.info('MySQL connection closed')
      
      logger.info('MySQL database and tables ensured from SQL script')
    } catch (fileErr) {
      logger.error(`Failed to read SQL script: ${(fileErr as Error).message}`)
      logger.error('Please ensure scripts/sql/init_database.sql exists and is accessible')
      throw new Error('Database initialization failed: SQL script not found')
    }
  } catch (err) {
    logger.warn(`ensureDatabaseAndTable failed: ${(err as Error).message}`)
  }
}

export type TtsRecord = {
  task_id?: string
  engine?: string
  voice?: string
  rate?: string
  pitch?: string
  volume?: string
  use_llm?: number
  text?: string | null
  text_hash: string
  text_len: number
  language?: string
  status: 'pending' | 'success' | 'failed'
  error_message?: string | null
  file_name?: string | null
  srt_file?: string | null
  file_size?: number | null
  duration_ms?: number | null
  latency_ms?: number | null
  requester_ip?: string | null
  user_id?: number | null
  username?: string | null
}

export async function insertInitial(record: TtsRecord): Promise<number | null> {
  try {
    const p = await getPool()
    if (!p) return null
    const [ret] = await p.query(`INSERT INTO tts_records SET ?`, [record])
    // @ts-expect-error mysql2 typing for OkPacket
    return ret?.insertId ?? null
  } catch (err) {
    logger.warn(`insertInitial failed: ${(err as Error).message}`)
    return null
  }
}

export async function markSuccess(by: { id?: number; task_id?: string }, fields: Partial<TtsRecord>) {
  try {
    const p = await getPool()
    if (!p) return
    const where = by.id ? 'id = ?' : 'task_id = ?'
    const val = by.id ?? by.task_id
    await p.query(`UPDATE tts_records SET ? , status='success' WHERE ${where} LIMIT 1`, [fields, val])
  } catch (err) {
    logger.warn(`markSuccess failed: ${(err as Error).message}`)
  }
}

export async function markFailed(by: { id?: number; task_id?: string }, errMsg: string) {
  try {
    const p = await getPool()
    if (!p) return
    const where = by.id ? 'id = ?' : 'task_id = ?'
    const val = by.id ?? by.task_id
    await p.query(`UPDATE tts_records SET status='failed', error_message = ? WHERE ${where} LIMIT 1`, [errMsg, val])
  } catch (err) {
    logger.warn(`markFailed failed: ${(err as Error).message}`)
  }
}

export async function insertImmediate(record: TtsRecord) {
  try {
    const p = await getPool()
    if (!p) return null
    const [ret] = await p.query(`INSERT INTO tts_records SET ?`, [record])
    // @ts-expect-error OkPacket
    return ret?.insertId ?? null
  } catch (err) {
    logger.warn(`insertImmediate failed: ${(err as Error).message}`)
    return null
  }
}

/**
 * 删除JSON文件
 */
async function deleteJsonFiles(file_name: string): Promise<void> {
  const fs = await import('fs/promises')
  const path = await import('path')
  
  try {
    // 1. 删除主JSON文件：{file_name}.json
    const mainJsonPath = path.join(AUDIO_DIR, file_name + '.json')
    try {
      await fs.unlink(mainJsonPath)
      logger.info(`成功删除主JSON文件: ${mainJsonPath}`)
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.warn(`删除主JSON文件失败: ${mainJsonPath} - ${error.message}`)
      }
    }
    
    // 2. 删除临时目录JSON文件：{file_name}_tmp/all_splits.mp3.json
    const tempDir = path.join(AUDIO_DIR, file_name.replace('.mp3', '_tmp'))
    const tempJsonPath = path.join(tempDir, 'all_splits.mp3.json')
    try {
      await fs.unlink(tempJsonPath)
      logger.info(`成功删除临时JSON文件: ${tempJsonPath}`)
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.warn(`删除临时JSON文件失败: ${tempJsonPath} - ${error.message}`)
      }
    }
    
    // 3. 删除SRT JSON文件：{file_name}.srt.json
    const srtJsonPath = path.join(AUDIO_DIR, file_name.replace('.mp3', '.srt.json'))
    try {
      await fs.unlink(srtJsonPath)
      logger.info(`成功删除SRT JSON文件: ${srtJsonPath}`)
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.warn(`删除SRT JSON文件失败: ${srtJsonPath} - ${error.message}`)
      }
    }
    
    // 4. 删除SRT JSON分段文件：{file_name}.srt.json.{number}
    try {
      const baseName = file_name.replace('.mp3', '.srt.json')
      const srtJsonDir = path.dirname(path.join(AUDIO_DIR, baseName))
      const srtJsonBase = path.basename(baseName)
      
      // 读取目录并查找匹配的文件
      const files = await fs.readdir(srtJsonDir)
      const srtJsonFiles = files.filter(file => 
        file.startsWith(srtJsonBase + '.') && file !== srtJsonBase
      )
      
      for (const srtFile of srtJsonFiles) {
        try {
          const srtFilePath = path.join(srtJsonDir, srtFile)
          await fs.unlink(srtFilePath)
          logger.info(`成功删除SRT JSON分段文件: ${srtFilePath}`)
        } catch (error: any) {
          logger.warn(`删除SRT JSON分段文件失败: ${srtFile} - ${error.message}`)
        }
      }
    } catch (error: any) {
      logger.warn(`查找SRT JSON分段文件失败: ${error.message}`)
    }
    
  } catch (error: any) {
    logger.warn(`删除JSON文件过程中发生错误: ${error.message}`)
  }
}

export async function deleteRecord(by: { id?: number; task_id?: string }, userId?: number) {
  try {
    const p = await getPool()
    if (!p) return false
    
    // 先获取记录信息，用于删除文件
    const where = by.id ? 'id = ?' : 'task_id = ?'
    const val = by.id ?? by.task_id
    const [records] = await p.query(`SELECT file_name, srt_file FROM tts_records WHERE ${where}`, [val])
    
    if (!Array.isArray(records) || records.length === 0) {
      return false
    }
    
    const record = records[0] as { file_name?: string; srt_file?: string }
    
    // 删除数据库记录
    const [result] = await p.query(`DELETE FROM tts_records WHERE ${where}`, [val])
    // @ts-expect-error OkPacket
    const deleted = result?.affectedRows > 0
    
    if (deleted) {
      // 删除文件
      const fs = await import('fs/promises')
      const path = await import('path')
      
      try {
        if (record.file_name) {
          const audioPath = path.join(AUDIO_DIR, record.file_name)
          logger.info(`尝试删除音频文件: ${audioPath}`)
          await fs.unlink(audioPath)
          logger.info(`成功删除音频文件: ${audioPath}`)
          
          // 删除JSON文件
          await deleteJsonFiles(record.file_name)
        }
        if (record.srt_file) {
          const srtPath = path.join(AUDIO_DIR, record.srt_file)
          logger.info(`尝试删除字幕文件: ${srtPath}`)
          await fs.unlink(srtPath)
          logger.info(`成功删除字幕文件: ${srtPath}`)
        }
      } catch (fileErr) {
        logger.warn(`删除文件失败: ${(fileErr as Error).message}`)
        // 即使文件删除失败，也返回true，因为数据库记录已经删除
      }
    }
    
    return deleted
  } catch (err) {
    logger.warn(`deleteRecord failed: ${(err as Error).message}`)
    return false
  }
}

