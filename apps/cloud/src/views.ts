import type { User } from './auth.js'
import { html, SafeHtml } from './html.js'
import { icon, IconName } from './icons.js'
import type { Project } from './projects.js'

export type ProjectTab = 'overview' | 'tables' | 'sql' | 'collections'

export function projectTabs(project: Project, active: ProjectTab) {
  const base = `/projects/${project.ref}`
  const tabs: Array<[ProjectTab, string, string, IconName]> =
    project.engine === 'postgres'
      ? [
          ['overview', 'Overview', base, 'home'],
          ['tables', 'Tables', `${base}/tables`, 'table'],
          ['sql', 'SQL editor', `${base}/sql`, 'terminal'],
        ]
      : [
          ['overview', 'Overview', base, 'home'],
          ['collections', 'Collections', `${base}/collections`, 'folder'],
        ]
  return html`<nav class="tabs" aria-label="Project sections">
    ${tabs.map(
      ([key, label, href, iconName]) =>
        html`<a
          href="${href}"
          class="${key === active ? 'tab tab-active' : 'tab'}"
          ${key === active ? html`aria-current="page"` : ''}
          >${icon(iconName, 17)}${label}</a
        >`
    )}
  </nav>`
}

type LayoutOptions = { title: string; user?: User; description?: string }

function documentHead(title: string, description?: string) {
  const pageTitle = title === 'NicerBase' ? title : `${title} | NicerBase`
  return html`<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${pageTitle}</title>
    <meta
      name="description"
      content="${description ?? 'Postgres and MongoDB backends, provisioned in seconds.'}"
    />
    <meta name="theme-color" content="#f4f1f6" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0e0a10" media="(prefers-color-scheme: dark)" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="icon" type="image/svg+xml" href="/mark.svg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="stylesheet" href="/styles.css" />
  </head>`
}

/** Public pages (landing, auth, legal): top navigation bar. */
export function layout({ title, user, description }: LayoutOptions, body: SafeHtml) {
  return html`<!doctype html>
    <html lang="en">
      ${documentHead(title, description)}
      <body>
        <header class="nav">
          <div class="container nav-inner">
            <a class="nav-logo" href="${user ? '/dashboard' : '/'}" aria-label="NicerBase home"
              ><img src="/logo.svg" alt="NicerBase" width="126" height="30"
            /></a>
            <nav class="nav-links">
              ${user
                ? html`<a class="btn btn-primary btn-small" href="/dashboard">Open dashboard</a>`
                : html`<a class="hide-sm" href="/#engines">Databases</a>
                    <a class="hide-sm" href="/#pricing">Pricing</a>
                    <a href="/sign-in">Sign in</a>
                    <a class="btn btn-primary btn-small" href="/sign-up">Start free</a>`}
            </nav>
          </div>
        </header>
        <main>${body}</main>
        <footer class="footer">
          <div class="container footer-inner">
            <img src="/mark.svg" alt="" width="22" height="22" />
            <span>© ${new Date().getFullYear()} NicerBase</span>
            <nav><a href="/terms">Terms</a><a href="/privacy">Privacy</a></nav>
          </div>
        </footer>
        <script src="/app.js" defer></script>
      </body>
    </html>`
}

export type AppSection = 'home' | 'projects' | 'new' | 'account'

const NAV_ITEMS: Array<{ key: AppSection; label: string; href: string; icon: IconName }> = [
  { key: 'home', label: 'Home', href: '/dashboard', icon: 'home' },
  { key: 'projects', label: 'Projects', href: '/projects', icon: 'projects' },
  { key: 'new', label: 'New', href: '/projects/new', icon: 'plus' },
  { key: 'account', label: 'Account', href: '/account', icon: 'account' },
]

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}

