import { useQuery } from '@tanstack/react-query'
import { useParams } from 'common'
import { ChevronLeft, ChevronRight, Database, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from 'ui'
import { ConfirmationModal } from 'ui-patterns/Dialogs/ConfirmationModal'
import { GenericSkeletonLoader } from 'ui-patterns/ShimmeringLoader'

import { DocumentEditorSheet } from './DocumentEditorSheet'
import { getDocumentIdKey, getDocumentPreview, validateJsonObject } from './MongoDB.utils'
import { useMongoSelection } from './useMongoSelection'
import { AlertError } from '@/components/ui/AlertError'
import { mongodbDatabasesQueryOptions } from '@/data/mongodb/mongodb-databases-query'
import { useMongodbDocumentDeleteMutation } from '@/data/mongodb/mongodb-document-delete-mutation'
import {
  MongodbDocument,
  mongodbDocumentsQueryOptions,
} from '@/data/mongodb/mongodb-documents-query'

const PAGE_SIZE = 50

export const MongoDBExplorer = () => {
  const { ref: projectRef } = useParams()
  const { db, collection } = useMongoSelection()
  const {
    data: status,
    isPending,
    isError,
    error,
  } = useQuery(mongodbDatabasesQueryOptions({ projectRef }))

  if (isPending) return <GenericSkeletonLoader className="p-8" />
  if (isError) {
    return (
      <div className="p-8">
        <AlertError error={error} subject="Failed to connect to MongoDB" />
      </div>
    )
  }
  if (!status.configured) return <MongoNotConfigured />
  if (!db || !collection) return <MongoOverview version={status.version} />

  // Remount per collection so paging and filters reset when switching.
  return <CollectionDocuments key={`${db}.${collection}`} db={db} collection={collection} />
}

const MongoNotConfigured = () => (
  <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-24 text-center">
    <div className="rounded-full bg-[image:var(--brand-gradient)] p-3 text-white">
      <Database size={20} />
    </div>
    <h2 className="text-lg text-foreground">Connect MongoDB to this project</h2>
    <p className="text-sm text-foreground-light">
      Start the MongoDB service with{' '}
      <code className="text-code-inline">
        docker compose -f docker-compose.yml -f docker-compose.mongodb.yml up -d
      </code>
      , then set <code className="text-code-inline">MONGODB_URL</code> for Studio and restart it.
    </p>
  </div>
)

const MongoOverview = ({ version }: { version: string | null }) => (
  <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-24 text-center">
    <div className="rounded-full bg-[image:var(--brand-gradient)] p-3 text-white">
      <Database size={20} />
    </div>
    <h2 className="text-lg text-foreground">MongoDB {version}</h2>
    <p className="text-sm text-foreground-light">
      Pick a collection from the sidebar to browse its documents, or create a new database to get
      started.
    </p>
  </div>
)

const CollectionDocuments = ({ db, collection }: { db: string; collection: string }) => {
  const { ref: projectRef } = useParams()
  const [filterInput, setFilterInput] = useState('')
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(0)
  const [editor, setEditor] = useState<{ open: boolean; document?: MongodbDocument }>({
    open: false,
  })
  const [pendingDelete, setPendingDelete] = useState<MongodbDocument>()

  const filterError = validateJsonObject(filterInput)
  const { data, isPending, isError, error, isFetching } = useQuery(
    mongodbDocumentsQueryOptions({
      projectRef,
      db,
      collection,
      filter,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    })
  )

  const { mutate: deleteDocument, isPending: isDeleting } = useMongodbDocumentDeleteMutation({
    onSuccess: () => {
      toast.success('Document deleted')
      setPendingDelete(undefined)
    },
  })

  const total = data?.count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasPrevious = page > 0
  const hasNext = page + 1 < pageCount

  const handleApplyFilter = () => {
    if (filterError) return
    setPage(0)
    setFilter(filterInput.trim())
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-4">
        <div className="min-w-0 mr-auto">
          <p className="text-xs text-foreground-lighter">{db}</p>
          <h1 className="truncate text-xl text-foreground">{collection}</h1>
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            handleApplyFilter()
          }}
        >
          <Input
            size="tiny"
            className="w-72 font-mono"
            placeholder='Filter, e.g. { "status": "active" }'
            value={filterInput}
            onChange={(event) => setFilterInput(event.target.value)}
            aria-invalid={filterError !== undefined}
          />
          <Button variant="default" type="submit" disabled={filterError !== undefined}>
            Apply
          </Button>
        </form>
        <Button
          variant="primary"
          icon={<Plus size={14} />}
          onClick={() => setEditor({ open: true })}
        >
          Insert document
        </Button>
      </div>

      {filterError && filterInput && (
        <p className="px-6 pt-2 text-xs text-destructive">{filterError}</p>
      )}

      <div className="flex-1 overflow-auto">
        {isPending && <GenericSkeletonLoader className="p-6" />}
        {isError && (
          <div className="p-6">
            <AlertError error={error} subject="Failed to load documents" />
          </div>
        )}
        {data && data.documents.length === 0 && (
          <p className="px-6 py-16 text-center text-sm text-foreground-light">
            {filter ? 'No documents match this filter.' : 'This collection is empty.'}
          </p>
        )}
        {data && data.documents.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[260px]">_id</TableHead>
                <TableHead>Document</TableHead>
                <TableHead className="w-[90px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.documents.map((document) => (
                <TableRow
                  key={getDocumentIdKey(document)}
                  className="cursor-pointer"
                  onClick={() => setEditor({ open: true, document })}
                >
                  <TableCell className="font-mono text-xs text-foreground-light truncate max-w-[260px]">
                    {getDocumentIdKey(document)}
                  </TableCell>
                  <TableCell className="font-mono text-xs truncate max-w-0">
                    {getDocumentPreview(document)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="text"
                        size="tiny"
                        icon={<Pencil size={13} />}
                        aria-label="Edit document"
                        onClick={(event) => {
                          event.stopPropagation()
                          setEditor({ open: true, document })
                        }}
                      />
                      <Button
                        variant="text"
                        size="tiny"
                        icon={<Trash2 size={13} />}
                        aria-label="Delete document"
                        onClick={(event) => {
                          event.stopPropagation()
                          setPendingDelete(document)
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex items-center justify-between border-t px-6 py-2 text-xs text-foreground-light">
        <span>
          {total.toLocaleString()} {total === 1 ? 'document' : 'documents'}
          {isFetching && !isPending ? ' · refreshing…' : ''}
        </span>
        <div className="flex items-center gap-2">
          <span>
            Page {page + 1} of {pageCount}
          </span>
          <Button
            variant="default"
            size="tiny"
            icon={<ChevronLeft size={14} />}
            disabled={!hasPrevious}
            onClick={() => setPage((current) => current - 1)}
            aria-label="Previous page"
          />
          <Button
            variant="default"
            size="tiny"
            icon={<ChevronRight size={14} />}
            disabled={!hasNext}
            onClick={() => setPage((current) => current + 1)}
            aria-label="Next page"
          />
        </div>
      </div>

      {editor.open && (
        <DocumentEditorSheet
          db={db}
          collection={collection}
          document={editor.document}
          open={editor.open}
          onOpenChange={(open) => setEditor((prev) => ({ ...prev, open }))}
        />
      )}

      <ConfirmationModal
        visible={pendingDelete !== undefined}
        variant="destructive"
        title="Delete document"
        confirmLabel="Delete"
        loading={isDeleting}
        onCancel={() => setPendingDelete(undefined)}
        onConfirm={() => {
          if (!projectRef || !pendingDelete) return
          deleteDocument({ projectRef, db, collection, id: getDocumentIdKey(pendingDelete) })
        }}
      >
        <p className="text-sm text-foreground-light">
          This permanently deletes the document{' '}
          <code className="text-code-inline">
            {pendingDelete ? getDocumentIdKey(pendingDelete) : ''}
          </code>
          .
        </p>
      </ConfirmationModal>
    </div>
  )
}
