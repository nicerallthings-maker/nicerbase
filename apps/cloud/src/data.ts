import { BSON, MongoClient } from 'mongodb'
import pg from 'pg'
import Cursor from 'pg-cursor'

import { config } from './config.js'
import { decrypt } from './crypto.js'
import type { Project } from './projects.js'

const { EJSON } = BSON

/**
 * Data browser for a single tenant project. Every operation connects as the
 * project's own restricted login, so the database enforces isolation: a tenant can
 * only ever see or change its own database, whatever SQL or filter it sends.
 */

export const MAX_RESULT_ROWS = 500
export const PAGE_SIZE = 50
const STATEMENT_TIMEOUT_MS = 15_000

export class DataError extends Error {}

function tenantPassword(project: Project) {
  return decrypt(project.password_encrypted, config.secretKey)
}

/** Internal (in-cluster) URL for the tenant, derived from the admin connection's host. */
function internalUrl(adminUrl: string, project: Project) {
  const url = new URL(adminUrl)
  url.username = project.username
  url.password = tenantPassword(project)
  url.pathname = `/${project.database_name}`
  if (project.engine === 'mongodb') url.search = `?authSource=${project.database_name}`
  return url.toString()
}

async function withPostgres<T>(project: Project, fn: (client: pg.Client) => Promise<T>) {
  const client = new pg.Client({
    connectionString: internalUrl(config.controlDatabaseUrl, project),
    // Server-side limit. (pg's client-side `query_timeout` crashes the process when
    // combined with pg-cursor, so it is deliberately not used.)
    statement_timeout: STATEMENT_TIMEOUT_MS,
    connectionTimeoutMillis: 5_000,
    application_name: 'nicerbase-console',
  })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end().catch(() => undefined)
  }
}

async function withMongo<T>(project: Project, fn: (client: MongoClient) => Promise<T>) {
  const client = await new MongoClient(internalUrl(config.mongoAdminUrl, project), {
    appName: 'nicerbase-console',
    serverSelectionTimeoutMS: 5_000,
  }).connect()
  try {
    return await fn(client)
  } finally {
    await client.close().catch(() => undefined)
  }
}

// ---------------------------------------------------------------------------
// Postgres
// ---------------------------------------------------------------------------

export type TableSummary = { schema: string; name: string; kind: string; rows: number }

export function listTables(project: Project) {
  return withPostgres(project, async (client) => {
    const { rows } = await client.query<TableSummary>(
      `select n.nspname as schema, c.relname as name,
              case c.relkind when 'r' then 'table' when 'p' then 'table' when 'v' then 'view'
                             when 'm' then 'materialized view' else 'foreign table' end as kind,
              greatest(c.reltuples, 0)::bigint::int as rows
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where c.relkind in ('r', 'p', 'v', 'm', 'f')
         and n.nspname not in ('pg_catalog', 'information_schema') and n.nspname not like 'pg\\_%'
       order by n.nspname, c.relname`
    )
    return rows
  })
}

export type QueryResult = {
  command: string
  columns: string[]
  rows: unknown[][]
  rowCount: number | null
  truncated: boolean
  durationMs: number
}

function toResult(result: pg.QueryResult, started: number, truncated = false): QueryResult {
  return {
    command: result.command ?? '',
    columns: (result.fields ?? []).map((f) => f.name),
    rows: (result.rows ?? []).slice(0, MAX_RESULT_ROWS) as unknown[][],
    rowCount: result.rowCount,
    truncated: truncated || (result.rows?.length ?? 0) > MAX_RESULT_ROWS,
    durationMs: Date.now() - started,
  }
}

/**
 * Runs SQL as the tenant. Single statements stream through a cursor so a huge
 * `select` never loads more than MAX_RESULT_ROWS into memory; scripts with several
 * statements fall back to the simple protocol and report the last result.
 */
export function runSql(project: Project, sql: string) {
  const text = sql.trim()
  if (!text) throw new DataError('Enter a SQL statement to run.')
  if (text.length > 100_000) throw new DataError('Query is too long (100 KB max).')

  return withPostgres(project, async (client) => {
    const started = Date.now()
    try {
      const cursor = client.query(new Cursor(text, [], { rowMode: 'array' }))
      const rows = await cursor.read(MAX_RESULT_ROWS + 1)
      // `_result` carries fields and command once the first batch is read.
      const meta = (cursor as unknown as { _result: pg.QueryResult })._result
      await cursor.close()
      return toResult({ ...meta, rows }, started, rows.length > MAX_RESULT_ROWS)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (!message.includes('cannot insert multiple commands')) throw error
    }
    const result = await client.query({ text, rowMode: 'array' })
    const last = Array.isArray(result) ? result[result.length - 1] : result
    return toResult(last, started)
  })
}