/** Signed-in pages: logo top bar, rounded sidebar rail (tab bar on phones), content. */
export function appLayout(
  { title, user, active }: { title: string; user: User; active: AppSection },
  body: SafeHtml
) {
  return html`<!doctype html>
    <html lang="en">
      ${documentHead(title)}
      <body>
        <div class="app">
          <header class="topbar">
            <a class="brand" href="/dashboard" aria-label="NicerBase home"
              ><img src="/logo.svg" alt="NicerBase" width="126" height="30"
            /></a>
            <a class="user-chip" href="/account" aria-label="Account settings">
              <span class="avatar" aria-hidden="true">${initials(user.name)}</span>
              <span class="who"><strong>${user.name}</strong><span>${user.email}</span></span>
            </a>
          </header>
          <aside class="sidebar">
            <nav class="sidebar-panel" aria-label="Main">
              ${NAV_ITEMS.map(
                (item) =>
                  html`<a
                    class="nav-item"
                    href="${item.href}"
                    ${item.key === active ? html`aria-current="page"` : ''}
                    ><span class="tile">${icon(item.icon, 24)}</span>${item.label}</a
                  >`
              )}
              <div class="sidebar-spacer"></div>
              <form method="post" action="/sign-out">
                <button class="nav-item" type="submit">
                  <span class="tile">${icon('signOut', 24)}</span>Sign out
                </button>
              </form>
            </nav>
          </aside>
          <main class="main"><div class="main-inner">${body}</div></main>
        </div>
        <script src="/app.js" defer></script>
      </body>
    </html>`
}

export function landingPage(user?: User) {
  return layout(
    { title: 'NicerBase', user },
    html` <section class="hero">
        <div class="container">
          <img class="hero-mark" src="/mark.svg" alt="" width="84" height="84" />
          <div><span class="pill">Postgres and MongoDB, one console</span></div>
          <h1>Your backend, <span class="accent">nicer</span>.</h1>
          <p>
            Create a dedicated Postgres or MongoDB database in seconds, connect it to the app you're
            building, and manage everything from one place.
          </p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="${user ? '/projects/new' : '/sign-up'}"
              >Create a project</a
            >
            <a class="btn" href="#engines">Compare databases</a>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="grid">
            <div class="card">
              <div class="icon-tile tile-pink">${icon('account')}</div>
              <h3>Sign up</h3>
              <p>
                Create an account with your email. No card required while pricing is in preview.
              </p>
            </div>
            <div class="card">
              <div class="icon-tile tile-orange">${icon('database')}</div>
              <h3>Pick an engine</h3>
              <p>
                Choose Postgres for relational data or MongoDB for documents. Each project is
                isolated.
              </p>
            </div>
            <div class="card">
              <div class="icon-tile tile-plum">${icon('key')}</div>
              <h3>Connect your app</h3>
              <p>Copy the connection string into your app. Rotate credentials any time.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="section" id="engines">
        <div class="container">
          <h2>Two engines, one workflow</h2>
          <p class="section-lead">
            Every project gets its own database and its own credentials. Tenants never share access.
          </p>
          <div class="engines">
            <div class="card engine">
              <span class="engine-tag">Relational</span>
              <h3>Postgres</h3>
              <ul>
                <li>Dedicated database and login role</li>
                <li>Works with any Postgres driver or ORM</li>
                <li>Browse tables and run SQL in the console</li>
              </ul>
            </div>
            <div class="card engine">
              <span class="engine-tag">Document</span>
              <h3>MongoDB</h3>
              <ul>
                <li>Dedicated database and user</li>
                <li>Works with every official MongoDB driver</li>
                <li>Browse, filter and edit documents in the console</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section class="section" id="pricing">
        <div class="container">
          <div class="card" style="text-align:center;padding:40px">
            <h2>Pricing is in preview</h2>
            <p class="section-lead" style="margin:8px auto 24px;max-width:520px">
              Projects are free while we finalize plans. We'll email you before anything changes.
            </p>
            <a class="btn btn-primary" href="${user ? '/projects/new' : '/sign-up'}"
              >Start building</a
            >
          </div>
        </div>
      </section>`
  )
}

