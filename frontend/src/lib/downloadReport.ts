import { getToken } from '../api'

/** Pull plain text from Express HTML error pages (e.g. <pre>Cannot GET …</pre>). */
function messageFromBody(text: string, status: number): string {
  const pre = text.match(/<pre[^>]*>([^<]+)<\/pre>/i)
  if (pre?.[1]) return pre[1].trim()

  const trimmed = text.trim()
  if (trimmed.startsWith('<!') || trimmed.startsWith('<html')) {
    if (status === 404) {
      return 'Report not found (404). Restart the API after updating, or run `npm run build` in backend if you use `npm start`.'
    }
    return `Server error (${status}). Check that the API is running on port 4000.`
  }

  return trimmed.slice(0, 280)
}

export type ReportExportFormat = 'csv' | 'pdf'

function buildReportUrl(path: string, format: ReportExportFormat): string {
  const q = path.indexOf('?')
  const base = q === -1 ? path : path.slice(0, q)
  const params = new URLSearchParams(q === -1 ? '' : path.slice(q + 1))
  params.set('format', format)
  // Bust browser / dev-proxy caches so PDF/CSV always reflect the current API code.
  params.set('nc', String(Date.now()))
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

function sniffNonPdfBody(u8: Uint8Array): string {
  if (u8.length >= 3 && u8[0] === 0xef && u8[1] === 0xbb && u8[2] === 0xbf) {
    return 'The file is CSV (UTF-8 BOM), not PDF — the server did not honor format=pdf. Restart the backend after updating, or run npm run build if you use npm start.'
  }
  if (u8.length >= 2 && u8[0] === 0x7b && u8[1] === 0x22) {
    return 'The response is JSON, not PDF — the report request likely failed on the server.'
  }
  if (
    u8.length >= 9 &&
    u8[0] === 0x3c &&
    u8[1] === 0x21 &&
    String.fromCharCode(...u8.slice(0, 9)).toUpperCase() === '<!DOCTYPE'
  ) {
    return 'The response is HTML, not PDF — check that the API is running and the /api/reports routes exist.'
  }
  return 'The response does not start with a PDF signature. Check the API and try again.'
}

/**
 * GET a report with auth (`?format=csv` default, or `format=pdf`) and trigger a browser download.
 */
export async function downloadReport(
  path: string,
  fallbackFilename: string,
  format: ReportExportFormat = 'csv',
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('Not signed in')

  const url = buildReportUrl(path, format)
  const accept = format === 'pdf' ? 'application/pdf' : 'text/csv'

  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      Accept: `${accept}, */*`,
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let msg = res.statusText
    try {
      const j = text ? JSON.parse(text) : null
      if (j?.error) msg = typeof j.error === 'string' ? j.error : JSON.stringify(j.error)
    } catch {
      if (text) msg = messageFromBody(text, res.status)
    }
    throw new Error(msg || 'Download failed')
  }

  const ab = await res.arrayBuffer()
  if (format === 'pdf') {
    const u8 = new Uint8Array(ab)
    const isPdfAt =
      u8.length >= 5 &&
      u8[0] === 0x25 &&
      u8[1] === 0x50 &&
      u8[2] === 0x44 &&
      u8[3] === 0x46 &&
      u8[4] === 0x2d
    const isPdfAfterBom =
      u8.length >= 8 &&
      u8[0] === 0xef &&
      u8[1] === 0xbb &&
      u8[2] === 0xbf &&
      u8[3] === 0x25 &&
      u8[4] === 0x50 &&
      u8[5] === 0x44 &&
      u8[6] === 0x46 &&
      u8[7] === 0x2d
    if (!isPdfAt && !isPdfAfterBom) {
      throw new Error(sniffNonPdfBody(u8))
    }
  }

  const mime =
    format === 'pdf' ? 'application/pdf' : 'text/csv;charset=utf-8'
  const blob = new Blob([ab], { type: mime })
  const cd = res.headers.get('Content-Disposition')
  let filename =
    format === 'pdf' && fallbackFilename.endsWith('.csv')
      ? fallbackFilename.replace(/\.csv$/i, '.pdf')
      : fallbackFilename
  const m = cd?.match(/filename="?([^";]+)"?/i)
  if (m?.[1]) filename = m[1]

  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  const ext = format === 'pdf' ? '.pdf' : '.csv'
  a.download = filename.endsWith(ext) ? filename : `${filename.replace(/\.(csv|pdf)$/i, '')}${ext}`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(blobUrl)
}
