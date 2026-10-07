import { queryOptions } from '@tanstack/react-query'

import { mongodbKeys } from './keys'
import { mongodbRequest } from './mongodb-request'
import { ResponseError } from '@/types'

export type MongodbDatabasesVariables = { projectRef?: string }
export type MongodbDatabasesError = ResponseError
export type MongodbDatabase = { name: string; sizeOnDisk: number; empty: boolean }
export type MongodbDatabasesData = {
  configured: boolean
  version: string | null
  databases: MongodbDatabase[]
}

async function getMongodbDatabases(
  { projectRef }: MongodbDatabasesVariables,
  signal?: AbortSignal
) {
  if (!projectRef) throw new Error('projectRef is required')
  return mongodbRequest<MongodbDatabasesData>(projectRef, '', { signal })
}

export const mongodbDatabasesQueryOptions = ({ projectRef }: MongodbDatabasesVariables) =>
  queryOptions({
    queryKey: mongodbKeys.databases(projectRef),
    queryFn: ({ signal }) => getMongodbDatabases({ projectRef }, signal),
    enabled: typeof projectRef !== 'undefined',
  })
