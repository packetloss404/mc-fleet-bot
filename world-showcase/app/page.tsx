import { SiteHeader } from '../components/SiteHeader';
import { masterPlanReport } from '../lib/reports';

export const dynamic = 'force-dynamic';

export default async function ReportsHome() {
  return (
    <main className="workspace">
      <SiteHeader />
      <header className="workspace-header">
        <div className="workspace-hero">
          <div>
            <p className="eyebrow">IANLAN intelligence layer · public access</p>
            <h1>One world.<br /><em>One master plan.</em></h1>
          </div>
          <div className="workspace-intro">
            <p>
              Start with the current Master Plan. Bunker construction,
              underground navigation, the coordinate directory, and Empty Eight
              are evidence chapters underneath it—not separate plans competing
              for authority.
            </p>
            <div className="workspace-principles">
              <span>Evidence first</span>
              <span>Versioned</span>
              <span>Delegation-ready</span>
            </div>
          </div>
        </div>
      </header>

      <section className="report-library" aria-labelledby="reports-title">
        <div className="library-heading">
          <div>
            <p className="eyebrow">Report 01 · Master Plan</p>
            <h2 id="reports-title">One report.<br />One build queue.</h2>
          </div>
          <p>
            This is not a library of separate plans. Open the Master Plan; its
            evidence chapters provide the maps, screenshots, coordinates, and
            construction-status detail needed to execute the queue.
          </p>
        </div>

        <a className="master-plan-entry" href={masterPlanReport.href}>
          <div>
            <p>{masterPlanReport.project}</p>
            <h3>{masterPlanReport.title}</h3>
            <span>{masterPlanReport.status} · published {masterPlanReport.published}</span>
          </div>
          <div>
            <p>{masterPlanReport.summary}</p>
            <b>Open the Master Plan ↗</b>
          </div>
        </a>
      </section>

      <footer className="workspace-footer">
        <a className="brand" href="/">
          <span className="brand-mark">IN</span>
          <span>IANLAN NextGen</span>
        </a>
        <p>
          One authoritative Master Plan. Maps, evidence, coordinates, and
          construction status live inside it as chapters.
        </p>
      </footer>
    </main>
  );
}
