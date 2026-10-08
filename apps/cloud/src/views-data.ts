import type { User } from './auth.js'
import type { QueryResult, TableSummary } from './data.js'
import { MAX_RESULT_ROWS, PAGE_SIZE } from './data.js'
import { html, SafeHtml } from './html.js'
import { icon } from './icons.js'
import type { Project } from './projects.js'
import { appLayout, projectHeader, ProjectTab } from './views.js'

function projectShell(
  user: User,
  project: Project,
  active: ProjectTab,
  title: string,
  body: SafeHtml,
  alerts: { notice?: string; error?: string } = {}
) {
  return appLayout(
    { title: `${title} · ${project.name}`, user, active: 'projects' },
    html`${projectHeader(project, active)}
    ${alerts.notice ? html`<div class="alert alert-ok" role="status">${alerts.notice}</div>` : ''}
    ${alerts.error ? html`<div class="alert alert-error" role="alert">${alerts.error}</div>` : ''}
    ${body}`
  )
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return html`<span class="null">NULL</span>`
  let text: string
  if (value instanceof Date) text = value.toISOString()
  else if (typeof value === 'object') text = JSON.stringify(value)
  else text = String(value)
  return text.length > 200 ? `${text.slice(0, 199)}…` : text
}

export function resultTable(result: QueryResult) {
  if (result.columns.length === 0) {
    return html`<p class="hint">
      ${result.command || 'Done'}${result.rowCount !== null
        ? ` · ${result.rowCount} row${result.rowCount === 1 ? '' : 's'} affected`
        : ''}
      · ${result.durationMs} ms
    </p>`
  }
  return html` <div class="table-wrap">
      <table class="data">
        <thead>
          <tr>
            ${result.columns.map((c) => html`<th>${c}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${result.rows.map(
            (row) =>
              html`<tr>
                ${row.map((cell) => html`<td>${formatCell(cell)}</td>`)}
              </tr>`
          )}
        </tbody>
      </table>
    </div>
    <p class="hint">
      ${result.rows.length}
      row${result.rows.length === 1 ? '' : 's'}${result.truncated
        ? ` (first ${MAX_RESULT_ROWS} shown)`
        : ''}
      · ${result.durationMs} ms
    </p>`
}

function pager(base: string, page: number, total: number, extra = '') {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  return html`<div class="pager">
    <span class="hint">${total.toLocaleString()} total · page ${page + 1} of ${pages}</span>
    ${page > 0
      ? html`<a class="btn btn-small" href="${base}?page=${page - 1}${extra}">Previous</a>`
      : ''}
    ${page + 1 < pages
      ? html`<a class="btn btn-small" href="${base}?page=${page + 1}${extra}">Next</a>`
      : ''}
  </div>`
}

// ---------------------------------------------------------------------------
// Postgres
// ---------------------------------------------------------------------------

export function tablesPage(user: User, project: Project, tables: TableSummary[]) {
  const body =
    tables.length === 0
      ? html`<div class="glass card empty">
          <h3 style="margin-top:0">No tables yet</h3>
          <p>Create one in the SQL editor, for example:</p>
          <pre style="text-align:left;display:inline-block">
create table todos (
  id bigint generated always as identity primary key,
  title text not null,
  done boolean default false
);</pre
          >
          <p><a class="btn btn-primary" href="/projects/${project.ref}/sql">Open SQL editor</a></p>
        </div>`
      : html`<div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Schema</th>
                <th>Type</th>
                <th style="text-align:right">Rows (est.)</th>
              </tr>
            </thead>
            <tbody>
              ${tables.map(
                (t) =>
                  html`<tr>
                    <td>
                      <a
                        href="/projects/${project.ref}/tables/${encodeURIComponent(
                          t.schema
                        )}/${encodeURIComponent(t.name)}"
                        >${t.name}</a
                      >
                    </td>
                    <td class="hint">${t.schema}</td>
                    <td class="hint">${t.kind}</td>
                    <td style="text-align:right">${t.rows.toLocaleString()}</td>
                  </tr>`
              )}
            </tbody>
          </table>
        </div>`
  return projectShell(user, project, 'tables', 'Tables', body)
}

export function tableRowsPage(
  user: User,
  project: Project,
  schema: string,
  table: string,
  data: { result: QueryResult; total: number },
  page: number
) {
  const base = `/projects/${project.ref}/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}`
  return projectShell(
    user,
    project,
    'tables',
    table,
    html`<div class="row" style="margin-bottom:12px">
        <a class="crumb" href="/projects/${project.ref}/tables">Tables</a><span class="hint">/</span
        ><strong class="mono">${schema}.${table}</strong>
      </div>
      ${resultTable(data.result)} ${pager(base, page, data.total)}`
  )
}

export function sqlPage(
  user: User,
  project: Project,
  sql: string,
  result?: QueryResult,
  error?: string
) {
  return projectShell(
    user,
    project,
    'sql',
    'SQL Editor',
    html`<form method="post" action="/projects/${project.ref}/sql" class="stack">
        <label for="sql" class="sr-only">SQL</label>
        <textarea
          id="sql"
          name="sql"
          class="code-input"
          rows="10"
          spellcheck="false"
          placeholder="select now();"
        >
