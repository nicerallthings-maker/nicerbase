import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { handleMongoError } from '@/lib/mongodb/api'
import {
  assertCollectionName,
  assertDatabaseName,
  getMongoClient,
  isMongoConfigured,
  MONGO_SYSTEM_DATABASES,
} from '@/lib/mongodb/client'

export default (req: NextApiRequest, res: NextApiResponse) =>
  apiWrapper(req, res, handler, { withAuth: true })

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res)
      case 'POST':
        return await handlePost(req, res)
      case 'DELETE':
        return await handleDelete(req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
        return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
    }
  } catch (error) {
    return handleMongoError(res, error)
  }
}

/** Connection status plus the list of user databases. */
const handleGet = async (_req: NextApiRequest, res: NextApiResponse) => {
  if (!isMongoConfigured()) {
    return res.status(200).json({ configured: false, version: null, databases: [] })
  }
  const client = await getMongoClient()
  const admin = client.db('admin').admin()
  const [{ version }, { databases }] = await Promise.all([
    admin.serverInfo(),
    admin.listDatabases(),
  ])

  return res.status(200).json({
    configured: true,
    version: version as string,
    databases: databases
      .filter((db) => !MONGO_SYSTEM_DATABASES.includes(db.name))
      .map((db) => ({ name: db.name, sizeOnDisk: db.sizeOnDisk ?? 0, empty: db.empty ?? false })),
  })
}

/** MongoDB creates a database lazily, so we create it with its first collection. */
const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  const name = assertDatabaseName(req.body?.name)
  const collection = assertCollectionName(req.body?.collection)
  const client = await getMongoClient()
  await client.db(name).createCollection(collection)
  return res.status(201).json({ name })
}

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  const name = assertDatabaseName(req.query.db)
  const client = await getMongoClient()
  await client.db(name).dropDatabase()
  return res.status(200).json({ name })
}
