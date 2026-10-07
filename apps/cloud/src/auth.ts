import { hashPassword, randomToken, sha256, verifyPassword } from './crypto.js'
import { pool } from './db.js'

export type User = { id: string; email: string; name: string }

const SESSION_DAYS = 14
export const SESSION_COOKIE = 'nb_session'
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60

export class AuthError extends Error {}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateSignUp(input: { name?: string; email?: string; password?: string }) {
  const name = (input.name ?? '').trim()
  const email = (input.email ?? '').trim().toLowerCase()
  const password = input.password ?? ''
  if (name.length < 1 || name.length > 80) throw new AuthError('Enter your name.')
  if (!EMAIL.test(email) || email.length > 254) throw new AuthError('Enter a valid email address.')
  if (password.length < 10) throw new AuthError('Use at least 10 characters for your password.')
  if (password.length > 200) throw new AuthError('Use 200 characters or fewer for your password.')
  return { name, email, password }
}

export async function signUp(input: { name?: string; email?: string; password?: string }) {
  const { name, email, password } = validateSignUp(input)
  const passwordHash = await hashPassword(password)
  const { rows } = await pool.query<User>(
    `insert into nicerbase.users (email, name, password_hash) values ($1, $2, $3)
     on conflict (email) do nothing
     returning id, email, name`,
    [email, name, passwordHash]
  )
  if (rows.length === 0)
    throw new AuthError('An account with this email already exists. Sign in instead.')
  return rows[0]
}

export async function signIn(input: { email?: string; password?: string }) {
  const email = (input.email ?? '').trim().toLowerCase()
  const password = input.password ?? ''
  const { rows } = await pool.query<User & { password_hash: string }>(
    'select id, email, name, password_hash from nicerbase.users where email = $1',
    [email]
  )
  const user = rows[0]
  // Always run a hash comparison so response time doesn't reveal which emails exist.
  const isValid = await verifyPassword(
    password,
    user?.password_hash ??
      'scrypt$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
  )
  if (!user || !isValid) throw new AuthError('Incorrect email or password.')
  return { id: user.id, email: user.email, name: user.name }
}

export async function createSession(userId: string) {
  const token = randomToken()
  await pool.query(
    `insert into nicerbase.sessions (token_hash, user_id, expires_at)
     values ($1, $2, now() + make_interval(days => $3))`,
    [sha256(token), userId, SESSION_DAYS]
  )
  return token
}

export async function getSessionUser(token: string | undefined): Promise<User | undefined> {
  if (!token) return undefined
  const { rows } = await pool.query<User>(
    `select u.id, u.email, u.name from nicerbase.sessions s
     join nicerbase.users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [sha256(token)]
  )
  return rows[0]
}

export async function destroySession(token: string | undefined) {
  if (!token) return
  await pool.query('delete from nicerbase.sessions where token_hash = $1', [sha256(token)])
}

/** Small in-memory limiter for sign-in / sign-up attempts per IP. */
const attempts = new Map<string, { count: number; resetAt: number }>()
export function isRateLimited(key: string, limit = 10, windowMs = 10 * 60 * 1000) {
  const now = Date.now()
  const entry = attempts.get(key)
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  entry.count += 1
  return entry.count > limit
}
