import type { User } from './auth.js'
import { html } from './html.js'
import { layout } from './views.js'

function authCard(title: string, sub: string, body: ReturnType<typeof html>) {
  return html`<section class="auth">
    <div class="auth-card">
      <img src="/mark.svg" alt="" width="44" height="44" />
      <h1>${title}</h1>
      <p class="sub">${sub}</p>
      ${body}
    </div>
  </section>`
}

export function forgotPasswordPage(
  options: { sent?: boolean; error?: string; email?: string } = {}
) {
  return layout(
    { title: 'Forgot Password' },
    authCard(
      'Reset your password',
      "Enter your account email and we'll send you a link to choose a new password.",
      options.sent
        ? html`<div class="alert alert-ok" role="status">
              If an account exists for that email, a reset link is on its way. It expires in 1 hour.
            </div>
            <p class="switch"><a href="/sign-in">Back to sign in</a></p>`
        : html`${options.error
              ? html`<div class="alert alert-error" role="alert">${options.error}</div>`
              : ''}
            <form method="post" action="/forgot-password" novalidate>
              <div class="field">
                <label for="email">Email</label
                ><input
                  id="email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  required
                  value="${options.email ?? ''}"
                />
              </div>
              <button class="btn btn-primary" type="submit" style="width:100%">
                Send reset link
              </button>
            </form>
            <p class="switch"><a href="/sign-in">Back to sign in</a></p>`
    )
  )
}

export function resetPasswordPage(
  token: string,
  options: { error?: string; invalid?: boolean } = {}
) {
  return layout(
    { title: 'Reset Password' },
    authCard(
      'Choose a new password',
      'Signing in with the new password signs you out on every other device.',
      options.invalid
        ? html`<div class="alert alert-error" role="alert">
              This reset link is invalid or has expired.
            </div>
            <a class="btn btn-primary" href="/forgot-password" style="width:100%"
              >Request a new link</a
            >`
        : html`${options.error
              ? html`<div class="alert alert-error" role="alert">${options.error}</div>`
              : ''}
            <form method="post" action="/reset-password" novalidate>
              <input type="hidden" name="token" value="${token}" />
              <div class="field">
                <label for="password">New password</label
                ><input
                  id="password"
                  name="password"
                  type="password"
                  autocomplete="new-password"
                  minlength="10"
                  required
                /><span class="hint">At least 10 characters.</span>
              </div>
              <button class="btn btn-primary" type="submit" style="width:100%">
                Update password
              </button>
            </form>`
    )
  )
}

export function verifyResultPage(isVerified: boolean, user?: User) {
  return layout(
    { title: 'Verify Email', user },
    authCard(
      isVerified ? 'Email confirmed' : 'Link expired',
      isVerified
        ? 'Your email is confirmed. You can create projects now.'
        : 'This confirmation link is invalid or has expired. Sign in and send a new one from your dashboard.',
      html`<a class="btn btn-primary" href="${user ? '/dashboard' : '/sign-in'}" style="width:100%"
        >${user ? 'Go to projects' : 'Sign in'}</a
      >`
    )
  )
}

export function verifyBanner(isEmailConfigured: boolean) {
  return html`<div class="alert alert-warn" role="status">
    <div class="row" style="flex-wrap:wrap">
      <span
        >Confirm your email to create projects.
        ${isEmailConfigured
          ? 'Check your inbox for the link.'
          : 'Email is not configured on this server; the link is in the server log.'}</span
      >
      <form method="post" action="/verify-email/resend" style="margin:0 0 0 auto">
        <button class="btn btn-small" type="submit">Resend email</button>
      </form>
    </div>
  </div>`
}

export function accountPage(
  user: User,
  options: { isVerified: boolean; notice?: string; passwordError?: string; deleteError?: string }
) {
  return layout(
    { title: 'Account', user },
    html`<section class="page">
      <div class="container" style="max-width:720px">
        <a class="crumb" href="/dashboard">← Projects</a>
        <div class="page-head"><h1>Account</h1></div>
        ${options.notice
          ? html`<div class="alert alert-ok" role="status">${options.notice}</div>`
          : ''}
        <div class="stack">
          <div class="card">
            <h3 style="margin-top:0">Profile</h3>
            <dl class="meta">
              <dt>Name</dt>
              <dd>${user.name}</dd>
              <dt>Email</dt>
              <dd>
                ${user.email}
                ${options.isVerified
                  ? html`<span class="badge badge-active">Verified</span>`
                  : html`<span class="badge">Unverified</span>`}
              </dd>
            </dl>
          </div>

          <div class="card">
            <h3 style="margin-top:0">Change password</h3>
            <p class="hint" style="margin-bottom:12px">Signs you out on every other device.</p>
            ${options.passwordError
              ? html`<div class="alert alert-error" role="alert">${options.passwordError}</div>`
              : ''}
            <form method="post" action="/account/password" novalidate>
              <div class="field">
                <label for="current">Current password</label
                ><input
                  id="current"
                  name="current"
                  type="password"
                  autocomplete="current-password"
                  required
                />
              </div>
              <div class="field">
                <label for="next">New password</label
                ><input
                  id="next"
                  name="next"
                  type="password"
                  autocomplete="new-password"
                  minlength="10"
                  required
                /><span class="hint">At least 10 characters.</span>
              </div>
              <button class="btn" type="submit">Update password</button>
            </form>
          </div>

          <div class="card danger-zone">
            <h3 style="margin-top:0">Delete account</h3>
            <p class="hint" style="margin-bottom:12px">
              Permanently deletes your account, every project and all of their data. This can't be
              undone.
            </p>
            ${options.deleteError
              ? html`<div class="alert alert-error" role="alert">${options.deleteError}</div>`
              : ''}
            <form
              method="post"
              action="/account/delete"
              data-confirm="Delete your account and every project? This can't be undone."
            >
              <div class="field">
                <label for="confirm">Type <span class="mono">${user.email}</span> to confirm</label
                ><input id="confirm" name="confirm" type="text" autocomplete="off" required />
              </div>
              <button class="btn btn-danger" type="submit">Delete account</button>
            </form>
          </div>
        </div>
      </div>
    </section>`
  )
}
