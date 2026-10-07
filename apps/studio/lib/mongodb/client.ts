import { BSON, MongoClient } from 'mongodb'

const { EJSON } = BSON

/**
 * Server-only MongoDB connection for NicerBase projects that use the MongoDB engine.
 * The connection string comes from `MONGODB_URL` (see docker/docker-compose.mongodb.yml).
 */
const globalForMongo = globalThis as unknown as { __nicerbaseMongo?: Promise<MongoClient> }

export const MONGODB_URL = process.env.MONGODB_URL ?? ''

export function isMongoConfigured() {
  return MONGODB_URL.length > 0
}

export function getMongoClient(): Promise<MongoClient> {
  if (!isMongoConfigured()) {
    throw new Error('MongoDB is not configured. Set MONGODB_URL to enable it.')
  }
  if (!globalForMongo.__nicerbaseMongo) {
    globalForMongo.__nicerbaseMongo = new MongoClient(MONGODB_URL, {
      appName: 'nicerbase-studio',
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    })
      .connect()
      .catch((error) => {
        globalForMongo.__nicerbaseMongo = undefined
        throw error
      })
  }
  return globalForMongo.__nicerbaseMongo
}

/** Databases MongoDB manages internally; hidden from the explorer and never writable. */
export const MONGO_SYSTEM_DATABASES = ['admin', 'local', 'config']

const NAME_PATTERN = /^[A-Za-z0-9_-]{1,63}$/
const COLLECTION_PATTERN = /^(?!system\.)[A-Za-z0-9_.-]{1,120}$/

export function assertDatabaseName(name: unknown): string {
  if (
    typeof name !== 'string' ||
    !NAME_PATTERN.test(name) ||
    MONGO_SYSTEM_DATABASES.includes(name)
  ) {
    throw new MongoInputError('Invalid database name')
  }
  return name
}

export function assertCollectionName(name: unknown): string {
  if (typeof name !== 'string' || !COLLECTION_PATTERN.test(name)) {
    throw new MongoInputError('Invalid collection name')
  }
  return name
}

/** Parses Extended JSON from the client so ObjectId, dates etc. keep their BSON types. */
export function parseEJSON(value: unknown): any {
  if (value === undefined || value === null || value === '') return {}
  if (typeof value === 'string') return EJSON.parse(value, { relaxed: false })
  return EJSON.deserialize(value as Record<string, unknown>, { relaxed: false })
}

export function serializeEJSON(value: unknown) {
  return EJSON.serialize(value, { relaxed: true })
}

export class MongoInputError extends Error {}
