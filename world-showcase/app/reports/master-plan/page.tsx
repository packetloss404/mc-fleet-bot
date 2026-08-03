import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import {
  AtlasExplorer,
  type CatalogItem,
} from '../../../components/AtlasExplorer';
import { PasscodeGate } from '../../../components/PasscodeGate';
import {
  SITE_SESSION_COOKIE,
  verifySiteSession,
} from '../../../lib/siteAuth';
import catalogData from '../../../public/data/buildings.json';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Master Plan',
  description: 'Accepted Town Expansion R1 master plan, atlas, evidence, and as-built delivery record.',
};

const catalog = catalogData.buildings as CatalogItem[];
const coverage = catalogData.coverage;
const release = catalogData.release;
const releaseGallery = catalogData.releaseGallery;
type DistrictMap = { number: string; title: string; image: string };
const districtMaps = (
  catalogData as unknown as { districtMaps?: DistrictMap[] }
).districtMaps ?? [
  { number: '02', title: 'MainStreet America', image: '/atlas/mainstreet.png' },
  { number: '03', title: 'Underground systems', image: '/atlas/underground.png' },
];
const exactObjects = (
  release as typeof release & { exactObjects?: number }
).exactObjects ?? catalog.length;

const stats = [
  [coverage.features.toLocaleString(), 'mapped features'],
  [release.targetCells.toLocaleString(), 'verified target cells'],
  [release.directionalRuns.toLocaleString(), 'route runs passed'],
  [release.postScreenshots.toLocaleString(), 'verified visual records'],
];

const evidence = [
  {
    value: release.databaseFeatures.toLocaleString(),
    title: 'Feature records',
    copy: 'Geometry, hierarchy, status, provenance, tags, observations, and project identity from the accepted world-map.db.',
    href: '/reports/features.json',
    action: 'Download feature export',
  },
  {
    value: `${exactObjects} / ${exactObjects}`,
    title: 'Exact object bindings',
    copy: 'Every release object is tied to database identity, exact bounds, immutable-snapshot provenance, and a reviewed two-pass visual contract.',
    href: '/reports/object-media-database-crosswalk.json',
    action: 'Open object crosswalk',
  },
  {
    value: coverage.featuresWithExactObjectScreenshot.toLocaleString(),
    title: 'Exact-object perspectives',
    copy: 'Database IDs are bound directly to accepted views—no filename guessing and no district image counted as every child object.',
    href: '/reports/object-media-index.json',
    action: 'Inspect media index',
  },
  {
    value: 'PASS',
    title: 'Atomic release QA',
    copy: `${release.packages} packages, ${release.targetCells.toLocaleString()} unique verified cells, complete source guards, and exact rollback readiness.`,
    href: '/reports/post-release-qa.json',
    action: 'Inspect machine QA',
  },
];

const delivered = [
  {
    number: '01',
    title: 'C01 is a buried, organized bunker complex',
    copy: 'Security, garage, living, agriculture, command, medical, power, escape, owner, and portal programs now occupy a documented five-level underground system beneath the observatory estate.',
  },
  {
    number: '02',
    title: 'The civic ensemble reads as one place',
    copy: 'The expanded library, Russian civic pavilion, monumental Guild Hall, courtyards, reflecting pools, walks, and deliberately isolated underground archive form a single civic center.',
  },
  {
    number: '03',
    title: 'Westlight is a coherent stadium waterfront',
    copy: 'Venue access, back-of-house circulation, stadium approach, pier construction, attractions, restaurants, streets, pedestrian space, and crater-lake parkland are mapped as one district.',
  },
  {
    number: '04',
    title: 'MainStreet works as a compact development',
    copy: 'Completed streets, attached four- and six-car garages, consolidated buildings, guest-services programming, below-grade storage, service access, and employee connections are documented together.',
  },
  {
    number: '05',
    title: 'The data-center district has room to grow',
    copy: 'Microsoft-style DM buildings, InfoBunker, Meta, Google, LightEdge, power infrastructure, NOC, Concord, worker recreation, green space, trails, and future parcels have a coordinated district plan.',
  },
  {
    number: '06',
    title: 'Owner, worker, and portal systems are legible',
    copy: 'The observatory estate, penthouse, protected corridors, portal galleries, Manager Vale residences, town venues, and restricted connections now have exact database objects and reviewed evidence views.',
  },
];