type AuthFormValues = { name?: string; email?: string }

export function signUpPage(error?: string, values: AuthFormValues = {}) {
  return layout(
    { title: 'Sign Up' },
    html` <section class="auth">
      <div class="glass auth-card">
        <img src="/mark.svg" alt="" width="44" height="44" />
        <h1>Create your account</h1>
        <p class="sub">Start with a free Postgres or MongoDB project.</p>
        ${error ? html`<div class="alert alert-error" role="alert">${error}</div>` : ''}
        <form method="post" action="/sign-up" novalidate>
          <div class="field">
            <label for="name">Name</label
            ><input
              id="name"
              name="name"
              type="text"
              autocomplete="name"
              required
              value="${values.name ?? ''}"
            />
          </div>
          <div class="field">
            <label for="email">Email</label
            ><input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              value="${values.email ?? ''}"
            />
          </div>
          <div class="field">
            <label for="password">Password</label
            ><input
              id="password"
              name="password"
              type="password"
              autocomplete="new-password"
              minlength="10"
              required
            /><span class="hint">At least 10 characters.</span>
          </div>
          <button class="btn btn-primary" type="submit" style="width:100%">Sign up</button>
        </form>
        <p class="switch">Already have an account? <a href="/sign-in">Sign in</a></p>
        <p class="switch hint">
          By signing up you agree to the <a href="/terms">Terms</a> and
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    </section>`
  )
}

export function signInPage(error?: string, values: AuthFormValues = {}, notice?: string) {
  return layout(
    { title: 'Sign In' },
    html` <section class="auth">
      <div class="glass auth-card">
        <img src="/mark.svg" alt="" width="44" height="44" />
        <h1>Welcome back</h1>
        <p class="sub">Sign in to manage your projects.</p>
        ${notice ? html`<div class="alert alert-ok" role="status">${notice}</div>` : ''}
        ${error ? html`<div class="alert alert-error" role="alert">${error}</div>` : ''}
        <form method="post" action="/sign-in" novalidate>
          <div class="field">
            <label for="email">Email</label
            ><input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              value="${values.email ?? ''}"
            />
          </div>
          <div class="field">
            <label for="password">Password</label
            ><input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
            />
          </div>
          <p class="forgot"><a href="/forgot-password">Forgot password?</a></p>
          <button class="btn btn-primary" type="submit" style="width:100%">Sign in</button>
        </form>
        <p class="switch">New to NicerBase? <a href="/sign-up">Create an account</a></p>
      </div>
    </section>`
  )
}

const ENGINE_LABEL = { postgres: 'Postgres', mongodb: 'MongoDB' } as const

export function engineTile(engine: Project['engine'], size: 'md' | 'sm' = 'md') {
  const isPostgres = engine === 'postgres'
  return html`<span
    class="icon-tile ${isPostgres ? 'tile-pink' : 'tile-orange'}"
    ${size === 'sm' ? html`style="width:40px;height:40px;border-radius:12px"` : ''}
    >${icon(isPostgres ? 'database' : 'leaf', size === 'sm' ? 20 : 24)}</span
  >`
}

export function statusBadge(status: Project['status']) {
  const className =
    status === 'active'
      ? 'badge badge-active'
      : status === 'failed'
        ? 'badge badge-failed'
        : 'badge badge-warn'
  const label = {
    active: 'Active',
    failed: 'Failed',
    provisioning: 'Provisioning',
    deleting: 'Deleting',
  }[status]
  return html`<span class="${className}">${label}</span>`
}

function relativeDate(date: Date) {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  return date.toISOString().slice(0, 10)
}

