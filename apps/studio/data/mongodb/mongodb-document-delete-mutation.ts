import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { mongodbKeys } from './keys'
import { mongodbRequest } from './mongodb-request'
import { ResponseError } from '@/types'

export type MongodbDocumentDeleteVariables = {
  projectRef: string
  db: string
  collection: string
  /** Extended JSON of the document's `_id` */
  id: string
}

async function deleteMongodbDocument({
  projectRef,
  db,
  collection,
  id,
}: MongodbDocumentDeleteVariables) {
  return mongodbRequest<{ deletedCount: number }>(projectRef, '/documents', {
    method: 'DELETE',
    query: { db, collection, id },
  })
}

type MutationData = Awaited<ReturnType<typeof deleteMongodbDocument>>

export const useMongodbDocumentDeleteMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseMutationOptions<MutationData, ResponseError, MongodbDocumentDeleteVariables>,
  'mutationFn'
> = {}) => {
  const queryClient = useQueryClient()
  return useMutation<MutationData, ResponseError, MongodbDocumentDeleteVariables>({
    mutationFn: deleteMongodbDocument,
    async onSuccess(data, variables, context) {
      await queryClient.invalidateQueries({
        queryKey: mongodbKeys.collections(variables.projectRef, variables.db),
      })
      await onSuccess?.(data, variables, context)
    },
    async onError(error, variables, context) {
      if (onError === undefined) toast.error(`Failed to delete document: ${error.message}`)
      else onError(error, variables, context)
    },
    ...options,
  })
}
