import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { mongodbKeys } from './keys'
import { mongodbRequest } from './mongodb-request'
import { ResponseError } from '@/types'

export type MongodbDocumentSaveVariables = {
  projectRef: string
  db: string
  collection: string
  /** Extended JSON of the existing `_id`; omit to insert a new document */
  id?: string
  /** Extended JSON document */
  document: string
}

async function saveMongodbDocument({
  projectRef,
  db,
  collection,
  id,
  document,
}: MongodbDocumentSaveVariables) {
  return mongodbRequest<unknown>(projectRef, '/documents', {
    method: id === undefined ? 'POST' : 'PUT',
    body: { db, collection, id, document },
  })
}

type MutationData = Awaited<ReturnType<typeof saveMongodbDocument>>

export const useMongodbDocumentSaveMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseMutationOptions<MutationData, ResponseError, MongodbDocumentSaveVariables>,
  'mutationFn'
> = {}) => {
  const queryClient = useQueryClient()
  return useMutation<MutationData, ResponseError, MongodbDocumentSaveVariables>({
    mutationFn: saveMongodbDocument,
    async onSuccess(data, variables, context) {
      await queryClient.invalidateQueries({
        queryKey: mongodbKeys.collections(variables.projectRef, variables.db),
      })
      await onSuccess?.(data, variables, context)
    },
    async onError(error, variables, context) {
      if (onError === undefined) toast.error(`Failed to save document: ${error.message}`)
      else onError(error, variables, context)
    },
    ...options,
  })
}