function projectRow(p: Project) {
  return html`<li>
    <a class="list-row" href="/projects/${p.ref}">
      ${engineTile(p.engine, 'sm')}
      <span class="meta"
        ><strong>${p.name}</strong
        ><span>${ENGINE_LABEL[p.engine]} · <span class="mono">${p.ref}</span></span></span
      >
      ${statusBadge(p.status)}
      <span class="chev">${icon('chevron', 18)}</span>
    </a>
  </li>`
}

function emptyProjects() {
  return html`<div class="empty">
    <span class="icon-tile tile-pink">${icon('database')}</span>
    <h3>No projects yet</h3>
    <p>Create a Postgres or MongoDB project to get a connection string for your app.</p>
    <p style="margin-top:16px">
      <a class="btn btn-primary" href="/projects/new">Create a project</a>
    </p>
  </div>`
}

function alerts(options: { notice?: string; banner?: SafeHtml; error?: string }) {
  return html`${options.banner ?? ''}
  ${options.notice ? html`<div class="alert alert-ok" role="status">${options.notice}</div>` : ''}
  ${options.error ? html`<div class="alert alert-error" role="alert">${options.error}</div>` : ''}`
}

export function dashboardPage(
  user: User,
  projects: Project[],
  options: { notice?: string; banner?: SafeHtml; maxProjects: number }
) {
  const firstName = user.name.split(/\s+/)[0]
  const postgres = projects.filter((p) => p.engine === 'postgres').length
  const mongodb = projects.filter((p) => p.engine === 'mongodb').length
  const active = projects.filter((p) => p.status === 'active').length
  const recent = [...projects]
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .slice(0, 4)

  const stat = (label: string, value: number, caption: string, iconName: IconName, tile: string) =>
    html`<div class="glass stat">
      <span class="icon-tile ${tile}">${icon(iconName)}</span>
      <div class="label">${label}</div>
      <div class="value">${value}</div>
      <div class="caption">${caption}</div>
    </div>`

  return appLayout(
    { title: 'Home', user, active: 'home' },
    html`<div class="greeting">
        <h1 data-greeting data-name="${firstName}">Welcome back, ${firstName}</h1>
        <p>Here's what's happening with your projects today.</p>
      </div>
      ${alerts(options)}
      <section class="stats" aria-label="Summary">
        ${stat(
          'Projects',
          projects.length,
          `${options.maxProjects - projects.length} more available`,
          'projects',
          'tile-pink'
        )}
        ${stat('Postgres', postgres, 'Relational databases', 'database', 'tile-rose')}
        ${stat('MongoDB', mongodb, 'Document databases', 'leaf', 'tile-orange')}
        ${stat(
          'Active',
          active,
          active === projects.length ? 'All projects healthy' : 'Some need attention',
          'check',
          'tile-plum'
        )}
      </section>

      <div class="dash-grid">
        <div class="stack">
          <section class="glass card">
            <div class="card-head">
              <h2>Your projects</h2>
              <a class="link" href="/projects">View all ${icon('arrow', 16)}</a>
            </div>
            ${projects.length === 0
              ? emptyProjects()
              : html`<ul class="list">
                  ${projects.slice(0, 6).map(projectRow)}
                </ul>`}
          </section>

          <section class="glass card">
            <div class="card-head"><h2>Recent activity</h2></div>
            ${recent.length === 0
              ? html`<p class="hint">Activity shows up here once you create a project.</p>`
              : html`<ul class="list">
                  ${recent.map(
                    (p) =>
                      html`<li>
                        <div class="list-row">
                          <span
                            class="icon-tile tile-plum"
                            style="width:40px;height:40px;border-radius:12px"
                            >${icon('clock', 20)}</span
                          >
                          <span class="meta"
                            ><strong>Created ${p.name}</strong
                            ><span
                              >${ENGINE_LABEL[p.engine]} · ${relativeDate(p.created_at)}</span
                            ></span
                          >
                          ${statusBadge(p.status)}
                        </div>
                      </li>`
                  )}
                </ul>`}
          </section>
        </div>

        <div class="stack">
          <section class="glass card">
            <div class="card-head"><h2>Quick start</h2></div>
            <div class="quick-actions">
              <a class="quick" href="/projects/new?engine=postgres">
                <span class="icon-tile tile-pink">${icon('database', 20)}</span>
                <span><strong>New Postgres project</strong><span>Tables, SQL and joins</span></span>
              </a>
              <a class="quick" href="/projects/new?engine=mongodb">
                <span class="icon-tile tile-orange">${icon('leaf', 20)}</span>
                <span
                  ><strong>New MongoDB project</strong
                  ><span>Collections of JSON documents</span></span
                >
              </a>
            </div>
          </section>

          <section class="glass card">
            <div class="row" style="gap:14px">
              <span class="avatar" style="width:52px;height:52px;font-size:18px" aria-hidden="true"
                >${initials(user.name)}</span
              >
              <span class="meta" style="display:flex;flex-direction:column;min-width:0"
                ><strong style="font-size:17px">${user.name}</strong
                ><span class="hint" style="overflow:hidden;text-overflow:ellipsis"
                  >${user.email}</span
                ></span
              >
            </div>
            <div class="kv">
              <div><strong>${projects.length}</strong><span>Projects</span></div>
              <div><strong>${postgres}</strong><span>Postgres</span></div>
              <div><strong>${mongodb}</strong><span>MongoDB</span></div>
            </div>
            <a class="btn btn-dark btn-block" style="margin-top:16px" href="/account"
              >${icon('account', 18)} Manage account</a
            >
          </section>
        </div>
      </div>`
  )
}

