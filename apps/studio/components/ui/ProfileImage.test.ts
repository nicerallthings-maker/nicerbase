import { describe, expect, it } from 'vitest'

import { getInitials } from './ProfileImage'

describe('getInitials', () => {
  it('uses the first and last name', () => {
    expect(getInitials('Ada Lovelace')).toBe('AL')
    expect(getInitials('Grace Brewster Hopper')).toBe('GH')
  })

  it('uses the first two letters of a single name', () => {
    expect(getInitials('johndoe')).toBe('JO')
  })

  it('returns an empty string without a name', () => {
    expect(getInitials(undefined)).toBe('')
    expect(getInitials('   ')).toBe('')
  })
})
