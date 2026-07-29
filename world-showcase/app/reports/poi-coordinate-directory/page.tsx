import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import {
  CoordinateDirectory,
  type CoordinateCategory,
  type CoordinateRecord,
} from '../../../components/CoordinateDirectory';
import { PasscodeGate } from '../../../components/PasscodeGate';
import {
  SITE_SESSION_COOKIE,
  verifySiteSession,
} from '../../../lib/siteAuth';
import coordinateData from '../../../public/coordinates/portal-summary.json';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'POI Coordinate Directory',
  description: 'Search every cataloged IANLAN point and place of interest and copy its reference teleport command.',
};

const records = coordinateData.records as CoordinateRecord[];
const categories = coordinateData.categories as CoordinateCategory[];

export default async function PoiCoordinateDirectory() {
  const cookieStore = await cookies();
  if (!verifySiteSession(cookieStore.get(SITE_SESSION_COOKIE)?.value)) {
    return <PasscodeGate />;
  }

  return (
    <main className="coordinate-report">
      <header className="coordinate-hero" id="top">
        <nav className="topbar">
          <a className="brand" href="/" aria-label="IANLAN NextGen reports home">
            <span className="brand-mark">IN</span>
            <span>IANLAN NextGen</span>
          </a>
          <div className="nav-links">
            <a href="/">All reports</a>
            <a href="#directory">Directory</a>
            <a href="#downloads">Downloads</a>
          </div>
          <span className="live-pill"><i /> 1,215 records sealed</span>
        </nav>

        <div className="coordinate-hero-grid">
          <div className="coordinate-hero-copy">
            <p className="eyebrow">Report 04 · World operator index · 29 July 2026</p>
            <h1>Every place.<br /><em>One coordinate.</em></h1>
            <p>
              Search every cataloged point and place of interest—from surface
              builds and remote sites to the named PassageWay tunnel system,
              route infrastructure, controls, and candidate parcels.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#directory">Search the directory</a>
              <a className="button ghost" href="/coordinates/poi-coordinate-directory.pdf">
                Download 135-page PDF
              </a>
            </div>
          </div>
          <div className="coordinate-command-demo">
            <span>Copy-ready operator reference</span>
            <code>/tp @s -30 -7 3</code>
            <strong>PassageWay · Raven Rock personnel arrival</strong>
            <p>
              Exact catalog points and entrances are preserved. Area records use
              a labeled derived center; records without a narrow usable Y retain
              your current elevation with <code>~</code>.
            </p>
          </div>
        </div>
        <div className="coordinate-stats">
          <div><strong>{coordinateData.counts.records.toLocaleString()}</strong><span>cataloged places</span></div>
          <div><strong>{coordinateData.counts.active.toLocaleString()}</strong><span>active records</span></div>
          <div><strong>{coordinateData.counts.exactOrAuthoredReferences.toLocaleString()}</strong><span>exact / authored refs</span></div>
          <div><strong>{coordinateData.counts.projects}</strong><span>source projects</span></div>
          <div><strong>{coordinateData.counts.pdfPages}</strong><span>PDF pages</span></div>
        </div>
      </header>

      <section className="coordinate-truth">
        <div>
          <p className="eyebrow">Use the coordinate honestly</p>
          <h2>Reference point,<br />not safe landing promise.</h2>
        </div>
        <p>
          A command is copied exactly as listed, but it is not an independently
          tested safe teleport. Bounds and polygon records use a derived center;
          paths use their first waypoint; catalog entrances and points stay exact.
          PassageWay is the proper name of the underground tunnel system. This is
          a read-only directory—no world edits were made.
        </p>
      </section>

      <CoordinateDirectory records={records} categories={categories} />

      <section className="coordinate-downloads" id="downloads">
        <div>
          <p className="eyebrow">Take the directory with you</p>
          <h2>Human and machine editions.</h2>
          <p>
            The searchable web edition, portable HTML, complete JSON/CSV, PDF,
            QA result, and artifact manifest all bind the same 1,215 records.
          </p>
        </div>
        <div className="download-grid">
          <a href="/coordinates/poi-coordinate-directory.pdf"><b>PDF directory</b><span>135 pages · every grouped place</span></a>
          <a href="/coordinates/poi-coordinate-directory.html"><b>Searchable HTML</b><span>Portable offline directory</span></a>
          <a href="/coordinates/poi-coordinate-directory.json"><b>Complete JSON</b><span>Geometry, reference, provenance</span></a>
          <a href="/coordinates/poi-coordinate-directory.csv"><b>Coordinate CSV</b><span>Spreadsheet-ready operator index</span></a>
          <a href="/coordinates/report-qa.json"><b>Report QA</b><span>All completeness gates passed</span></a>
          <a href="/coordinates/artifact-manifest.json"><b>Artifact manifest</b><span>Paths, bytes, SHA-256</span></a>
        </div>
      </section>

      <footer>
        <a className="brand" href="/">
          <span className="brand-mark">IN</span>
          <span>IANLAN NextGen</span>
        </a>
        <p>
          POI Coordinate Directory · accepted catalog snapshot
          {' '}{coordinateData.source.snapshot.sha256.slice(0, 16)}…
        </p>
      </footer>
    </main>
  );
}
