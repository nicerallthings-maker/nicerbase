import { AuthError, User } from './auth.js'
import { config } from './config.js'
import { hashPassword, randomToken, sha256, verifyPassword } from './crypto.js'
import { pool } from './db.js'
import { sendEmail } from './mailer.js'
import { deleteProject, listProjects } from './projects.js'

type Purpose = 'verify-email' | 'reset-password'

const TOKEN_TTL_HOURS: Record<Purpose, number> = { 'verify-email': 48, 'reset-password': 1 }

async function issueToken(userId: string, purpose: Purpose) {
  const token = randomToken()
  await pool.query('delete from nicerbase.tokens where user_id = $1 and purpose = $2', [
    userId,
    purpose,
  ])
  await pool.query(
    `insert into nicerbase.tokens (token_hash, user_id, purpose, expires_at)
     values ($1, $2, $3, now() + make_interval(hours => $4))`,
    [sha256(token), userId, purpose, TOKEN_TTL_HOURS[purpose]]
  )
  return token
}

/** Deletes and returns the token's user if the token is valid for `purpose`. */
async function consumeToken(token: string, purpose: Purpose) {
  const { rows } = await pool.query<{ user_id: string }>(
    `delete from nicerbase.tokens
     where token_hash = $1 and purpose = $2 and expires_at > now()
     returning user_id`,
    [sha256(token), purpose]
  )
  return rows[0]?.user_id
}

async function isTokenValid(token: string, purpose: Purpose) {
  const { rows } = await pool.query(
    'select 1 from nicerbase.tokens where token_hash = $1 and purpose = $2 and expires_at > now()',
    [sha256(token), purpose]
  )
  return rows.length > 0
}

export async function isEmailVerified(userId: string) {
  const { rows } = await pool.query<{ verified: boolean }>(
    'select email_verified_at is not null as verified from nicerbase.users where id = $1',
    [userId]
  )
  return rows[0]?.verified ?? false
}

export async function sendVerificationEmail(user: User) {
  const token = await issueToken(user.id, 'verify-email')
  const link = `${config.publicUrl}/verify-email?token=${token}`
  await sendEmail(
    user.email,
    'Confirm your NicerBase email',
    `Hi ${user.name},\n\nConfirm your email address to start creating projects:\n\n${link}\n\nThis link expires in 48 hours. If you didn't sign up for NicerBase, ignore this email.`
  )
}

export async function verifyEmail(token: string) {
  const userId = await consumeToken(token, 'verify-email')
  if (!userId) return false
  await pool.query('update nicerbase.users set email_verified_at = now() where id = $1', [userId])
  return true
}

/** Always succeeds from the caller's view so it never reveals which emails have accounts. */
export async function requestPasswordReset(emailInput: string) {
  const email = emailInput.trim().toLowerCase()
  const { rows } = await pool.query<User>(
    'select id, email, name from nicerbase.users where email = $1',
    [email]
  )
  const user = rows[0]
  if (!user) return
  const token = await issueToken(user.id, 'reset-password')
  const link = `${config.publicUrl}/reset-password?token=${token}`
  await sendEmail(
    user.email,
    'Reset your NicerBase password',
    `Hi ${user.name},\n\nUse this link to choose a new password:\n\n${link}\n\nThis link expires in 1 hour. If you didn't ask to reset your password, ignore this email; your password won't change.`
  )
}

export const isResetTokenValid = (token: string) => isTokenValid(token, 'reset-password')

function validateNewPassword(password: string) {
  if (password.length < 10) throw new AuthError('Use at least 10 characters for your password.')
  if (password.length > 200) throw new AuthError('Use 200 characters or fewer for your password.')
}

/** Sets a new password from a reset link and signs the user out everywhere. */
export async function resetPassword(token: string, password: string) {
  validateNewPassword(password)
  const userId = await consumeToken(token, 'reset-password')
  if (!userId) throw new AuthError('This reset link is invalid or has expired. Request a new one.')
  await pool.query(
    'update nicerbase.users set password_hash = $2, email_verified_at = coalesce(email_verified_at, now()) where id = $1',
    [userId, await hashPassword(password)]
  )
  await pool.query('delete from nicerbase.sessions where user_id = $1', [userId])
}

export async function changePassword(
  userId: string,
  currentToken: string,
  current: string,
  next: string
) {
  const { rows } = await pool.query<{ password_hash: string }>(
    'select password_hash from nicerbase.users where id = $1',
    [userId]
  )
  if (!rows[0] || !(await verifyPassword(current, rows[0].password_hash))) {
    throw new AuthError('Your current password is incorrect.')
  }
  validateNewPassword(next)
  await pool.query('update nicerbase.users set password_hash = $2 where id = $1', [
    userId,
    await hashPassword(next),
  ])
  // Keep this browser signed in, sign out every other session.
  await pool.query('delete from nicerbase.sessions where user_id = $1 and token_hash <> $2', [
    userId,
    sha256(currentToken),
  ])
}

/** Deletes every project (and its database) first, then the account. */
export async function deleteAccount(user: User, confirmation: string) {
  if (confirmation.trim().toLowerCase() !== user.email) {
    throw new AuthError('Type your email address exactly to confirm.')
  }
  for (const project of await listProjects(user.id)) {
    await deleteProject(user.id, project.ref)
  }
  await pool.query('delete from nicerbase.users where id = $1', [user.id])
}
