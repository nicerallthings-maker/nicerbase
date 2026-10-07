import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { mongodbKeys } from './keys'
import { mongodbRequest } from './mongodb-request'
import { ResponseError } from '@/types'

export type MongodbDatabaseCreateVariables = {
  projectRef: string
  name: string
  collection: string
}

async function createMongodbDatabase({
  projectRef,
  name,
  collection,
}: MongodbDatabaseCreateVariables) {
  return mongodbRequest<{ name: string }>(projectRef, '', {
    method: 'POST',
    body: { name, collection },
  })
}

type MutationData = Awaited<ReturnType<typeof createMongodbDatabase>>

export const useMongodbDatabaseCreateMutation = ({
  onSuccess,
  onError,
  ...options
}: Omit<
  UseMutationOptions<MutationData, ResponseError, MongodbDatabaseCreateVariables>,
  'mutationFn'
> = {}) => {
  const queryClient = useQueryClient()
  return useMutation<MutationData, ResponseError, MongodbDatabaseCreateVariables>({
    mutationFn: createMongodbDatabase,
    async onSuccess(data, variables, context) {
      await queryClient.invalidateQueries({ queryKey: mongodbKeys.databases(variables.projectRef) })
      await onSuccess?.(data, variables, context)
    },
    async onError(error, variables, context) {
      if (onError === undefined) toast.error(`Failed to create database: ${error.message}`)
      else onError(error, variables, context)
    },
    ...options,
  })
}
