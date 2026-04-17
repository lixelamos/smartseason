const shortFmt = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatShortDate(iso: string): string {
  return shortFmt.format(new Date(iso))
}

/** Short relative label for recent activity. */
export function formatRelativeTime(iso: string): string {
  const sec = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 45) return 'Just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`
  if (sec < 2_592_000) return `${Math.floor(sec / 604800)}w ago`
  return formatShortDate(iso)
}

/** Calendar date + relative hint for feeds. */
export function formatFeedTimestamp(iso: string): string {
  return `${formatShortDate(iso)} · ${formatRelativeTime(iso)}`
}
