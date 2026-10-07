import type { NextApiResponse } from 'next'

import { MongoInputError } from './client'

export function handleMongoError(res: NextApiResponse, error: unknown) {
  if (error instanceof MongoInputError || (error instanceof SyntaxError && error.message)) {
    return res.status(400).json({ error: { message: error.message } })
  }
  const message = error instanceof Error ? error.message : 'Unexpected MongoDB error'
  return res.status(500).json({ error: { message } })
}
