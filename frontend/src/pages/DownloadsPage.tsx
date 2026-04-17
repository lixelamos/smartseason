import { useCallback, useState } from 'react'
import { IconActivity, IconDownload, IconTable } from '../components/Icons'
import { downloadReport, type ReportExportFormat } from '../lib/downloadReport'
import { useToast } from '../toast'

export function DownloadsPage() {
  const { showToast } = useToast()
  const [reportBusy, setReportBusy] = useState<string | null>(null)

  const downloadFieldsReport = useCallback(
    async (format: ReportExportFormat) => {
      setReportBusy(`fields-${format}`)
      try {
        await downloadReport('/api/reports/fields', 'smartseason-fields.csv', format)
        showToast(
          format === 'pdf' ? 'Field register (PDF) downloaded' : 'Field register (CSV) downloaded',
          'success',
        )
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Download failed', 'error')
      } finally {
        setReportBusy(null)
      }
    },
    [showToast],
  )

  const downloadActivityReport = useCallback(
    async (format: ReportExportFormat) => {
      setReportBusy(`activity-${format}`)
      try {
        await downloadReport('/api/reports/updates', 'smartseason-activity.csv', format)
        showToast(
          format === 'pdf' ? 'Activity log (PDF) downloaded' : 'Activity log (CSV) downloaded',
          'success',
        )
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Download failed', 'error')
      } finally {
        setReportBusy(null)
      }
    },
    [showToast],
  )

  return (
    <div>
      <header className="page-head">
        <h1>Downloads</h1>
        <p className="muted">
          UTF-8 CSV or PDF · Same access as your account · CSV opens in Excel or Sheets; PDF for
          printing or sharing
        </p>
      </header>

      <section className="reports-section" aria-labelledby="downloads-reports-heading">
        <h2 id="downloads-reports-heading" className="sr-only">
          Export options
        </h2>
        <div className="reports-grid">
          <article className="report-card report-card--fields">
            <div className="report-card__strip" aria-hidden />
            <div className="report-card__body">
              <div className="report-card__icon" aria-hidden>
                <IconTable size={24} />
              </div>
              <div className="report-card__text">
                <h3 className="report-card__name">Field register</h3>
                <p className="report-card__desc">
                  One row per plot: crop, planting date, lifecycle stage, computed status, and
                  assignee.
                </p>
              </div>
              <div className="report-card__actions">
                <button
                  type="button"
                  className="btn"
                  disabled={reportBusy !== null}
                  onClick={() => void downloadFieldsReport('csv')}
                >
                  <IconDownload size={18} />
                  {reportBusy === 'fields-csv' ? 'Preparing…' : 'CSV'}
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={reportBusy !== null}
                  onClick={() => void downloadFieldsReport('pdf')}
                >
                  <IconDownload size={18} />
                  {reportBusy === 'fields-pdf' ? 'Preparing…' : 'PDF'}
                </button>
              </div>
            </div>
          </article>

          <article className="report-card report-card--activity">
            <div className="report-card__strip" aria-hidden />
            <div className="report-card__body">
              <div className="report-card__icon report-card__icon--activity" aria-hidden>
                <IconActivity size={24} />
              </div>
              <div className="report-card__text">
                <h3 className="report-card__name">Activity log</h3>
                <p className="report-card__desc">
                  Observations and stage changes with author, time, and notes (latest first, up
                  to 2&nbsp;000 rows).
                </p>
              </div>
              <div className="report-card__actions">
                <button
                  type="button"
                  className="btn"
                  disabled={reportBusy !== null}
                  onClick={() => void downloadActivityReport('csv')}
                >
                  <IconDownload size={18} />
                  {reportBusy === 'activity-csv' ? 'Preparing…' : 'CSV'}
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={reportBusy !== null}
                  onClick={() => void downloadActivityReport('pdf')}
                >
                  <IconDownload size={18} />
                  {reportBusy === 'activity-pdf' ? 'Preparing…' : 'PDF'}
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
