/** Escapes text for safe interpolation into HTML. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Marks a string as already-safe HTML. */
export class SafeHtml {
  constructor(readonly value: string) {}
  toString() {
    return this.value
  }
}

/** Tagged template: interpolations are escaped unless they are SafeHtml (or arrays of it). */
export function html(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
  let out = strings[0]
  values.forEach((value, i) => {
    out += render(value) + strings[i + 1]
  })
  return new SafeHtml(out)
}

function render(value: unknown): string {
  if (value === undefined || value === null || value === false) return ''
  if (value instanceof SafeHtml) return value.value
  if (Array.isArray(value)) return value.map(render).join('')
  return escapeHtml(value)
}
