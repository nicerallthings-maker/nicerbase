import { describe, expect, it, vi } from 'vitest'

vi.mock('./db.js', () => ({ pool: {} }))
const { AuthError, validateSignUp } = await import('./auth.js')

describe('validateSignUp', () => {
  it('normalizes email and trims name', () => {
    expect(
      validateSignUp({ name: ' Ada ', email: ' Ada@Example.COM ', password: 'longenough1' })
    ).toEqual({ name: 'Ada', email: 'ada@example.com', password: 'longenough1' })
  })

  it.each([
    [{ name: '', email: 'a@b.co', password: 'longenough1' }, 'Enter your name.'],
    [{ name: 'A', email: 'nope', password: 'longenough1' }, 'Enter a valid email address.'],
    [{ name: 'A', email: 'a@b.co', password: 'short' }, 'Use at least 10 characters'],
  ])('rejects invalid input %#', (input, message) => {
    expect(() => validateSignUp(input)).toThrow(AuthError)
    expect(() => validateSignUp(input)).toThrow(message)
  })
})
