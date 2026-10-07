/** Runtime configuration, read once from the environment. */
function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable ${name}`)
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  /** Public URL of this console, used for cookie security and links. */
  publicUrl: process.env.NICERBASE_PUBLIC_URL ?? 'http://localhost:4000',
  /** 32+ character secret used to encrypt tenant credentials at rest. */
  secretKey: required('NICERBASE_SECRET_KEY'),
  /** Control-plane database (users, sessions, projects). Superuser on the tenant cluster. */
  controlDatabaseUrl: required('NICERBASE_CONTROL_DATABASE_URL'),
  /** Admin connection to the shared MongoDB cluster that hosts MongoDB projects. */
  mongoAdminUrl: process.env.NICERBASE_MONGODB_ADMIN_URL ?? '',
  /** Host and port customers use to reach their Postgres databases. */
  postgresPublicHost: process.env.NICERBASE_POSTGRES_PUBLIC_HOST ?? 'localhost',
  postgresPublicPort: Number(process.env.NICERBASE_POSTGRES_PUBLIC_PORT ?? 5432),
  /** Host and port customers use to reach their MongoDB databases. */
  mongoPublicHost: process.env.NICERBASE_MONGODB_PUBLIC_HOST ?? 'localhost',
  mongoPublicPort: Number(process.env.NICERBASE_MONGODB_PUBLIC_PORT ?? 27017),
  /** SMTP connection URL, e.g. smtps://user:pass@smtp.example.com:465. Unset = log emails. */
  smtpUrl: process.env.NICERBASE_SMTP_URL ?? '',
  mailFrom: process.env.NICERBASE_MAIL_FROM ?? 'NicerBase <no-reply@localhost>',
  /** Require a verified email before creating projects. Defaults to on when SMTP is set. */
  requireEmailVerification:
    (process.env.NICERBASE_REQUIRE_EMAIL_VERIFICATION ??
      (process.env.NICERBASE_SMTP_URL ? 'true' : 'false')) === 'true',
  maxProjectsPerUser: Number(process.env.NICERBASE_MAX_PROJECTS_PER_USER ?? 5),
}

export const isSecureCookie = config.publicUrl.startsWith('https://')