export function projectsPage(user: User, projects: Project[]) {
  return appLayout(
    { title: 'Projects', user, active: 'projects' },
    html`<div class="page-head">
        <div>
          <h1>Projects</h1>
          <p class="hint" style="margin:4px 0 0">
            Each project is an isolated database with its own credentials.
          </p>
        </div>
        <div class="actions">
          <a class="btn btn-primary" href="/projects/new">${icon('plus', 18)} New project</a>
        </div>
      </div>
      <section class="glass card">
        ${projects.length === 0
          ? emptyProjects()
          : html`<ul class="list">
              ${projects.map(projectRow)}
            </ul>`}
      </section>`
  )
}

export function newProjectPage(
  user: User,
  isMongoAvailable: boolean,
  error?: string,
  values: { name?: string; engine?: string } = {}
) {
  const engine = values.engine === 'mongodb' && isMongoAvailable ? 'mongodb' : 'postgres'
  return appLayout(
    { title: 'New Project', user, active: 'new' },
    html`<div style="max-width:720px">
      <div class="page-head"><h1>New project</h1></div>
      ${error ? html`<div class="alert alert-error" role="alert">${error}</div>` : ''}
      <form method="post" action="/projects" class="glass card" novalidate>
        <div class="field">
          <label for="name">Project name</label>
          <input
            id="name"
            name="name"
            type="text"
            maxlength="60"
            required
            placeholder="my-app"
            value="${values.name ?? ''}"
          />
          <span class="hint">Only you can see this name. You can't change the engine later.</span>
        </div>
        <label style="display:block;margin-bottom:8px">Database engine</label>
        <div class="choices">
          <label class="choice">
            <input
              type="radio"
              name="engine"
              value="postgres"
              ${engine === 'postgres' ? html`checked` : ''}
            />
            <div class="card">
              ${engineTile('postgres')}
              <strong>Postgres</strong>
              <p class="hint" style="margin-top:4px">
                Relational tables, SQL, joins and transactions.
              </p>
            </div>
          </label>
          <label class="choice">
            <input
              type="radio"
              name="engine"
              value="mongodb"
              ${engine === 'mongodb' ? html`checked` : ''}
              ${isMongoAvailable ? '' : html`disabled`}
            />
            <div class="card">
              ${engineTile('mongodb')}
              <strong>MongoDB</strong>
              <p class="hint" style="margin-top:4px">
                ${isMongoAvailable
                  ? 'Flexible JSON documents and collections.'
                  : 'Not enabled on this instance.'}
              </p>
            </div>
          </label>
        </div>
        <button class="btn btn-primary" type="submit">Create project</button>
      </form>
    </div>`
  )
}

