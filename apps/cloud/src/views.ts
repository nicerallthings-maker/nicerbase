import type { User } from './auth.js'
import { html, SafeHtml } from './html.js'
import type { Project } from './projects.js'

type LayoutOptions = { title: string; user?: User; description?: string }

export function layout({ title, user, description }: LayoutOptions, body: SafeHtml) {
  const pageTitle = title === 'NicerBase' ? title : `${title} | NicerBase`
  return html`<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${pageTitle}</title>
        <meta
          name="description"
          content="${description ?? 'Postgres and MongoDB backends, provisioned in seconds.'}"
        />
        <meta name="theme-color" content="#ff2fb9" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/svg+xml" href="/mark.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <header class="nav">
          <div class="container nav-inner">
            <a class="nav-logo" href="${user ? '/dashboard' : '/'}" aria-label="NicerBase home"
              ><img src="/logo.svg" alt="NicerBase" width="126" height="30"
            /></a>
            <nav class="nav-links">
              ${user
                ? html`<a href="/dashboard">Projects</a>
                    <span class="hide-sm hint">${user.email}</span>
                    <form method="post" action="/sign-out" style="margin:0">
                      <button type="submit">Sign out</button>
                    </form>`
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

export function landingPage(user?: User) {
  return layout(
    { title: 'NicerBase', user },
    html` <section class="hero">
        <div class="container">
          <img class="hero-mark" src="/mark.svg" alt="" width="84" height="84" />
          <div><span class="pill">Postgres and MongoDB, one console</span></div>
          <h1>Your backend, <span class="gradient-text">nicer</span>.</h1>
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
              <div class="icon-badge">1</div>
              <h3>Sign up</h3>
              <p>
                Create an account with your email. No card required while pricing is in preview.
              </p>
            </div>
            <div class="card">
              <div class="icon-badge">2</div>
              <h3>Pick an engine</h3>
              <p>
                Choose Postgres for relational data or MongoDB for documents. Each project is
                isolated.
              </p>
            </div>
            <div class="card">
              <div class="icon-badge">3</div>
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
            <div class="engine">
              <span class="engine-tag">Relational</span>
              <h3>Postgres</h3>
              <ul>
                <li>Dedicated database and login role</li>
                <li>Works with any Postgres driver or ORM</li>
                <li>Rotate credentials from the console</li>
              </ul>
            </div>
            <div class="engine">
              <span class="engine-tag">Document</span>
              <h3>MongoDB</h3>
              <ul>
                <li>Dedicated database and user</li>
                <li>Works with every official MongoDB driver</li>
                <li>Rotate credentials from the console</li>
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
      <div class="auth-card">
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

export function signInPage(error?: string, values: AuthFormValues = {}) {
  return layout(
    { title: 'Sign In' },
    html` <section class="auth">
      <div class="auth-card">
        <img src="/mark.svg" alt="" width="44" height="44" />
        <h1>Welcome back</h1>
        <p class="sub">Sign in to manage your projects.</p>
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
          <button class="btn btn-primary" type="submit" style="width:100%">Sign in</button>
        </form>
        <p class="switch">New to NicerBase? <a href="/sign-up">Create an account</a></p>
      </div>
    </section>`
  )
}

const ENGINE_LABEL = { postgres: 'Postgres', mongodb: 'MongoDB' } as const

function statusBadge(status: Project['status']) {
  const className =
    status === 'active'
      ? 'badge badge-active'
      : status === 'failed'
        ? 'badge badge-failed'
        : 'badge'
  const label = {
    active: 'Active',
    failed: 'Failed',
    provisioning: 'Provisioning',
    deleting: 'Deleting',
  }[status]
  return html`<span class="${className}">${label}</span>`
}

export function dashboardPage(user: User, projects: Project[], notice?: string) {
  return layout(
    { title: 'Projects', user },
    html` <section class="page">
      <div class="container">
        <div class="page-head">
          <div>
            <h1>Projects</h1>
            <p class="hint" style="margin:4px 0 0">
              Each project is an isolated database with its own credentials.
            </p>
          </div>
          <div class="actions"><a class="btn btn-primary" href="/projects/new">New project</a></div>
        </div>
        ${notice ? html`<div class="alert alert-ok" role="status">${notice}</div>` : ''}
        ${projects.length === 0
          ? html`<div class="empty">
              <h3 style="margin-top:0">No projects yet</h3>
              <p>Create a Postgres or MongoDB project to get a connection string for your app.</p>
              <a class="btn btn-primary" href="/projects/new">Create a project</a>
            </div>`
          : html`<div class="grid">
              ${projects.map(
                (p) =>
                  html`<a class="card project-card" href="/projects/${p.ref}">
                    <div class="row">
                      <span class="engine-dot"></span
                      ><span class="hint">${ENGINE_LABEL[p.engine]}</span
                      ><span style="margin-left:auto">${statusBadge(p.status)}</span>
                    </div>
                    <h3>${p.name}</h3>
                    <p class="mono hint">${p.ref}</p>
                  </a>`
              )}
            </div>`}
      </div>
    </section>`
  )
}

export function newProjectPage(
  user: User,
  isMongoAvailable: boolean,
  error?: string,
  values: { name?: string; engine?: string } = {}
) {
  const engine = values.engine ?? 'postgres'
  return layout(
    { title: 'New Project', user },
    html` <section class="page">
      <div class="container" style="max-width:720px">
        <a class="crumb" href="/dashboard">← Projects</a>
        <div class="page-head"><h1>New project</h1></div>
        ${error ? html`<div class="alert alert-error" role="alert">${error}</div>` : ''}
        <form method="post" action="/projects" class="card" novalidate>
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
                <div class="row"><span class="engine-dot"></span><strong>Postgres</strong></div>
                <p class="hint" style="margin-top:8px">
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
                <div class="row"><span class="engine-dot"></span><strong>MongoDB</strong></div>
                <p class="hint" style="margin-top:8px">
                  ${isMongoAvailable
                    ? 'Flexible JSON documents and collections.'
                    : 'Not enabled on this instance.'}
                </p>
              </div>
            </label>
          </div>
          <button class="btn btn-primary" type="submit">Create project</button>
        </form>
      </div>
    </section>`
  )
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
  options: { notice?: string; error?: string }
) {
  const masked = connection?.replace(/:([^:@/]+)@/, ':••••••••@')
  const envName = project.engine === 'postgres' ? 'DATABASE_URL' : 'MONGODB_URL'
  return layout(
    { title: project.name, user },
    html` <section class="page">
      <div class="container" style="max-width:860px">
        <a class="crumb" href="/dashboard">← Projects</a>
        <div class="page-head">
          <div>
            <div class="row">
              <span class="engine-dot"></span
              ><span class="hint">${ENGINE_LABEL[project.engine]}</span>${statusBadge(
                project.status
              )}
            </div>
            <h1 style="margin-top:6px">${project.name}</h1>
          </div>
        </div>
        ${options.notice
          ? html`<div class="alert alert-ok" role="status">${options.notice}</div>`
          : ''}
        ${options.error
          ? html`<div class="alert alert-error" role="alert">${options.error}</div>`
          : ''}
        ${project.status === 'failed'
          ? html`<div class="alert alert-error" role="alert">
              Provisioning failed: ${project.error ?? 'unknown error'}. Delete this project and
              create it again.
            </div>`
          : ''}

        <div class="stack">
          <div class="card">
            <h3 style="margin-top:0">Connect your app</h3>
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
                  <button class="btn btn-small" type="button" data-copy="${connection}">
                    Copy
                  </button>
                </div>`
              : html`<p class="hint">Available once the project is active.</p>`}
          </div>

          <div class="card">
            <h3 style="margin-top:0">Quick start</h3>
            <pre><code>${snippet(project)}</code></pre>
          </div>

          <div class="card">
            <h3 style="margin-top:0">Details</h3>
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
          </div>

          ${project.status === 'active'
            ? html`<div class="card">
                <h3 style="margin-top:0">Rotate password</h3>
                <p class="hint" style="margin-bottom:12px">
                  Generates a new password. Apps using the old connection string lose access until
                  you update them.
                </p>
                <form
                  method="post"
                  action="/projects/${project.ref}/reset-password"
                  data-confirm="Rotate the password? Apps using the current connection string will be disconnected."
                >
                  <button class="btn" type="submit">Rotate password</button>
                </form>
              </div>`
            : ''}

          <div class="card danger-zone">
            <h3 style="margin-top:0">Delete project</h3>
            <p class="hint" style="margin-bottom:12px">
              Permanently deletes the database and all of its data. This can't be undone.
            </p>
            <form
              method="post"
              action="/projects/${project.ref}/delete"
              data-confirm="Delete ${project.name} and all of its data? This can't be undone."
            >
              <button class="btn btn-danger" type="submit">Delete project</button>
            </form>
          </div>
        </div>
      </div>
    </section>`
  )
}

export function legalPage(kind: 'terms' | 'privacy', user?: User) {
  const isTerms = kind === 'terms'
  return layout(
    { title: isTerms ? 'Terms of Service' : 'Privacy Policy', user },
    html` <section class="page">
      <div class="container prose">
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
      <div class="auth-card" style="text-align:center">
        <img src="/mark.svg" alt="" width="44" height="44" />
        <h1>Page not found</h1>
        <p class="sub">The page you're looking for doesn't exist or was moved.</p>
        <a class="btn btn-primary" href="${user ? '/dashboard' : '/'}">Go home</a>
      </div>
    </section>`
  )
}
