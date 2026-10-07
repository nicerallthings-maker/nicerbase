import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { handleMongoError } from '@/lib/mongodb/api'
import { assertCollectionName, assertDatabaseName, getMongoClient } from '@/lib/mongodb/client'

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

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  const db = (await getMongoClient()).db(assertDatabaseName(req.query.db))
  const collections = await db.listCollections({}, { nameOnly: true }).toArray()
  const withCounts = await Promise.all(
    collections
      .filter((c) => !c.name.startsWith('system.'))
      .map(async (c) => ({
        name: c.name,
        count: await db.collection(c.name).estimatedDocumentCount(),
      }))
  )
  withCounts.sort((a, b) => a.name.localeCompare(b.name))
  return res.status(200).json(withCounts)
}

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  const db = (await getMongoClient()).db(assertDatabaseName(req.body?.db))
  const name = assertCollectionName(req.body?.name)
  await db.createCollection(name)
  return res.status(201).json({ name })
}

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  const db = (await getMongoClient()).db(assertDatabaseName(req.query.db))
  const name = assertCollectionName(req.query.collection)
  await db.collection(name).drop()
  return res.status(200).json({ name })
}
