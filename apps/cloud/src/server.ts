import { readFile } from 'node:fs/promises'
import { createServer, IncomingMessage, ServerResponse } from 'node:http'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  changePassword,
  deleteAccount,
  isEmailVerified,
  isResetTokenValid,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
} from './account.js'
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
import {
  browseCollection,
  browseTable,
  createCollection,
  DataError,
  deleteDocument,
  dropCollection,
  insertDocument,
  listCollections,
  listTables,
  runSql,
} from './data.js'
import { migrate } from './db.js'
import type { SafeHtml } from './html.js'
import { isEmailConfigured } from './mailer.js'
import {
  createProject,
  deleteProject,
  getConnectionString,
  getProject,
  listProjects,
  Project,
  ProjectError,
  resetProjectPassword,
} from './projects.js'
import {
  CA_FILE_NAME,
  hardenPostgresCluster,
  isMongoAvailable,
  needsCaDownload,
} from './provision.js'
import {
  accountPage,
  forgotPasswordPage,
  resetPasswordPage,
  verifyBanner,
  verifyResultPage,
} from './views-account.js'
import {
  collectionPage,
  collectionsPage,
  sqlPage,
  tableRowsPage,
  tablesPage,
} from './views-data.js'
import {
  dashboardPage,
  landingPage,
  legalPage,
  newProjectPage,
  notFoundPage,
  projectPage,
  projectsPage,
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

async function readForm(
  req: IncomingMessage,
  maxBytes = 16 * 1024
): Promise<Record<string, string>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) throw new Error('Request body too large')
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
  if (config.trustProxy && typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress ?? 'unknown'
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

/** Postgres-only and Mongo-only sections of a project. */
async function routeProjectData(ctx: Context, user: User, project: Project, rest: string) {
  const { req, res, url } = ctx
  const method = req.method ?? 'GET'
  const page = Math.max(0, Number(url.searchParams.get('page')) || 0)

  if (project.engine === 'postgres') {
    if (method === 'GET' && rest === '/tables') {
      return send(res, 200, tablesPage(user, project, await listTables(project)))
    }
    const tableMatch = rest.match(/^\/tables\/([^/]+)\/([^/]+)$/)
    if (method === 'GET' && tableMatch) {
      const schema = decodeURIComponent(tableMatch[1])
      const table = decodeURIComponent(tableMatch[2])
      try {
        const data = await browseTable(project, schema, table, page)
        return send(res, 200, tableRowsPage(user, project, schema, table, data, page))
      } catch (error) {
        if (error instanceof DataError) return send(res, 404, notFoundPage(user))
        throw error
      }
    }
    if (rest === '/sql') {
      if (method === 'GET') return send(res, 200, sqlPage(user, project, ''))
      if (method === 'POST') {
        const form = await readForm(req, 256 * 1024)
        const sql = form.sql ?? ''
        try {
          return send(res, 200, sqlPage(user, project, sql, await runSql(project, sql)))
        } catch (error) {
          return send(res, 400, sqlPage(user, project, sql, undefined, errorMessage(error)))
        }
      }
    }
  }

  if (project.engine === 'mongodb') {
    const base = `/projects/${project.ref}/collections`
    if (rest === '/collections') {
      if (method === 'GET') {
        const created = url.searchParams.get('created')
        const dropped = url.searchParams.get('dropped')
        const notice = created
          ? `Created collection ${created}.`
          : dropped
            ? `Deleted collection ${dropped}.`
            : undefined
        return send(
          res,
          200,
          collectionsPage(user, project, await listCollections(project), { notice })
        )
      }
      if (method === 'POST') {
        const form = await readForm(req)
        const name = (form.name ?? '').trim()
        try {
          await createCollection(project, name)
          return redirect(res, `${base}?created=${encodeURIComponent(name)}`)
        } catch (error) {
          return send(
            res,
            400,
            collectionsPage(user, project, await listCollections(project), {
              error: errorMessage(error),
            })
          )
        }
      }
    }
    const collectionMatch = rest.match(/^\/collections\/([^/]+)(\/insert|\/delete|\/drop)?$/)
    if (collectionMatch) {
      const name = decodeURIComponent(collectionMatch[1])
      const action = collectionMatch[2]
      const filter = url.searchParams.get('filter') ?? ''
      const collectionUrl = `${base}/${encodeURIComponent(name)}`
      const render = async (
        status: number,
        options: { notice?: string; error?: string; draft?: string }
      ) => {
        let data
        let error = options.error
        try {
          data = await browseCollection(project, name, filter, page)
        } catch (browseError) {
          error = error ?? errorMessage(browseError)
        }
        return send(
          res,
          status,
          collectionPage(user, project, name, data, { filter, page, ...options, error })
        )
      }

      if (method === 'GET' && !action) {
        const notice = url.searchParams.get('inserted')
          ? 'Document inserted.'
          : url.searchParams.get('deleted')
            ? 'Document deleted.'
            : undefined
        return render(200, { notice })
      }
      if (method === 'POST' && action === '/insert') {
        const form = await readForm(req, 256 * 1024)
        try {
          await insertDocument(project, name, form.document ?? '')
          return redirect(res, `${collectionUrl}?inserted=1`)
        } catch (error) {
          return render(400, { error: errorMessage(error), draft: form.document })
        }
      }
      if (method === 'POST' && action === '/delete') {
        const form = await readForm(req)
        await deleteDocument(project, name, form.id ?? '')
        return redirect(res, `${collectionUrl}?deleted=1`)
      }
      if (method === 'POST' && action === '/drop') {
        await dropCollection(project, name)
        return redirect(res, `${base}?dropped=${encodeURIComponent(name)}`)
      }
    }
  }

  return send(res, 404, notFoundPage(user))
}

async function route(ctx: Context) {
  const { req, res, url } = ctx
  const method = req.method ?? 'GET'
  const path = url.pathname.replace(/\/+$/, '') || '/'

  if (method === 'GET' && STATIC_FILES.has(path)) return serveStatic(ctx)
  if (method === 'GET' && path === `/${CA_FILE_NAME}` && config.dbCaFile) {
    res.writeHead(200, {
      'Content-Type': 'application/x-pem-file',
      'Content-Disposition': `attachment; filename="${CA_FILE_NAME}"`,
      'Cache-Control': 'no-cache',
    })
    return res.end(await readFile(config.dbCaFile))
  }
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
        await sendVerificationEmail(user)
        const token = await createSession(user.id)
        return redirect(res, '/dashboard', { 'Set-Cookie': sessionCookie(token, SESSION_MAX_AGE) })
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

  if (path === '/forgot-password') {
    if (method === 'GET') return send(res, 200, forgotPasswordPage())
    if (method === 'POST') {
      const form = await readForm(req)
      if (isRateLimited(`forgot:${clientIp(req)}`, 5)) {
        return send(
          res,
          429,
          forgotPasswordPage({
            error: 'Too many requests. Wait a few minutes, then try again.',
            email: form.email,
          })
        )
      }
      await requestPasswordReset(form.email ?? '')
      return send(res, 200, forgotPasswordPage({ sent: true }))
    }
  }

  if (path === '/reset-password') {
    if (method === 'GET') {
      const token = url.searchParams.get('token') ?? ''
      return send(
        res,
        200,
        resetPasswordPage(token, { invalid: !token || !(await isResetTokenValid(token)) })
      )
    }
    if (method === 'POST') {
      const form = await readForm(req)
      try {
        await resetPassword(form.token ?? '', form.password ?? '')
        return send(
          res,
          200,
          signInPage(undefined, {}, 'Password updated. Sign in with your new password.'),
          {
            'Set-Cookie': sessionCookie('', 0),
          }
        )
      } catch (error) {
        if (error instanceof AuthError)
          return send(res, 400, resetPasswordPage(form.token ?? '', { error: error.message }))
        throw error
      }
    }
  }

  if (method === 'GET' && path === '/verify-email') {
    const isVerified = await verifyEmail(url.searchParams.get('token') ?? '')
    return send(res, isVerified ? 200 : 400, verifyResultPage(isVerified, ctx.user))
  }

  if (method === 'POST' && path === '/verify-email/resend') {
    const user = requireUser(ctx)
    if (!user) return
    if (!isRateLimited(`verify:${user.id}`, 5)) await sendVerificationEmail(user)
    return redirect(res, '/dashboard?resent=1')
  }

  if (path === '/account' || path === '/account/password' || path === '/account/delete') {
    const user = requireUser(ctx)
    if (!user) return
    const isVerified = await isEmailVerified(user.id)
    if (method === 'GET' && path === '/account') {
      const notice = url.searchParams.get('password')
        ? 'Password updated. Other devices were signed out.'
        : undefined
      return send(res, 200, accountPage(user, { isVerified, notice }))
    }
    if (method === 'POST' && path === '/account/password') {
      const form = await readForm(req)
      try {
        await changePassword(user.id, ctx.token ?? '', form.current ?? '', form.next ?? '')
        return redirect(res, '/account?password=1')
      } catch (error) {
        if (error instanceof AuthError)
          return send(res, 400, accountPage(user, { isVerified, passwordError: error.message }))
        throw error
      }
    }
    if (method === 'POST' && path === '/account/delete') {
      const form = await readForm(req)
      try {
        await deleteAccount(user, form.confirm ?? '')
        return redirect(res, '/?account-deleted=1', { 'Set-Cookie': sessionCookie('', 0) })
      } catch (error) {
        if (error instanceof AuthError)
          return send(res, 400, accountPage(user, { isVerified, deleteError: error.message }))
        throw error
      }
    }
  }

  if (method === 'GET' && path === '/dashboard') {
    const user = requireUser(ctx)
    if (!user) return
    const notice = url.searchParams.get('deleted')
      ? 'Project deleted.'
      : url.searchParams.get('resent')
        ? 'Confirmation email sent.'
        : undefined
    const banner =
      config.requireEmailVerification && !(await isEmailVerified(user.id))
        ? verifyBanner(isEmailConfigured)
        : undefined
    return send(
      res,
      200,
      dashboardPage(user, await listProjects(user.id), {
        notice,
        banner,
        maxProjects: config.maxProjectsPerUser,
      })
    )
  }

  if (method === 'GET' && path === '/projects') {
    const user = requireUser(ctx)
    if (!user) return
    return send(res, 200, projectsPage(user, await listProjects(user.id)))
  }

  if (path === '/projects/new' || (method === 'POST' && path === '/projects')) {
    const user = requireUser(ctx)
    if (!user) return
    if (config.requireEmailVerification && !(await isEmailVerified(user.id))) {
      return redirect(res, '/dashboard')
    }
    if (method === 'GET') {
      const engine = url.searchParams.get('engine') ?? undefined
      return send(res, 200, newProjectPage(user, isMongoAvailable(), undefined, { engine }))
    }
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

  const projectMatch = path.match(/^\/projects\/([a-z0-9]{16})(\/.*)?$/)
  if (projectMatch) {
    const user = requireUser(ctx)
    if (!user) return
    const [, ref, rest = ''] = projectMatch
    const project = await getProject(user.id, ref)
    if (!project) return send(res, 404, notFoundPage(user))

    if (method === 'GET' && rest === '') {
      const notice = url.searchParams.get('created')
        ? 'Project created. Copy the connection string into your app.'
        : url.searchParams.get('rotated')
          ? 'Password rotated. Update your apps with the new connection string.'
          : undefined
      const connection = project.status === 'active' ? getConnectionString(project) : undefined
      return send(
        res,
        200,
        projectPage(user, project, connection, {
          notice,
          caFile: needsCaDownload() && config.dbCaFile ? CA_FILE_NAME : undefined,
        })
      )
    }
    if (method === 'POST' && rest === '/reset-password') {
      await resetProjectPassword(user.id, ref)
      return redirect(res, `/projects/${ref}?rotated=1`)
    }
    if (method === 'POST' && rest === '/delete') {
      await deleteProject(user.id, ref)
      return redirect(res, '/dashboard?deleted=1')
    }
    if (project.status !== 'active') return send(res, 404, notFoundPage(user))
    return routeProjectData(ctx, user, project, rest)
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
