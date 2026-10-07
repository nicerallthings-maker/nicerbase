import { constructHeaders, fetchHandler } from '@/data/fetchers'
import { BASE_PATH } from '@/lib/constants'
import { ResponseError } from '@/types'

type MongoRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: Record<string, string | number | undefined>
  body?: unknown
  signal?: AbortSignal
}

/** Calls the Studio's own MongoDB API routes for a project. */
export async function mongodbRequest<T>(
  projectRef: string,
  path: '' | '/collections' | '/documents',
  { method = 'GET', query, body, signal }: MongoRequestOptions = {}
): Promise<T> {
  const params = new URLSearchParams()
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value))
  })
  const search = params.size > 0 ? `?${params.toString()}` : ''
  const headers = await constructHeaders({ 'Content-Type': 'application/json' })

  const response = await fetchHandler(
    `${BASE_PATH}/api/platform/projects/${projectRef}/mongodb${path}${search}`,
    { method, headers, signal, body: body === undefined ? undefined : JSON.stringify(body) }
  )

  let payload: any
  try {
    payload = await response.json()
  } catch {}

  if (!response.ok) {
    throw new ResponseError(payload?.error?.message ?? 'MongoDB request failed', response.status)
  }
  return payload as T
}