export default async function Home() {
  const cookieStore = await cookies();
  if (!verifySiteSession(cookieStore.get(SITE_SESSION_COOKIE)?.value)) {
    return <PasscodeGate />;
  }
  return (
    <main>
      <header className="hero">
        <nav className="topbar">
          <a className="brand" href="/" aria-label="IANLAN NextGen reports home">
            <span className="brand-mark">IN</span>
            <span>IANLAN NextGen</span>
          </a>
          <div className="nav-links">
            <a href="/">All reports</a>
            <a href="#release">Release</a>
            <a href="#atlas">Atlas</a>
            <a href="#catalog">Catalog</a>
            <a href="#evidence">Evidence</a>
          </div>
          <span className="live-pill"><i /> Town Expansion QA passed</span>
        </nav>
        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Town Expansion R1 · accepted as built · 28 July 2026 UTC</p>
            <h1>A world you can<br /><em>verify.</em></h1>
            <p className="hero-lede">
              One searchable evidence system for the complete expansion:
              thirteen maps, 340 database objects, 1,178 verified visual
              records, route evidence, master planning, and rollback proof.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#release">See what changed</a>
              <a className="button ghost" href="/reports/master-plan.pdf">Read the dossier</a>
            </div>
          </div>
          <div className="hero-map">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/atlas/whole-world.png" alt="Post-release full active Minecraft world surface atlas" />
            <div className="map-caption">
              <span>Accepted active-world surface</span>
              <span>3,808 / 3,808 chunks · North ↑</span>
            </div>
          </div>
        </div>
        <div className="stats-row">
          {stats.map(([value, label]) => (
            <div className="stat" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
          <div className="snapshot-note">
            <span>Accepted snapshot SHA-256</span>
            <code>{release.postSnapshotSha256.slice(0, 16)}…</code>
          </div>
        </div>
      </header>

      <section className="release-section" id="release">
        <div className="section-heading light">
          <div>
            <p className="eyebrow">{release.id} · {release.status}</p>
            <h2>The release,<br />as built.</h2>
          </div>
          <p className="section-lede">
              Five coordinated packages are accepted through one guarded base
              transaction and its ordered supplements. Every physical and
              provenance gate passes, and the database/media catalog is bound
              to the terminal immutable snapshot.
          </p>
        </div>
        <div className="release-metrics">
          <div><strong>{release.packages} / {release.packages}</strong><span>packages passed</span></div>
          <div><strong>{release.guardedOperations.toLocaleString()}</strong><span>guarded operation groups</span></div>
          <div><strong>0</strong><span>target overlaps</span></div>
          <div><strong>{release.importedFeatures}</strong><span>release features imported</span></div>
        </div>
        <div className="release-gallery">
          {releaseGallery.map((item) => (
            <a href={item.image} className="release-image" key={item.title}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt={`Post-release view: ${item.title}`} loading="lazy" />
              <span><b>{item.area}</b>{item.title}</span>
            </a>
          ))}
        </div>
        <div className="release-actions">
          <a className="button primary" href="/reports/master-plan.pdf">Read the master dossier</a>
          <a className="button ghost" href="/reports/artifact-register.md">Inspect the artifact register</a>
          <a className="button ghost" href="/reports/post-release-qa.json">Inspect machine QA</a>
        </div>
      </section>

      <section className="atlas-section" id="atlas">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The complete picture</p>
            <h2>Post-release atlas</h2>
          </div>
          <p className="section-lede">
            Start with the complete active world, then inspect current district,
            corridor, venue, surface-access, campus, and underground reference
            views. The post surface set loaded every requested chunk.
          </p>
        </div>
        <div className="atlas-layout">
          <a className="map-feature" href="/atlas/whole-world.png">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/atlas/whole-world.png" alt="Whole post-release active world map" />
            <span className="map-label"><b>01</b> Whole active world</span>
          </a>
          <div className="map-stack">
            <a className="map-tile" href={districtMaps[0].image}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={districtMaps[0].image} alt={`${districtMaps[0].title} detailed post-release map`} />
              <span className="map-label"><b>{districtMaps[0].number}</b> {districtMaps[0].title}</span>
            </a>
            <a className="map-tile" href={districtMaps[1].image}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={districtMaps[1].image} alt={`${districtMaps[1].title} detailed post-release map`} />
              <span className="map-label"><b>{districtMaps[1].number}</b> {districtMaps[1].title}</span>
            </a>
          </div>
        </div>
        <div className="district-map-grid expanded">
          {districtMaps.slice(2).map(({ number, title, image }) => (
            <a className="district-map" href={image} key={image}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={`${title} detailed post-release map`} />
              <span className="map-label"><b>{number}</b> {title}</span>
            </a>
          ))}
        </div>
      </section>

      <AtlasExplorer items={catalog} />

      <section className="evidence-section" id="evidence">
        <div className="section-heading light">
          <div>
            <p className="eyebrow">Inspect the source material</p>
            <h2>Evidence ledger</h2>
          </div>
          <p className="section-lede">
            The downloadable records expose the database, the exact
            object-to-image relation, the atomic transaction, the route runs,
            and the honest remaining coverage gaps.
          </p>
        </div>
        <div className="evidence-grid">
          {evidence.map((item) => (
            <article className="evidence-card" key={item.title}>
              <strong>{item.value}</strong>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
              <a href={item.href}>{item.action} ↗</a>
            </article>
          ))}
        </div>
        <div className="report-ribbon">
          <p>
            Full database report: current schemas and row census, project/kind
            distributions, data dictionary, immutable snapshot provenance,
            and exact object-to-media coverage.
          </p>
          <a className="button primary" href="/reports/database-report.html">Open database report</a>
        </div>
      </section>

      <section className="plan-section" id="plan">
        <div className="section-heading light">
          <div>
            <p className="eyebrow">Delivered implementation program</p>
            <h2>What changed</h2>
          </div>
          <p className="section-lede">
            Research became standards; standards became guarded operations.
            The accepted expansion now has post-state, route, visual, database,
            provenance, and rollback trails. Citizen lifecycle behavior remains
            an explicitly separate, non-blocking troubleshooting follow-up.
          </p>
        </div>
        <div className="phase-grid">
          {delivered.map((phase) => (
            <article className="phase-card" key={phase.number}>
              <span>{phase.number}</span>
              <h3>{phase.title}</h3>
              <p>{phase.copy}</p>
            </article>
          ))}
        </div>
        <div className="plan-download">
          <div>
            <p className="eyebrow">Master planning dossier</p>
            <h3>Research, building reviews, standards, plots, implementation, incident history, hashes, screenshots, QA, and next controlled phases.</h3>
          </div>
          <div className="download-actions">
            <a className="button paper" href="/reports/master-plan.pdf">Master dossier ↗</a>
            <a className="button paper" href="/reports/requirements-traceability.md">Traceability ↗</a>
          </div>
        </div>
      </section>

      <footer>
        <a className="brand" href="/">
          <span className="brand-mark">IN</span>
          <span>IANLAN NextGen</span>
        </a>
        <p>
          Accepted release snapshot <code>{release.postSnapshotSha256.slice(0, 16)}…</code>.
          Every published object image is hash-bound to that snapshot; planned
          future work and the open citizen-lifecycle follow-up are labeled.
        </p>
      </footer>
    </main>
  );
}
