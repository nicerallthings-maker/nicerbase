import { queryOptions } from '@tanstack/react-query'

import { mongodbKeys } from './keys'
import { mongodbRequest } from './mongodb-request'
import { ResponseError } from '@/types'

export type MongodbCollectionsVariables = { projectRef?: string; db?: string }
export type MongodbCollectionsError = ResponseError
export type MongodbCollection = { name: string; count: number }

async function getMongodbCollections(
  { projectRef, db }: MongodbCollectionsVariables,
  signal?: AbortSignal
) {
  if (!projectRef) throw new Error('projectRef is required')
  if (!db) throw new Error('db is required')
  return mongodbRequest<MongodbCollection[]>(projectRef, '/collections', { query: { db }, signal })
}

export type MongodbCollectionsData = Awaited<ReturnType<typeof getMongodbCollections>>

export const mongodbCollectionsQueryOptions = ({ projectRef, db }: MongodbCollectionsVariables) =>
  queryOptions({
    queryKey: mongodbKeys.collections(projectRef, db),
    queryFn: ({ signal }) => getMongodbCollections({ projectRef, db }, signal),
    enabled: typeof projectRef !== 'undefined' && typeof db !== 'undefined',
  })
