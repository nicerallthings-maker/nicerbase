import { useQuery } from '@tanstack/react-query'
import { useParams } from 'common'
import { ChevronRight, Database, Folder, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'ui'
import { ConfirmationModal } from 'ui-patterns/Dialogs/ConfirmationModal'
import { ShimmeringLoader } from 'ui-patterns/ShimmeringLoader'

import { CreateMongoDialog } from './CreateMongoDialog'
import { useMongoSelection } from './useMongoSelection'
import { useMongodbCollectionDeleteMutation } from '@/data/mongodb/mongodb-collection-delete-mutation'
import { mongodbCollectionsQueryOptions } from '@/data/mongodb/mongodb-collections-query'
import { useMongodbDatabaseDeleteMutation } from '@/data/mongodb/mongodb-database-delete-mutation'
import { mongodbDatabasesQueryOptions } from '@/data/mongodb/mongodb-databases-query'
import { formatBytes } from '@/lib/helpers'

type PendingDelete =
  | { kind: 'database'; db: string }
  | { kind: 'collection'; db: string; name: string }

export const MongoDBMenu = () => {
  const { ref: projectRef } = useParams()
  const { db: selectedDb, collection: selectedCollection, select } = useMongoSelection()
  const [createIn, setCreateIn] = useState<{ open: boolean; db?: string }>({ open: false })
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>()

  const { data, isPending, isError, error } = useQuery(mongodbDatabasesQueryOptions({ projectRef }))
  const { mutate: deleteDatabase, isPending: isDeletingDatabase } =
    useMongodbDatabaseDeleteMutation()
  const { mutate: deleteCollection, isPending: isDeletingCollection } =
    useMongodbCollectionDeleteMutation()

  const handleConfirmDelete = () => {
    if (!projectRef || !pendingDelete) return
    const onSuccess = () => {
      toast.success(
        pendingDelete.kind === 'database'
          ? `Deleted database ${pendingDelete.db}`
          : `Deleted collection ${pendingDelete.name}`
      )
      if (pendingDelete.kind === 'database' && pendingDelete.db === selectedDb) select(null)
      if (pendingDelete.kind === 'collection' && pendingDelete.name === selectedCollection) {
        select(pendingDelete.db)
      }
      setPendingDelete(undefined)
    }
    if (pendingDelete.kind === 'database') {
      deleteDatabase({ projectRef, name: pendingDelete.db }, { onSuccess })
    } else {
      deleteCollection(
        { projectRef, db: pendingDelete.db, name: pendingDelete.name },
        { onSuccess }
      )
    }
  }

  const isConfigured = data?.configured ?? false

  return (
    <div className="flex flex-col gap-y-2 px-3 py-4">
      <div className="flex items-center justify-between px-2">
        <p className="text-xs font-mono uppercase tracking-wider text-foreground-lighter">
          Databases
        </p>
        <Button
          variant="text"
          size="tiny"
          icon={<Plus size={14} />}
          disabled={!isConfigured}
          onClick={() => setCreateIn({ open: true })}
          aria-label="New database"
        />
      </div>

      {isPending && (
        <div className="flex flex-col gap-2 px-2">
          <ShimmeringLoader />
          <ShimmeringLoader className="w-3/4" />
        </div>
      )}
      {isError && <p className="px-2 text-xs text-destructive">{error.message}</p>}
      {data && isConfigured && data.databases.length === 0 && (
        <p className="px-2 text-xs text-foreground-lighter">No databases yet.</p>
      )}

      <ul className="flex flex-col gap-0.5">
        {data?.databases.map((database) => (
          <DatabaseItem
            key={database.name}
            name={database.name}
            size={formatBytes(database.sizeOnDisk, 1)}
            isOpen={database.name === selectedDb}
            selectedCollection={database.name === selectedDb ? selectedCollection : undefined}
            onToggle={() => select(database.name === selectedDb ? null : database.name)}
            onSelectCollection={(collection) => select(database.name, collection)}
            onCreateCollection={() => setCreateIn({ open: true, db: database.name })}
            onDelete={() => setPendingDelete({ kind: 'database', db: database.name })}
            onDeleteCollection={(name) =>
              setPendingDelete({ kind: 'collection', db: database.name, name })
            }
          />
        ))}
      </ul>

      <CreateMongoDialog
        open={createIn.open}
        db={createIn.db}
        onOpenChange={(open) => setCreateIn((prev) => ({ ...prev, open }))}
        onCreated={(db, collection) => select(db, collection)}
      />

      <ConfirmationModal
        visible={pendingDelete !== undefined}
        variant="destructive"
        title={
          pendingDelete?.kind === 'database'
            ? `Delete database ${pendingDelete.db}`
            : `Delete collection ${pendingDelete?.kind === 'collection' ? pendingDelete.name : ''}`
        }
        confirmLabel="Delete"
        loading={isDeletingDatabase || isDeletingCollection}
        onCancel={() => setPendingDelete(undefined)}
        onConfirm={handleConfirmDelete}
      >
        <p className="text-sm text-foreground-light">
          This permanently deletes every document inside it. This can't be undone.
        </p>
      </ConfirmationModal>
    </div>
  )
}

type DatabaseItemProps = {
  name: string
  size: string
  isOpen: boolean
  selectedCollection?: string
  onToggle: () => void
  onSelectCollection: (collection: string) => void
  onCreateCollection: () => void
  onDelete: () => void
  onDeleteCollection: (collection: string) => void
}

const DatabaseItem = ({
  name,
  size,
  isOpen,
  selectedCollection,
  onToggle,
  onSelectCollection,
  onCreateCollection,
  onDelete,
  onDeleteCollection,
}: DatabaseItemProps) => {
  const { ref: projectRef } = useParams()
  const { data: collections, isPending } = useQuery({
    ...mongodbCollectionsQueryOptions({ projectRef, db: name }),
    enabled: isOpen && projectRef !== undefined,
  })

  return (
    <li>
      <div className="group flex items-center rounded-md hover:bg-surface-200">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 px-2 py-1.5 text-sm text-foreground-light min-w-0"
        >
          <ChevronRight
            size={14}
            className={cn('shrink-0 transition-transform', isOpen && 'rotate-90')}
          />
          <Database size={14} className="shrink-0 text-brand" />
          <span className="truncate">{name}</span>
          <span className="ml-auto text-xs text-foreground-muted">{size}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="text"
              size="tiny"
              className="opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
              icon={<MoreHorizontal size={14} />}
              aria-label={`Actions for ${name}`}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem className="gap-2" onClick={onCreateCollection}>
              <Plus size={14} />
              New collection
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-destructive" onClick={onDelete}>
              <Trash2 size={14} />
              Delete database
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isOpen && (
        <ul className="ml-5 mt-0.5 flex flex-col gap-0.5 border-l pl-2">
          {isPending && <ShimmeringLoader className="my-1" />}
          {collections?.length === 0 && (
            <li className="px-2 py-1 text-xs text-foreground-lighter">No collections</li>
          )}
          {collections?.map((collection) => (
            <li key={collection.name} className="group/col flex items-center">
              <button
                type="button"
                onClick={() => onSelectCollection(collection.name)}
                className={cn(
                  'flex flex-1 items-center gap-2 rounded-md px-2 py-1 text-sm min-w-0',
                  collection.name === selectedCollection
                    ? 'bg-surface-300 text-foreground'
                    : 'text-foreground-light hover:bg-surface-200'
                )}
              >
                <Folder size={13} className="shrink-0" />
                <span className="truncate">{collection.name}</span>
                <span className="ml-auto text-xs text-foreground-muted">
                  {collection.count.toLocaleString()}
                </span>
              </button>
              <Button
                variant="text"
                size="tiny"
                className="opacity-0 group-hover/col:opacity-100"
                icon={<Trash2 size={12} />}
                onClick={() => onDeleteCollection(collection.name)}
                aria-label={`Delete collection ${collection.name}`}
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
