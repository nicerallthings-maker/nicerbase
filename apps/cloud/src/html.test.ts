import { describe, expect, it } from 'vitest'

import { html } from './html.js'

describe('html', () => {
  it('escapes interpolated values', () => {
    expect(html`<p>${'<script>"x"</script>'}</p>`.value).toBe(
      '<p>&lt;script&gt;&quot;x&quot;&lt;/script&gt;</p>'
    )
  })

  it('keeps nested templates and arrays unescaped', () => {
    const items = ['a', 'b'].map((item) => html`<li>${item}</li>`)
    // prettier-ignore
    const list = html`<ul>${items}</ul>`
    expect(list.value).toBe('<ul><li>a</li><li>b</li></ul>')
  })

  it('drops empty values', () => {
    expect(html`${undefined}${null}${false}x`.value).toBe('x')
  })
})
