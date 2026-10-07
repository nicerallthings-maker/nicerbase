import { config } from './config.js'
import { decrypt, encrypt, randomId } from './crypto.js'
import { pool } from './db.js'
import {
  connectionString,
  deprovisionMongo,
  deprovisionPostgres,
  Engine,
  isMongoAvailable,
  provisionMongo,
  provisionPostgres,
  rotateMongoPassword,
  rotatePostgresPassword,
} from './provision.js'

export type Project = {
  id: string
  ref: string
  name: string
  engine: Engine
  status: 'provisioning' | 'active' | 'failed' | 'deleting'
  database_name: string
  username: string
  password_encrypted: string
  error: string | null
  created_at: Date
}

export class ProjectError extends Error {}

export async function listProjects(ownerId: string) {
  const { rows } = await pool.query<Project>(
    'select * from nicerbase.projects where owner_id = $1 order by created_at desc',
    [ownerId]
  )
  return rows
}

export async function getProject(ownerId: string, ref: string) {
  const { rows } = await pool.query<Project>(
    'select * from nicerbase.projects where owner_id = $1 and ref = $2',
    [ownerId, ref]
  )
  return rows[0]
}

export function getConnectionString(project: Project) {
  return connectionString(project.engine, {
    databaseName: project.database_name,
    username: project.username,
    password: decrypt(project.password_encrypted, config.secretKey),
  })
}

export async function createProject(ownerId: string, input: { name?: string; engine?: string }) {
  const name = (input.name ?? '').trim()
  const engine = input.engine
  if (name.length < 1 || name.length > 60)
    throw new ProjectError('Enter a project name (up to 60 characters).')
  if (engine !== 'postgres' && engine !== 'mongodb')
    throw new ProjectError('Choose Postgres or MongoDB.')
  if (engine === 'mongodb' && !isMongoAvailable()) {
    throw new ProjectError('MongoDB is not enabled on this NicerBase instance.')
  }

  const { rows: countRows } = await pool.query<{ count: string }>(
    'select count(*) from nicerbase.projects where owner_id = $1',
    [ownerId]
  )
  if (Number(countRows[0].count) >= config.maxProjectsPerUser) {
    throw new ProjectError(`You can have up to ${config.maxProjectsPerUser} projects.`)
  }

  const ref = randomId(16)
  const creds = { databaseName: `nb_${ref}`, username: `nb_${ref}`, password: randomId(32) }
  const { rows } = await pool.query<Project>(
    `insert into nicerbase.projects (ref, owner_id, name, engine, database_name, username, password_encrypted)
     values ($1, $2, $3, $4, $5, $6, $7) returning *`,
    [
      ref,
      ownerId,
      name,
      engine,
      creds.databaseName,
      creds.username,
      encrypt(creds.password, config.secretKey),
    ]
  )

  try {
    if (engine === 'postgres') await provisionPostgres(creds)
    else await provisionMongo(creds)
    await pool.query(`update nicerbase.projects set status = 'active' where ref = $1`, [ref])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Provisioning failed'
    console.error(`[provision] ${ref}:`, error)
    await pool.query(`update nicerbase.projects set status = 'failed', error = $2 where ref = $1`, [
      ref,
      message,
    ])
  }
  return rows[0]
}

export async function deleteProject(ownerId: string, ref: string) {
  const project = await getProject(ownerId, ref)
  if (!project) throw new ProjectError('Project not found.')
  await pool.query(`update nicerbase.projects set status = 'deleting' where id = $1`, [project.id])
  const target = { databaseName: project.database_name, username: project.username }
  if (project.engine === 'postgres') await deprovisionPostgres(target)
  else await deprovisionMongo(target)
  await pool.query('delete from nicerbase.projects where id = $1', [project.id])
}

export async function resetProjectPassword(ownerId: string, ref: string) {
  const project = await getProject(ownerId, ref)
  if (!project || project.status !== 'active') throw new ProjectError('Project not found.')
  const password = randomId(32)
  if (project.engine === 'postgres') await rotatePostgresPassword(project.username, password)
  else await rotateMongoPassword(project.database_name, project.username, password)
  await pool.query('update nicerbase.projects set password_encrypted = $2 where id = $1', [
    project.id,
    encrypt(password, config.secretKey),
  ])
}
