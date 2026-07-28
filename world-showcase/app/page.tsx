import { cookies } from 'next/headers';

import { PasscodeGate } from '../components/PasscodeGate';
import {
  SITE_SESSION_COOKIE,
  verifySiteSession,
} from '../lib/siteAuth';
import { reports } from '../lib/reports';

export const dynamic = 'force-dynamic';

export default async function ReportsHome() {
  const cookieStore = await cookies();
  if (!verifySiteSession(cookieStore.get(SITE_SESSION_COOKIE)?.value)) {
    return <PasscodeGate />;
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <nav className="workspace-nav">
          <a className="brand" href="/" aria-label="IANLAN NextGen reports home">
            <span className="brand-mark">IN</span>
            <span>IANLAN NextGen</span>
          </a>
          <div className="workspace-nav-copy">
            <span>Private reports workspace</span>
            <i />
            <span>
              {reports.length.toString().padStart(2, '0')} live
              {reports.length === 1 ? ' report' : ' reports'}
            </span>
          </div>
        </nav>

        <div className="workspace-hero">
          <div>
            <p className="eyebrow">IANLAN intelligence layer · authenticated</p>
            <h1>Every job.<br /><em>One clear record.</em></h1>
          </div>
          <div className="workspace-intro">
            <p>
              Open the current master plan, then place each future project,
              investigation, release, or specialist job beside it as its own
              report.
            </p>
            <div className="workspace-principles">
              <span>Evidence first</span>
              <span>Versioned</span>
              <span>Built for review</span>
            </div>
          </div>
        </div>
      </header>

      <section className="report-library" aria-labelledby="reports-title">
        <div className="library-heading">
          <div>
            <p className="eyebrow">Report library</p>
            <h2 id="reports-title">Current reports</h2>
          </div>
          <p>
            Each report is a self-contained project surface with its own
            narrative, evidence, downloads, and status.
          </p>
        </div>

        <div className="report-grid">
          {reports.map((report) => (
            <a className="report-card" href={report.href} key={report.slug}>
              <div className="report-cover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={report.image} alt="" />
                <span className="report-number">{report.number}</span>
                <span className="report-status"><i /> {report.status}</span>
              </div>
              <div className="report-card-body">
                <p className="report-project">{report.project}</p>
                <h3>{report.title}</h3>
                <p className="report-summary">{report.summary}</p>
                <div className="report-metrics">
                  {report.metrics.map((metric) => (
                    <span key={metric.label}>
                      <b>{metric.value}</b>
                      {metric.label}
                    </span>
                  ))}
                </div>
                <div className="report-open">
                  <span>Published {report.published}</span>
                  <b>Open report ↗</b>
                </div>
              </div>
            </a>
          ))}

          <article className="report-card report-card-empty">
            <div className="empty-mark">+</div>
            <div>
              <p className="report-project">Next job</p>
              <h3>A new report belongs here.</h3>
              <p className="report-summary">
                Future reports will sit beside the current library with the same
                structured status, evidence, and review experience.
              </p>
            </div>
            <span className="empty-note">Report slot ready</span>
          </article>
        </div>
      </section>

      <footer className="workspace-footer">
        <a className="brand" href="/">
          <span className="brand-mark">IN</span>
          <span>IANLAN NextGen</span>
        </a>
        <p>
          A private, expanding library for plans, investigations, delivery
          records, and job-specific evidence.
        </p>
      </footer>
    </main>
  );
}
