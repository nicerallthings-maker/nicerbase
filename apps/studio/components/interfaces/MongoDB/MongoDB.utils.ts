/** Extended JSON (relaxed) of a document's `_id`, used to address it in API calls. */
export function getDocumentIdKey(document: Record<string, unknown>) {
  return JSON.stringify(document._id ?? null)
}

/** One-line preview of a document without its `_id`, truncated for table cells. */
export function getDocumentPreview(document: Record<string, unknown>, maxLength = 160) {
  const { _id, ...rest } = document
  const json = JSON.stringify(rest)
  return json.length > maxLength ? `${json.slice(0, maxLength - 1)}…` : json
}

/** Returns an error message when `value` is not a JSON object, otherwise `undefined`. */
export function validateJsonObject(value: string): string | undefined {
  if (value.trim().length === 0) return undefined
  try {
    const parsed = JSON.parse(value)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return 'Must be a JSON object, e.g. { "status": "active" }'
    }
    return undefined
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid JSON'
  }
}
