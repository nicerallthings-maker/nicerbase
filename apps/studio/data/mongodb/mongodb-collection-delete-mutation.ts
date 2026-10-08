import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { mongodbKeys } from './keys'
import { mongodbRequest } from './mongodb-request'
import { ResponseError } from '@/types'

export type MongodbCollectionDeleteVariables = { projectRef: string; db: string; name: string }

async function deleteMongodbCollection({ projectRef, db, name }: MongodbCollectionDeleteVariables) {
  return mongodbRequest<{ name: string }>(projectRef, '/collections', {
    method: 'DELETE',
    query: { db, collection: name },
  })
}

type MutationData = Awaited<ReturnType<typeof deleteMongodbCollection>>

export const useMongodbCollectionDeleteMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseMutationOptions<MutationData, ResponseError, MongodbCollectionDeleteVariables>,
  'mutationFn'
> = {}) => {
  const queryClient = useQueryClient()
  return useMutation<MutationData, ResponseError, MongodbCollectionDeleteVariables>({
    mutationFn: deleteMongodbCollection,
    async onSuccess(data, variables, context) {
      await queryClient.invalidateQueries({ queryKey: mongodbKeys.databases(variables.projectRef) })
      await onSuccess?.(data, variables, context)
    },
    async onError(error, variables, context) {
      if (onError === undefined) toast.error(`Failed to delete collection: ${error.message}`)
      else onError(error, variables, context)
    },
    ...options,
  })
}
