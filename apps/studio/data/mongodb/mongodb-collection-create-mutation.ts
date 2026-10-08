import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { mongodbKeys } from './keys'
import { mongodbRequest } from './mongodb-request'
import { ResponseError } from '@/types'

export type MongodbCollectionCreateVariables = { projectRef: string; db: string; name: string }

async function createMongodbCollection({ projectRef, db, name }: MongodbCollectionCreateVariables) {
  return mongodbRequest<{ name: string }>(projectRef, '/collections', {
    method: 'POST',
    body: { db, name },
  })
}

type MutationData = Awaited<ReturnType<typeof createMongodbCollection>>

export const useMongodbCollectionCreateMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseMutationOptions<MutationData, ResponseError, MongodbCollectionCreateVariables>,
  'mutationFn'
> = {}) => {
  const queryClient = useQueryClient()
  return useMutation<MutationData, ResponseError, MongodbCollectionCreateVariables>({
    mutationFn: createMongodbCollection,
    async onSuccess(data, variables, context) {
      await queryClient.invalidateQueries({ queryKey: mongodbKeys.databases(variables.projectRef) })
      await onSuccess?.(data, variables, context)
    },
    async onError(error, variables, context) {
      if (onError === undefined) toast.error(`Failed to create collection: ${error.message}`)
      else onError(error, variables, context)
    },
    ...options,
  })
}