/** Header shared by every project page: back link, engine tile, name, status and tabs. */
export function projectHeader(project: Project, active: ProjectTab) {
  return html`<a class="crumb" href="/projects">${icon('back', 16)} Projects</a>
    <div class="page-head">
      <div class="project-title">
        ${engineTile(project.engine)}
        <div>
          <h1>${project.name}</h1>
          <div class="row" style="margin-top:4px">
            <span class="hint">${ENGINE_LABEL[project.engine]}</span>${statusBadge(project.status)}
          </div>
        </div>
      </div>
    </div>
    ${project.status === 'active' ? projectTabs(project, active) : ''}`
}

function snippet(project: Project) {
  if (project.engine === 'postgres') {
    return `// npm install pg
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
const { rows } = await client.query('select now()')
console.log(rows)`
  }
  return `// npm install mongodb
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URL)
const db = client.db('${project.database_name}')
await db.collection('todos').insertOne({ title: 'Ship it', done: false })
console.log(await db.collection('todos').find().toArray())`
}

export function projectPage(
  user: User,
  project: Project,
  connection: string | undefined,
  options: { notice?: string; error?: string; caFile?: string }
) {
  const masked = connection?.replace(/:([^:@/]+)@/, ':••••••••@')
  const envName = project.engine === 'postgres' ? 'DATABASE_URL' : 'MONGODB_URL'
  return appLayout(
    { title: project.name, user, active: 'projects' },
    html`${projectHeader(project, 'overview')} ${alerts(options)}
      ${project.status === 'failed'
        ? html`<div class="alert alert-error" role="alert">
            Provisioning failed: ${project.error ?? 'unknown error'}. Delete this project and create
            it again.
          </div>`
        : ''}
      <div class="dash-grid">
        <div class="stack">
          <section class="glass card">
            <div class="card-head"><h2>Connect your app</h2></div>
            <p class="hint" style="margin-bottom:12px">
              Add this to your app's environment as <code>${envName}</code>. Keep it secret.
            </p>
            ${connection
              ? html`<div class="secret">
                  <code
                    id="conn"
                    data-hidden="true"
                    data-value="${connection}"
                    data-masked="${masked}"
                    >${masked}</code
                  >
                  <button class="btn btn-small" type="button" data-reveal="conn">Reveal</button>
                  <button class="btn btn-small btn-primary" type="button" data-copy="${connection}">
                    Copy
                  </button>
                </div>`
              : html`<p class="hint">Available once the project is active.</p>`}
            ${connection && options.caFile
              ? html`<p class="hint" style="margin:12px 0 0">
                  ${icon('shield', 16)} Connections are encrypted and verified against the NicerBase
                  certificate.
                  <a class="link" href="/${options.caFile}" download>Download ${options.caFile}</a>
                  and save it in your app's working directory.
                </p>`
              : ''}
          </section>
          <section class="glass card">
            <div class="card-head"><h2>Quick start</h2></div>
            <pre><code>${snippet(project)}</code></pre>
          </section>
        </div>
        <div class="stack">
          <section class="glass card">
            <div class="card-head"><h2>Details</h2></div>
            <dl class="meta">
              <dt>Project ref</dt>
              <dd class="mono">${project.ref}</dd>
              <dt>Database</dt>
              <dd class="mono">${project.database_name}</dd>
              <dt>User</dt>
              <dd class="mono">${project.username}</dd>
              <dt>Created</dt>
              <dd>${project.created_at.toISOString().slice(0, 10)}</dd>
            </dl>
          </section>
          ${project.status === 'active'
            ? html`<section class="glass card">
                <h3>Rotate password</h3>
                <p class="hint" style="margin-bottom:12px">
                  Apps using the old connection string lose access until you update them.
                </p>
                <form
                  method="post"
                  action="/projects/${project.ref}/reset-password"
                  data-confirm="Rotate the password? Apps using the current connection string will be disconnected."
                >
                  <button class="btn btn-block" type="submit">
                    ${icon('key', 18)} Rotate password
                  </button>
                </form>
              </section>`
            : ''}
          <section class="glass card danger-zone">
            <h3>Delete project</h3>
            <p class="hint" style="margin-bottom:12px">
              Permanently deletes the database and all of its data.
            </p>
            <form
              method="post"
              action="/projects/${project.ref}/delete"
              data-confirm="Delete ${project.name} and all of its data? This can't be undone."
            >
              <button class="btn btn-danger btn-block" type="submit">Delete project</button>
            </form>
          </section>
        </div>
      </div>`
  )
}

