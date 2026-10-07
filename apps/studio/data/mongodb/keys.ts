export const mongodbKeys = {
  databases: (projectRef: string | undefined) => ['projects', projectRef, 'mongodb'] as const,
  collections: (projectRef: string | undefined, db: string | undefined) =>
    ['projects', projectRef, 'mongodb', db, 'collections'] as const,
  documentsAll: (projectRef: string | undefined, db: string | undefined, collection?: string) =>
    ['projects', projectRef, 'mongodb', db, 'collections', collection, 'documents'] as const,
  documents: (
    projectRef: string | undefined,
    db: string | undefined,
    collection: string | undefined,
    params: { filter: string; skip: number; limit: number }
  ) =>
    [
      'projects',
      projectRef,
      'mongodb',
      db,
      'collections',
      collection,
      'documents',
      params,
    ] as const,
}
