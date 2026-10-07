import { readFile } from 'node:fs/promises'
import { createServer, IncomingMessage, ServerResponse } from 'node:http'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  AuthError,
  createSession,
  destroySession,
  getSessionUser,
  isRateLimited,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  signIn,
  signUp,
  User,
} from './auth.js'
import { config, isSecureCookie } from './config.js'
import { migrate } from './db.js'
import type { SafeHtml } from './html.js'
import {
  createProject,
  deleteProject,
  getConnectionString,
  getProject,
  listProjects,
  ProjectError,
  resetProjectPassword,
} from './projects.js'
import { hardenPostgresCluster, isMongoAvailable } from './provision.js'
import {
  dashboardPage,
  landingPage,
  legalPage,
  newProjectPage,
  notFoundPage,
  projectPage,
  signInPage,
  signUpPage,
} from './views.js'

const PUBLIC_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'public')
const STATIC_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
}
const STATIC_FILES = new Set([
  '/styles.css',
  '/app.js',
  '/logo.svg',
  '/mark.svg',
  '/favicon.ico',
  '/apple-touch-icon.png',
])
const staticCache = new Map<string, Buffer>()

const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
}

type Context = { req: IncomingMessage; res: ServerResponse; url: URL; user?: User; token?: string }

function parseCookies(header: string | undefined) {
  const cookies: Record<string, string> = {}
  for (const part of (header ?? '').split(';')) {
    const index = part.indexOf('=')
    if (index > 0)
      cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim())
  }
  return cookies
}

