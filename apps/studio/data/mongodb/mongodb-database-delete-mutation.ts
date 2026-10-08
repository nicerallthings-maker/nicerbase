import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { mongodbKeys } from './keys'
import { mongodbRequest } from './mongodb-request'
import { ResponseError } from '@/types'

export type MongodbDatabaseDeleteVariables = { projectRef: string; name: string }

async function deleteMongodbDatabase({ projectRef, name }: MongodbDatabaseDeleteVariables) {
  return mongodbRequest<{ name: string }>(projectRef, '', {
    method: 'DELETE',
    query: { db: name },
  })
}

type MutationData = Awaited<ReturnType<typeof deleteMongodbDatabase>>

export const useMongodbDatabaseDeleteMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseMutationOptions<MutationData, ResponseError, MongodbDatabaseDeleteVariables>,
  'mutationFn'
> = {}) => {
  const queryClient = useQueryClient()
  return useMutation<MutationData, ResponseError, MongodbDatabaseDeleteVariables>({
    mutationFn: deleteMongodbDatabase,
    async onSuccess(data, variables, context) {
      await queryClient.invalidateQueries({ queryKey: mongodbKeys.databases(variables.projectRef) })
      await onSuccess?.(data, variables, context)
    },
    async onError(error, variables, context) {
      if (onError === undefined) toast.error(`Failed to delete database: ${error.message}`)
      else onError(error, variables, context)
    },
    ...options,
  })
}
