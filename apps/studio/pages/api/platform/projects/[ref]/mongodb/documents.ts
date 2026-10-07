import { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'
import { handleMongoError } from '@/lib/mongodb/api'
import {
  assertCollectionName,
  assertDatabaseName,
  getMongoClient,
  MongoInputError,
  parseEJSON,
  serializeEJSON,
} from '@/lib/mongodb/client'

const MAX_LIMIT = 200

export default (req: NextApiRequest, res: NextApiResponse) =>
  apiWrapper(req, res, handler, { withAuth: true })

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await handleGet(req, res)
      case 'POST':
        return await handlePost(req, res)
      case 'PUT':
        return await handlePut(req, res)
      case 'DELETE':
        return await handleDelete(req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        return res.status(405).json({ error: { message: `Method ${req.method} Not Allowed` } })
    }
  } catch (error) {
    return handleMongoError(res, error)
  }
}

async function getCollection(dbName: unknown, collectionName: unknown) {
  const client = await getMongoClient()
  return client.db(assertDatabaseName(dbName)).collection(assertCollectionName(collectionName))
}

function asObject(value: unknown, label: string) {
  const parsed = parseEJSON(value)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new MongoInputError(`${label} must be a JSON object`)
  }
  return parsed as Record<string, unknown>
}

function rejectOperators(filter: Record<string, unknown>) {
  // $where / $function run server-side JavaScript; the explorer never needs them.
  const json = JSON.stringify(filter)
  if (
    json.includes('"$where"') ||
    json.includes('"$function"') ||
    json.includes('"$accumulator"')
  ) {
    throw new MongoInputError('JavaScript operators are not allowed in filters')
  }
}

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  const collection = await getCollection(req.query.db, req.query.collection)
  const filter = asObject(req.query.filter, 'Filter')
  rejectOperators(filter)
  const sort = asObject(req.query.sort, 'Sort')
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), MAX_LIMIT)
  const skip = Math.max(Number(req.query.skip) || 0, 0)

  const [documents, count] = await Promise.all([
    collection
      .find(filter)
      .sort(Object.keys(sort).length > 0 ? (sort as any) : { _id: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments(filter, { maxTimeMS: 5000 }),
  ])

  return res.status(200).json({ documents: serializeEJSON(documents), count })
}

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  const collection = await getCollection(req.body?.db, req.body?.collection)
  const document = asObject(req.body?.document, 'Document')
  const result = await collection.insertOne(document)
  return res.status(201).json({ insertedId: serializeEJSON(result.insertedId) })
}

/** Replaces the whole document matched by `_id`. */
const handlePut = async (req: NextApiRequest, res: NextApiResponse) => {
  const collection = await getCollection(req.body?.db, req.body?.collection)
  const id = parseEJSON(req.body?.id)
  const { _id, ...replacement } = asObject(req.body?.document, 'Document')
  const result = await collection.replaceOne({ _id: id }, replacement)
  if (result.matchedCount === 0) {
    return res.status(404).json({ error: { message: 'Document not found' } })
  }
  return res.status(200).json({ modifiedCount: result.modifiedCount })
}

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  const collection = await getCollection(req.query.db, req.query.collection)
  const id = parseEJSON(req.query.id)
  const result = await collection.deleteOne({ _id: id })
  return res.status(200).json({ deletedCount: result.deletedCount })
}
