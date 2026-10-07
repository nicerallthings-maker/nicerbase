import { describe, expect, it, vi } from 'vitest'

vi.mock('./config.js', () => ({ config: { secretKey: 'test' } }))
const { assertCollection, DataError } = await import('./data.js')

describe('assertCollection', () => {
  it('accepts normal collection names', () => {
    expect(assertCollection('orders')).toBe('orders')
    expect(assertCollection('app.events-2026')).toBe('app.events-2026')
  })

  it.each(['', 'system.users', '_nicerbase', 'has space', 'a/b', 'x'.repeat(121)])(
    'rejects %j',
    (name) => {
      expect(() => assertCollection(name)).toThrow(DataError)
    }
  )
})