function sessionCookie(value: string, maxAge: number) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isSecureCookie ? '; Secure' : ''}`
}

async function readForm(req: IncomingMessage): Promise<Record<string, string>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 16 * 1024) throw new Error('Request body too large')
    chunks.push(chunk as Buffer)
  }
  return Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString('utf8')))
}

function send(
  res: ServerResponse,
  status: number,
  page: SafeHtml,
  extraHeaders: Record<string, string> = {}
) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    ...SECURITY_HEADERS,
    ...extraHeaders,
  })
  res.end(page.value)
}

function redirect(
  res: ServerResponse,
  location: string,
  extraHeaders: Record<string, string | string[]> = {}
) {
  res.writeHead(303, { Location: location, 'Cache-Control': 'no-store', ...extraHeaders })
  res.end()
}

/** Blocks cross-site form posts: the Origin (or Referer) must be this site. */
function isSameOrigin(req: IncomingMessage) {
  const source = req.headers.origin ?? req.headers.referer
  if (!source) return false
  try {
    const host = new URL(source).host
    return host === req.headers.host || host === new URL(config.publicUrl).host
  } catch {
    return false
  }
}

function clientIp(req: IncomingMessage) {
  const forwarded = req.headers['x-forwarded-for']
  return (
    (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : undefined) ??
    req.socket.remoteAddress ??
    'unknown'
  )
}

async function serveStatic(ctx: Context) {
  const path = ctx.url.pathname
  let body = staticCache.get(path)
  if (!body) {
    body = await readFile(join(PUBLIC_DIR, path.slice(1)))
    staticCache.set(path, body)
  }
  ctx.res.writeHead(200, {
    'Content-Type': STATIC_TYPES[extname(path)] ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  })
  ctx.res.end(body)
}

function requireUser(ctx: Context): User | undefined {
  if (!ctx.user) {
    redirect(ctx.res, `/sign-in?next=${encodeURIComponent(ctx.url.pathname)}`)
    return undefined
  }
  return ctx.user
}

function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'
}

async function route(ctx: Context) {
  const { req, res, url } = ctx
  const method = req.method ?? 'GET'
  const path = url.pathname.replace(/\/+$/, '') || '/'

  if (method === 'GET' && STATIC_FILES.has(path)) return serveStatic(ctx)
  if (method === 'GET' && path === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end('{"ok":true}')
  }

  if (method === 'POST' && !isSameOrigin(req)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' })
    return res.end('Cross-site request blocked')
  }

  if (method === 'GET' && path === '/') return send(res, 200, landingPage(ctx.user))
  if (method === 'GET' && (path === '/terms' || path === '/privacy')) {
    return send(res, 200, legalPage(path === '/terms' ? 'terms' : 'privacy', ctx.user))
  }

  if (path === '/sign-up') {
    if (ctx.user) return redirect(res, '/dashboard')
    if (method === 'GET') return send(res, 200, signUpPage())
    if (method === 'POST') {
      const form = await readForm(req)
      if (isRateLimited(`sign-up:${clientIp(req)}`, 10)) {
        return send(
          res,
          429,
          signUpPage('Too many attempts. Wait a few minutes, then try again.', form)
        )
      }
      try {
        const user = await signUp(form)
        const token = await createSession(user.id)
        return redirect(res, '/projects/new', {
          'Set-Cookie': sessionCookie(token, SESSION_MAX_AGE),
        })
      } catch (error) {
        if (error instanceof AuthError) return send(res, 400, signUpPage(error.message, form))
        throw error
      }
    }
  }

  if (path === '/sign-in') {
    if (ctx.user) return redirect(res, '/dashboard')
    if (method === 'GET') return send(res, 200, signInPage())
    if (method === 'POST') {
      const form = await readForm(req)
      if (isRateLimited(`sign-in:${clientIp(req)}`, 20)) {
        return send(
          res,
          429,
          signInPage('Too many attempts. Wait a few minutes, then try again.', form)
        )
      }
      try {
        const user = await signIn(form)
        const token = await createSession(user.id)
        const next = safeNext(
          new URL(req.headers.referer ?? config.publicUrl).searchParams.get('next')
        )
        return redirect(res, next, { 'Set-Cookie': sessionCookie(token, SESSION_MAX_AGE) })
      } catch (error) {
        if (error instanceof AuthError) return send(res, 401, signInPage(error.message, form))
        throw error
      }
    }
  }

  if (method === 'POST' && path === '/sign-out') {
    await destroySession(ctx.token)
    return redirect(res, '/', { 'Set-Cookie': sessionCookie('', 0) })
  }

  if (method === 'GET' && path === '/dashboard') {
    const user = requireUser(ctx)
    if (!user) return
    const notice = url.searchParams.get('deleted') ? 'Project deleted.' : undefined
    return send(res, 200, dashboardPage(user, await listProjects(user.id), notice))
  }

  if (method === 'GET' && path === '/projects/new') {
    const user = requireUser(ctx)
    if (!user) return
    return send(res, 200, newProjectPage(user, isMongoAvailable()))
  }

  if (method === 'POST' && path === '/projects') {
    const user = requireUser(ctx)
    if (!user) return
    const form = await readForm(req)
    try {
      const project = await createProject(user.id, form)
      return redirect(res, `/projects/${project.ref}?created=1`)
    } catch (error) {
      if (error instanceof ProjectError) {
        return send(res, 400, newProjectPage(user, isMongoAvailable(), error.message, form))
      }
      throw error
    }
  }

  const projectMatch = path.match(/^\/projects\/([a-z0-9]{16})(\/reset-password|\/delete)?$/)
  if (projectMatch) {
    const user = requireUser(ctx)
    if (!user) return
    const [, ref, action] = projectMatch
    const project = await getProject(user.id, ref)
    if (!project) return send(res, 404, notFoundPage(user))

    if (method === 'GET' && !action) {
      const notice = url.searchParams.get('created')
        ? 'Project created. Copy the connection string into your app.'
        : url.searchParams.get('rotated')
          ? 'Password rotated. Update your apps with the new connection string.'
          : undefined
      const connection = project.status === 'active' ? getConnectionString(project) : undefined
      return send(res, 200, projectPage(user, project, connection, { notice }))
    }
    if (method === 'POST' && action === '/reset-password') {
      await resetProjectPassword(user.id, ref)
      return redirect(res, `/projects/${ref}?rotated=1`)
    }
    if (method === 'POST' && action === '/delete') {
      await deleteProject(user.id, ref)
      return redirect(res, '/dashboard?deleted=1')
    }
  }

  return send(res, 404, notFoundPage(ctx.user))
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE]
  const ctx: Context = { req, res, url, token }
  try {
    const isStatic = STATIC_FILES.has(url.pathname)
    if (!isStatic) ctx.user = await getSessionUser(token)
    await route(ctx)
  } catch (error) {
    console.error(error)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Something went wrong. Try again in a moment.')
    }
  }
})

await migrate()
await hardenPostgresCluster()
server.listen(config.port, () => {
  console.log(`NicerBase Cloud listening on http://localhost:${config.port}`)
})
