import { describe, expect, it } from 'vitest'

import { getDocumentIdKey, getDocumentPreview, validateJsonObject } from './MongoDB.utils'

describe('getDocumentIdKey', () => {
  it('serializes ObjectId extended JSON', () => {
    expect(getDocumentIdKey({ _id: { $oid: '65f0c0ffee' }, a: 1 })).toBe('{"$oid":"65f0c0ffee"}')
  })
  it('serializes primitive ids', () => {
    expect(getDocumentIdKey({ _id: 42 })).toBe('42')
  })
})

describe('getDocumentPreview', () => {
  it('omits _id', () => {
    expect(getDocumentPreview({ _id: 1, name: 'Ada' })).toBe('{"name":"Ada"}')
  })
  it('truncates long documents', () => {
    const preview = getDocumentPreview({ text: 'x'.repeat(500) }, 20)
    expect(preview).toHaveLength(20)
    expect(preview.endsWith('…')).toBe(true)
  })
})

describe('validateJsonObject', () => {
  it('accepts empty input and objects', () => {
    expect(validateJsonObject('')).toBeUndefined()
    expect(validateJsonObject('{"a":1}')).toBeUndefined()
  })
  it('rejects arrays, primitives and invalid JSON', () => {
    expect(validateJsonObject('[1]')).toBeDefined()
    expect(validateJsonObject('3')).toBeDefined()
    expect(validateJsonObject('{a:1}')).toBeDefined()
  })
})
