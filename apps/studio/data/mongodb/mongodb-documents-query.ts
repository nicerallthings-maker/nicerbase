import { keepPreviousData, queryOptions } from '@tanstack/react-query'

import { mongodbKeys } from './keys'
import { mongodbRequest } from './mongodb-request'
import { ResponseError } from '@/types'

export type MongodbDocumentsVariables = {
  projectRef?: string
  db?: string
  collection?: string
  /** Extended JSON filter, e.g. `{"status":"active"}` */
  filter: string
  skip: number
  limit: number
}
export type MongodbDocumentsError = ResponseError
export type MongodbDocument = Record<string, unknown>
export type MongodbDocumentsData = { documents: MongodbDocument[]; count: number }

async function getMongodbDocuments(
  { projectRef, db, collection, filter, skip, limit }: MongodbDocumentsVariables,
  signal?: AbortSignal
) {
  if (!projectRef) throw new Error('projectRef is required')
  if (!db || !collection) throw new Error('db and collection are required')
  return mongodbRequest<MongodbDocumentsData>(projectRef, '/documents', {
    query: { db, collection, filter: filter || undefined, skip, limit },
    signal,
  })
}

export const mongodbDocumentsQueryOptions = ({
  projectRef,
  db,
  collection,
  filter,
  skip,
  limit,
}: MongodbDocumentsVariables) =>
  queryOptions({
    queryKey: mongodbKeys.documents(projectRef, db, collection, { filter, skip, limit }),
    queryFn: ({ signal }) =>
      getMongodbDocuments({ projectRef, db, collection, filter, skip, limit }, signal),
    enabled:
      typeof projectRef !== 'undefined' &&
      typeof db !== 'undefined' &&
      typeof collection !== 'undefined',
    placeholderData: keepPreviousData,
  })
