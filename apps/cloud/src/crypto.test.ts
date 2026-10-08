import { describe, expect, it } from 'vitest'

import { decrypt, encrypt, hashPassword, randomId, verifyPassword } from './crypto.js'

describe('password hashing', () => {
  it('verifies the right password and rejects the wrong one', async () => {
    const hash = await hashPassword('correct horse battery')
    expect(hash.startsWith('scrypt$')).toBe(true)
    expect(await verifyPassword('correct horse battery', hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })

  it('rejects malformed hashes', async () => {
    expect(await verifyPassword('x', 'plain')).toBe(false)
  })
})

describe('secret encryption', () => {
  it('round-trips and fails with another key', () => {
    const sealed = encrypt('s3cret', 'key-one')
    expect(decrypt(sealed, 'key-one')).toBe('s3cret')
    expect(() => decrypt(sealed, 'key-two')).toThrow()
  })
})

describe('randomId', () => {
  it('only uses identifier-safe characters', () => {
    expect(randomId(64)).toMatch(/^[a-z0-9]{64}$/)
  })
})
