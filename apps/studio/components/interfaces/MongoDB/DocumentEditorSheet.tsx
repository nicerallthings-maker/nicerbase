import { useParams } from 'common'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from 'ui'

import { validateJsonObject } from './MongoDB.utils'
import { CodeEditor } from '@/components/ui/CodeEditor/CodeEditor'
import { useMongodbDocumentSaveMutation } from '@/data/mongodb/mongodb-document-save-mutation'

type DocumentEditorSheetProps = {
  db: string
  collection: string
  /** The document being edited, or `undefined` to insert a new one. */
  document?: Record<string, unknown>
  open: boolean
  onOpenChange: (open: boolean) => void
}

const NEW_DOCUMENT_TEMPLATE = '{\n  "name": ""\n}'

export const DocumentEditorSheet = ({
  db,
  collection,
  document,
  open,
  onOpenChange,
}: DocumentEditorSheetProps) => {
  const { ref: projectRef } = useParams()
  const isEditing = document !== undefined
  const initialValue = isEditing ? JSON.stringify(document, null, 2) : NEW_DOCUMENT_TEMPLATE
  const [value, setValue] = useState(initialValue)
  const validationError =
    validateJsonObject(value) ?? (value.trim() ? undefined : 'Enter a document')

  const { mutate: saveDocument, isPending } = useMongodbDocumentSaveMutation({
    onSuccess: () => {
      toast.success(isEditing ? 'Document updated' : 'Document inserted')
      onOpenChange(false)
    },
  })

  const handleSave = () => {
    if (!projectRef || validationError) return
    saveDocument({
      projectRef,
      db,
      collection,
      id: isEditing ? JSON.stringify(document._id ?? null) : undefined,
      document: value,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent size="lg" className="flex flex-col gap-0">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Edit document' : `Insert into ${collection}`}</SheetTitle>
          <SheetDescription>
            Use Extended JSON for BSON types, e.g. {'{ "$oid": "…" }'} or {'{ "$date": "…" }'}.
          </SheetDescription>
        </SheetHeader>
        <div className="relative flex-1 min-h-[300px]">
          <CodeEditor
            id={`mongodb-document-${collection}`}
            language="json"
            value={value}
            onInputChange={(next) => setValue(next ?? '')}
          />
        </div>
        <SheetFooter className="flex items-center justify-between gap-2 border-t px-5 py-3">
          <p className="text-xs text-destructive truncate">{validationError}</p>
          <div className="flex gap-2">
            <Button variant="default" disabled={isPending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={isPending}
              disabled={validationError !== undefined}
              onClick={handleSave}
            >
              {isEditing ? 'Save document' : 'Insert document'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