export function legalPage(kind: 'terms' | 'privacy', user?: User) {
  const isTerms = kind === 'terms'
  return layout(
    { title: isTerms ? 'Terms of Service' : 'Privacy Policy', user },
    html` <section class="page">
      <div class="container prose glass card" style="padding:32px">
        <h1>${isTerms ? 'Terms of Service' : 'Privacy Policy'}</h1>
        <div class="alert alert-error">
          Draft template. Have a lawyer review and replace this page before you accept paying
          customers.
        </div>
        ${isTerms
          ? html` <h2>1. The service</h2>
              <p>
                NicerBase provides hosted Postgres and MongoDB databases ("Projects") that you
                manage through this console.
              </p>
              <h2>2. Your account</h2>
              <p>
                You're responsible for activity under your account and for keeping your password and
                connection strings secret.
              </p>
              <h2>3. Your data</h2>
              <p>
                You own the data you store in your Projects. We access it only to operate, secure
                and support the service, or when required by law.
              </p>
              <h2>4. Acceptable use</h2>
              <p>
                Don't use NicerBase to break the law, attack other systems, or store content you
                don't have the right to store.
              </p>
              <h2>5. Availability</h2>
              <p>
                During the preview the service is provided as is, without uptime guarantees. Back up
                anything you can't afford to lose.
              </p>
              <h2>6. Pricing</h2>
              <p>
                Projects are free during the preview. We'll give you notice before introducing paid
                plans.
              </p>
              <h2>7. Ending service</h2>
              <p>
                You can delete your Projects at any time. We may suspend accounts that violate these
                terms.
              </p>`
          : html` <h2>What we collect</h2>
              <p>
                Your name, email address, a hash of your password, and basic request logs needed to
                run and secure the service.
              </p>
              <h2>How we use it</h2>
              <p>
                To provide your account and Projects, send service notices, and prevent abuse. We
                don't sell personal data.
              </p>
              <h2>Data in your Projects</h2>
              <p>
                Data you store in your databases belongs to you. We process it only to provide the
                service.
              </p>
              <h2>Cookies</h2>
              <p>We use one essential cookie to keep you signed in.</p>
              <h2>Your choices</h2>
              <p>Delete your Projects at any time. Contact us to delete your account.</p>`}
      </div>
    </section>`
  )
}

export function notFoundPage(user?: User) {
  return layout(
    { title: 'Page Not Found', user },
    html`<section class="auth">
      <div class="glass auth-card" style="text-align:center">
        <img src="/mark.svg" alt="" width="44" height="44" />
        <h1>Page not found</h1>
        <p class="sub">The page you're looking for doesn't exist or was moved.</p>
        <a class="btn btn-primary" href="${user ? '/dashboard' : '/'}">Go home</a>
      </div>
    </section>`
  )
}
