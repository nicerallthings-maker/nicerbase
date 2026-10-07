import { parseAsString, useQueryState } from 'nuqs'

/** Selected database and collection, kept in the URL so links are shareable. */
export function useMongoSelection() {
  const [db, setDb] = useQueryState('db', parseAsString)
  const [collection, setCollection] = useQueryState('collection', parseAsString)

  return {
    db: db ?? undefined,
    collection: collection ?? undefined,
    select: (nextDb: string | null, nextCollection: string | null = null) => {
      setDb(nextDb)
      setCollection(nextCollection)
    },
  }
}
