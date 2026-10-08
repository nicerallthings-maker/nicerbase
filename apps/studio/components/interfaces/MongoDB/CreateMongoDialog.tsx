import { zodResolver } from '@hookform/resolvers/zod'
import { useParams } from 'common'
import { SubmitHandler, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogSection,
  DialogSectionSeparator,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  Input,
} from 'ui'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'
import * as z from 'zod'

import { useMongodbCollectionCreateMutation } from '@/data/mongodb/mongodb-collection-create-mutation'
import { useMongodbDatabaseCreateMutation } from '@/data/mongodb/mongodb-database-create-mutation'

const NAME_REGEX = /^[A-Za-z0-9_-]+$/
const COLLECTION_REGEX = /^[A-Za-z0-9_.-]+$/

const formSchema = z.object({
  name: z
    .string()
    .min(1, 'Enter a database name')
    .max(63, 'Use 63 characters or fewer')
    .regex(NAME_REGEX, 'Use letters, numbers, dashes and underscores only')
    .refine((value) => !['admin', 'local', 'config'].includes(value), 'This name is reserved'),
  collection: z
    .string()
    .min(1, 'Enter a collection name')
    .regex(COLLECTION_REGEX, 'Use letters, numbers, dots, dashes and underscores only'),
})

type FormValues = z.infer<typeof formSchema>

type CreateMongoDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, only a collection is created inside this database. */
  db?: string
  onCreated: (db: string, collection: string) => void
}

const formId = 'mongodb-create-form'

export const CreateMongoDialog = ({
  open,
  onOpenChange,
  db,
  onCreated,
}: CreateMongoDialogProps) => {
  const { ref: projectRef } = useParams()
  const isCollectionOnly = db !== undefined
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: db ?? '', collection: '' },
    values: { name: db ?? '', collection: '' },
  })

  const { mutate: createDatabase, isPending: isCreatingDatabase } =
    useMongodbDatabaseCreateMutation()
  const { mutate: createCollection, isPending: isCreatingCollection } =
    useMongodbCollectionCreateMutation()
  const isPending = isCreatingDatabase || isCreatingCollection

  const handleCreated = (values: FormValues) => {
    toast.success(
      isCollectionOnly
        ? `Created collection ${values.collection}`
        : `Created database ${values.name}`
    )
    form.reset()
    onOpenChange(false)
    onCreated(values.name, values.collection)
  }

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    if (!projectRef) return console.error('Project ref is required')
    if (isCollectionOnly) {
      createCollection(
        { projectRef, db: values.name, name: values.collection },
        { onSuccess: () => handleCreated(values) }
      )
    } else {
      createDatabase(
        { projectRef, name: values.name, collection: values.collection },
        { onSuccess: () => handleCreated(values) }
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="small">
        <DialogHeader>
          <DialogTitle>{isCollectionOnly ? `New collection in ${db}` : 'New database'}</DialogTitle>
        </DialogHeader>
        <DialogSectionSeparator />
        <Form {...form}>
          <DialogSection>
            <form
              id={formId}
              className="flex flex-col gap-4"
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
            >
              {!isCollectionOnly && (
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItemLayout layout="vertical" label="Database name">
                      <FormControl>
                        <Input {...field} placeholder="my_app" autoComplete="off" />
                      </FormControl>
                    </FormItemLayout>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="collection"
                render={({ field }) => (
                  <FormItemLayout
                    layout="vertical"
                    label={isCollectionOnly ? 'Collection name' : 'First collection'}
                    description={
                      isCollectionOnly
                        ? undefined
                        : 'MongoDB creates a database together with its first collection.'
                    }
                  >
                    <FormControl>
                      <Input {...field} placeholder="users" autoComplete="off" />
                    </FormControl>
                  </FormItemLayout>
                )}
              />
            </form>
          </DialogSection>
          <DialogFooter>
            <Button variant="default" disabled={isPending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button form={formId} type="submit" variant="primary" loading={isPending}>
              {isCollectionOnly ? 'Create collection' : 'Create database'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