${sql}</textarea
        >
        <div class="row">
          <button class="btn btn-primary" type="submit">Run</button
          ><span class="hint"
            >Runs as your project's database user · 15 s timeout · Ctrl/⌘ + Enter to run</span
          >
        </div>
      </form>
      <div style="margin-top:20px">
        ${error ? html`<div class="alert alert-error" role="alert">${error}</div>` : ''}
        ${result ? resultTable(result) : ''}
      </div>`
  )
}

// ---------------------------------------------------------------------------
// MongoDB
// ---------------------------------------------------------------------------

export function collectionsPage(
  user: User,
  project: Project,
  collections: Array<{ name: string; count: number }>,
  alerts: { notice?: string; error?: string } = {}
) {
  return projectShell(
    user,
    project,
    'collections',
    'Collections',
    html` <form
        method="post"
        action="/projects/${project.ref}/collections"
        class="row"
        style="margin-bottom:20px;flex-wrap:wrap"
      >
        <label for="collection" class="sr-only">Collection name</label>
        <input
          id="collection"
          name="name"
          type="text"
          placeholder="new_collection"
          required
          maxlength="120"
          style="flex:1;min-width:200px"
        />
        <button class="btn btn-primary" type="submit">Create collection</button>
      </form>
      ${collections.length === 0
        ? html`<div class="glass card empty">
            <h3 style="margin-top:0">No collections yet</h3>
            <p>
              Create a collection above, or insert from your app; MongoDB creates collections on
              first write.
            </p>
          </div>`
        : html`<div class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Collection</th>
                  <th style="text-align:right">Documents</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${collections.map(
                  (c) =>
                    html`<tr>
                      <td>
                        <a href="/projects/${project.ref}/collections/${encodeURIComponent(c.name)}"
                          >${c.name}</a
                        >
                      </td>
                      <td style="text-align:right">${c.count.toLocaleString()}</td>
                      <td style="text-align:right">
                        <form
                          method="post"
                          action="/projects/${project.ref}/collections/${encodeURIComponent(
                            c.name
                          )}/drop"
                          data-confirm="Delete collection ${c.name} and all of its documents? This can't be undone."
                          style="margin:0"
                        >
                          <button class="btn btn-small btn-danger" type="submit">Delete</button>
                        </form>
                      </td>
                    </tr>`
                )}
              </tbody>
            </table>
          </div>`}`,
    alerts
  )
}

export function collectionPage(
  user: User,
  project: Project,
  name: string,
  data: { total: number; documents: Array<{ id: string; json: string }> } | undefined,
  options: { filter: string; page: number; notice?: string; error?: string; draft?: string }
) {
  const base = `/projects/${project.ref}/collections/${encodeURIComponent(name)}`
  return projectShell(
    user,
    project,
    'collections',
    name,
    html` <div class="row" style="margin-bottom:12px">
        <a class="crumb" href="/projects/${project.ref}/collections">Collections</a
        ><span class="hint">/</span><strong class="mono">${name}</strong>
      </div>
      <form method="get" action="${base}" class="row" style="margin-bottom:16px;flex-wrap:wrap">
        <label for="filter" class="sr-only">Filter</label>
        <input
          id="filter"
          name="filter"
          type="text"
          class="mono"
          value="${options.filter}"
          placeholder='Filter, e.g. { "status": "active" }'
          style="flex:1;min-width:220px"
        />
        <button class="btn" type="submit">Apply filter</button>
      </form>
      <details class="glass card" style="margin-bottom:16px" ${options.draft ? html`open` : ''}>
        <summary>${icon('chevron', 16)} Insert document</summary>
        <form method="post" action="${base}/insert" class="stack" style="margin-top:12px">
          <label for="document" class="sr-only">Document</label>
          <textarea
            id="document"
            name="document"
            class="code-input"
            rows="8"
            spellcheck="false"
            placeholder='{ "title": "Hello", "createdAt": { "$date": "2026-01-01T00:00:00Z" } }'
          >
${options.draft ?? ''}</textarea
          >
          <div><button class="btn btn-primary" type="submit">Insert document</button></div>
        </form>
      </details>
      ${data && data.documents.length === 0
        ? html`<div class="glass card empty">
            <p>
              ${options.filter ? 'No documents match this filter.' : 'This collection is empty.'}
            </p>
          </div>`
        : ''}
      ${data
        ? html`<div class="stack">
              ${data.documents.map(
                (doc) =>
                  html`<div class="glass card doc">
                    <pre>${doc.json}</pre>
                    <form
                      method="post"
                      action="${base}/delete"
                      data-confirm="Delete this document? This can't be undone."
                      style="margin:0"
                    >
                      <input type="hidden" name="id" value="${doc.id}" />
                      <button class="btn btn-small btn-danger" type="submit">Delete</button>
                    </form>
                  </div>`
              )}
            </div>
            ${pager(
              base,
              options.page,
              data.total,
              options.filter ? `&filter=${encodeURIComponent(options.filter)}` : ''
            )}`
        : ''}`,
    { notice: options.notice, error: options.error }
  )
}
