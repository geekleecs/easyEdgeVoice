import { getPool } from './mysql'
import bcrypt from 'bcryptjs'

export interface User {
  id: number
  username: string
  password_hash: string
  email: string
  role: 'user' | 'admin'
  created_at: Date
  updated_at: Date
  last_login: Date | null
  is_active: boolean
}

export interface CreateUserData {
  username: string
  password: string
  email: string
  role?: 'user' | 'admin'
}

export interface UpdateUserData {
  username?: string
  email?: string
  password?: string
  role?: 'user' | 'admin'
  is_active?: boolean
}

/**
 * 根据用户名查找用户
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  const pool = await getPool()
  if (!pool) {
    throw new Error('MySQL connection pool is not available')
  }
  
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
      [username]
    )
    const users = rows as User[]
    return users.length > 0 ? users[0] : null
  } catch (error) {
    console.error('Error in findUserByUsername:', error)
    
    // 根据错误类型抛出不同的错误
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        throw new Error('Network connection failed')
      }
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        throw new Error('Database query timeout')
      }
      if (error.message.includes('ER_ACCESS_DENIED_ERROR')) {
        throw new Error('Database access denied')
      }
    }
    
    throw new Error('Database query failed')
  }
}

/**
 * 根据邮箱查找用户
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const pool = await getPool()
  if (!pool) {
    throw new Error('MySQL connection pool is not available')
  }
  
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    )
    const users = rows as User[]
    return users.length > 0 ? users[0] : null
  } catch (error) {
    console.error('Error in findUserByEmail:', error)
    
    // 根据错误类型抛出不同的错误
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        throw new Error('Network connection failed')
      }
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        throw new Error('Database query timeout')
      }
      if (error.message.includes('ER_ACCESS_DENIED_ERROR')) {
        throw new Error('Database access denied')
      }
    }
    
    throw new Error('Database query failed')
  }
}

/**
 * 根据ID查找用户
 */
export async function findUserById(id: number): Promise<User | null> {
  const pool = await getPool()
  if (!pool) {
    throw new Error('MySQL connection pool is not available')
  }
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
    [id]
  )
  const users = rows as User[]
  return users.length > 0 ? users[0] : null
}

/**
 * 根据ID查找用户（包括停用的用户）
 */
export async function findUserByIdIncludeInactive(id: number): Promise<User | null> {
  const pool = await getPool()
  if (!pool) {
    throw new Error('MySQL connection pool is not available')
  }
  
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [id]
    )
    const users = rows as User[]
    return users.length > 0 ? users[0] : null
  } catch (error) {
    console.error('Error in findUserByIdIncludeInactive:', error)
    
    // 根据错误类型抛出不同的错误
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        throw new Error('Network connection failed')
      }
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        throw new Error('Database query timeout')
      }
      if (error.message.includes('ER_ACCESS_DENIED_ERROR')) {
        throw new Error('Database access denied')
      }
    }
    
    throw new Error('Database query failed')
  }
}

/**
 * 创建新用户
 */
export async function createUser(userData: CreateUserData): Promise<User> {
  const pool = await getPool()
  if (!pool) {
    throw new Error('MySQL connection pool is not available')
  }
  const saltRounds = 10
  const password_hash = await bcrypt.hash(userData.password, saltRounds)
  
  const [result] = await pool.execute(
    'INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
    [userData.username, password_hash, userData.email, userData.role || 'user']
  )
  
  const insertResult = result as any
  const newUser = await findUserById(insertResult.insertId)
  if (!newUser) {
    throw new Error('Failed to create user')
  }
  
  return newUser
}

/**
 * 更新用户信息
 */
export async function updateUser(id: number, userData: UpdateUserData): Promise<User | null> {
  const pool = await getPool()
  if (!pool) {
    throw new Error('MySQL connection pool is not available')
  }
  const updateFields: string[] = []
  const values: any[] = []
  
  if (userData.username !== undefined) {
    updateFields.push('username = ?')
    values.push(userData.username)
  }
  
  if (userData.email !== undefined) {
    updateFields.push('email = ?')
    values.push(userData.email)
  }
  
  if (userData.password !== undefined) {
    const saltRounds = 10
    const password_hash = await bcrypt.hash(userData.password, saltRounds)
    updateFields.push('password_hash = ?')
    values.push(password_hash)
  }
  
  if (userData.role !== undefined) {
    updateFields.push('role = ?')
    values.push(userData.role)
  }
  
  if (userData.is_active !== undefined) {
    updateFields.push('is_active = ?')
    values.push(userData.is_active)
  }
  
  if (updateFields.length === 0) {
    return findUserById(id)
  }
  
  updateFields.push('updated_at = CURRENT_TIMESTAMP')
  values.push(id)
  
  await pool.execute(
    `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
    values
  )
  
  // 如果更新了 is_active 字段，使用包含停用用户的查找函数
  if (userData.is_active !== undefined) {
    return findUserByIdIncludeInactive(id)
  }
  
  return findUserById(id)
}

/**
 * 更新用户最后登录时间
 */
export async function updateLastLogin(id: number): Promise<void> {
  const pool = await getPool()
  if (!pool) {
    throw new Error('MySQL connection pool is not available')
  }
  await pool.execute(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  )
}

/**
 * 验证用户密码
 */
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword)
}

/**
 * 获取所有用户（管理员功能）
 */
export async function getAllUsers(limit: number = 50, offset: number = 0): Promise<User[]> {
  const pool = await getPool()
  if (!pool) {
    throw new Error('MySQL connection pool is not available')
  }
  const [rows] = await pool.execute(
    'SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  )
  return rows as User[]
}

/**
 * 获取用户总数
 */
export async function getUserCount(): Promise<number> {
  const pool = await getPool()
  if (!pool) {
    throw new Error('MySQL connection pool is not available')
  }
  const [rows] = await pool.execute('SELECT COUNT(*) as count FROM users')
  const result = rows as any[]
  return result[0].count
}

/**
 * 删除用户（软删除）
 */
export async function deleteUser(id: number): Promise<boolean> {
  const pool = await getPool()
  if (!pool) {
    throw new Error('MySQL connection pool is not available')
  }
  const [result] = await pool.execute(
    'UPDATE users SET is_active = FALSE WHERE id = ?',
    [id]
  )
  const updateResult = result as any
  return updateResult.affectedRows > 0
}