export async function browseTable(project: Project, schema: string, table: string, page: number) {
  const tables = await listTables(project)
  const match = tables.find((t) => t.schema === schema && t.name === table)
  if (!match) throw new DataError('Table not found.')
  return withPostgres(project, async (client) => {
    const started = Date.now()
    const target = `${pg.escapeIdentifier(schema)}.${pg.escapeIdentifier(table)}`
    const result = await client.query({
      text: `select * from ${target} limit $1 offset $2`,
      values: [PAGE_SIZE, page * PAGE_SIZE],
      rowMode: 'array',
    })
    const { rows } = await client.query<{ count: string }>(`select count(*) from ${target}`)
    return { result: toResult(result, started), total: Number(rows[0].count), kind: match.kind }
  })
}

// ---------------------------------------------------------------------------
// MongoDB
// ---------------------------------------------------------------------------

const COLLECTION_NAME = /^(?!system\.)[A-Za-z0-9_.-]{1,120}$/

export function assertCollection(name: string) {
  if (!COLLECTION_NAME.test(name) || name === '_nicerbase')
    throw new DataError('Invalid collection name.')
  return name
}

export function listCollections(project: Project) {
  return withMongo(project, async (client) => {
    const db = client.db(project.database_name)
    const collections = await db.listCollections({}, { nameOnly: true }).toArray()
    const result = await Promise.all(
      collections
        .filter((c) => !c.name.startsWith('system.') && c.name !== '_nicerbase')
        .map(async (c) => ({
          name: c.name,
          count: await db.collection(c.name).estimatedDocumentCount(),
        }))
    )
    return result.sort((a, b) => a.name.localeCompare(b.name))
  })
}

function parseObject(text: string, label: string): Record<string, unknown> {
  if (!text.trim()) return {}
  let value: unknown
  try {
    value = EJSON.parse(text, { relaxed: false })
  } catch (error) {
    throw new DataError(`${label} isn't valid JSON: ${error instanceof Error ? error.message : ''}`)
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new DataError(`${label} must be a JSON object.`)
  }
  const json = JSON.stringify(value)
  if (/"\$(where|function|accumulator)"/.test(json)) {
    throw new DataError('JavaScript operators ($where, $function) are not allowed.')
  }
  return value as Record<string, unknown>
}

export function browseCollection(project: Project, name: string, filterText: string, page: number) {
  assertCollection(name)
  const filter = parseObject(filterText, 'Filter')
  return withMongo(project, async (client) => {
    const collection = client.db(project.database_name).collection(name)
    const [documents, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ _id: -1 })
        .skip(page * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .toArray(),
      collection.countDocuments(filter, { maxTimeMS: 5_000 }),
    ])
    return {
      total,
      documents: documents.map((doc) => ({
        id: EJSON.stringify(doc._id, { relaxed: false }),
        json: EJSON.stringify(doc, undefined, 2, { relaxed: true }),
      })),
    }
  })
}

export function createCollection(project: Project, name: string) {
  assertCollection(name)
  return withMongo(project, (client) => client.db(project.database_name).createCollection(name))
}

export function dropCollection(project: Project, name: string) {
  assertCollection(name)
  return withMongo(project, (client) => client.db(project.database_name).collection(name).drop())
}

export function insertDocument(project: Project, name: string, documentText: string) {
  assertCollection(name)
  const document = parseObject(documentText, 'Document')
  if (Object.keys(document).length === 0) throw new DataError('Enter a document to insert.')
  return withMongo(project, (client) =>
    client.db(project.database_name).collection(name).insertOne(document)
  )
}

export function deleteDocument(project: Project, name: string, idText: string) {
  assertCollection(name)
  let id: unknown
  try {
    id = EJSON.parse(idText, { relaxed: false })
  } catch {
    throw new DataError('Invalid document id.')
  }
  return withMongo(project, (client) =>
    client
      .db(project.database_name)
      .collection(name)
      .deleteOne({ _id: id as never })
  )
}
