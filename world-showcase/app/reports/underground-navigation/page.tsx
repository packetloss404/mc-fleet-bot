import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { PasscodeGate } from '../../../components/PasscodeGate';
import {
  SITE_SESSION_COOKIE,
  verifySiteSession,
} from '../../../lib/siteAuth';
import reportData from '../../../public/underground/portal-summary.json';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Underground Navigation',
  description: 'Comprehensive IANLAN tunnel, bunker, below-grade venue, room, and entrance atlas.',
};

interface Entrance {
  id: string;
  name: string;
  system: string;
  point: [number, number, number] | null;
  access: string;
  certainty: string;
  route: string;
}

const systemCopy: Record<string, { title: string; copy: string }> = {
  'raven-rock': {
    title: 'Raven Rock / Site R',
    copy: 'Four tunnel spines, three caverns, operational buildings, the RR-Z5 shaft, and personnel, vehicle, east, and utility portals.',
  },
  'mainstreet-secure': {
    title: 'MainStreet mountain & logistics',
    copy: 'The legacy C01 public portal, hangar and lower operations, penthouse safe-room route, private shelter, grand vault, and UW01 warehouse.',
  },
  'ravensreach-civic': {
    title: 'Ravensreach civic underground',
    copy: 'Library vaults, the deliberately isolated Library–Guild archive passage, Guild Hall lower levels, and Moot Hall lower circulation.',
  },
  'owner-corridor': {
    title: 'Gilded Raven owner corridor',
    copy: 'The theatre descent, long y−44 protected corridor, seven rest suites, sales office, Observatory ascent, and cataloged C01 detour.',
  },
  'c01-east': {
    title: 'Cataloged C01 east stack',
    copy: 'Seven mapped levels covering security, living and adult-only hospitality, agriculture, command and medical, power, owner club, and residence.',
  },
  westlight: {
    title: 'Westlight below grade',
    copy: 'Theatre and venue basements, members club and bar, stadium service ring, freight handling, and back-of-house circulation.',
  },
  'road-bunkers': {
    title: 'Approach-road bunkers',
    copy: 'The Oasis mini-bunker and its surface approach are documented as a separate roadside refuge system.',
  },
  'data-district': {
    title: 'Iowa data district & Concord',
    copy: 'The information/continuity annex, holdout-home shelter, Concord bar and theatre, and nearby underground campus programs.',
  },
};

const areaMaps = [
  ['03-raven-rock-network.png', 'Raven Rock tunnel network'],
  ['04-ravensreach-worker-town-underground.png', 'Ravensreach / Worker Town'],
  ['05-mainstreet-mountain-and-logistics.png', 'MainStreet mountain & logistics'],
  ['06-c01-east-cataloged-footprint.png', 'Cataloged C01 east footprint'],
  ['07-westlight-underground-venues.png', 'Westlight below-grade venues'],
  ['08-oasis-road-bunker.png', 'Oasis roadside bunker'],
  ['09-iowa-data-district-underground.png', 'Iowa data district & Concord'],
  ['10-all-underground-entrances.png', 'All entrances & access nodes'],
] as const;

const c01Maps = [
  ['11-c01-east-vertical-stack.png', 'Vertical navigation stack'],
  ['12-c01-l1-security-garage.png', 'L1 · Security & garage'],
  ['13-c01-l2-living-amenity.png', 'L2 · Living, amenities & adult-only rooms'],
  ['14-c01-l3-agriculture-water.png', 'L3 · Agriculture & water'],
  ['15-c01-l4-command-medical.png', 'L4 · Command & medical'],
  ['16-c01-l5-power-escape.png', 'L5 · Power & escape'],
  ['17-c01-owner-club-arrival.png', 'Owner club & arrival'],
  ['18-c01-owner-residence.png', 'Owner residence'],
] as const;

const evidence = [
  ['raven-rock-command-center.png', 'Raven Rock command center'],
  ['raven-rock-t2b.png', 'Raven Rock standardized tunnel'],
  ['legacy-c01-upper-plan.png', 'Legacy MainStreet C01'],
  ['shelter-vault-levels.png', 'Private shelter & grand vault'],
  ['library-guild-secret.png', 'Isolated Library–Guild passage'],
  ['owner-corridor.png', 'Gilded Raven owner corridor'],
  ['westlight-members-club.png', 'Westlight members club'],
  ['concord-bar.png', 'Concord bar'],
] as const;

const entrances = reportData.entrances as Entrance[];
const featureCounts = reportData.counts.featureCountsBySystem as Record<string, number>;

export default async function UndergroundNavigationReport() {
  const cookieStore = await cookies();
  if (!verifySiteSession(cookieStore.get(SITE_SESSION_COOKIE)?.value)) {
    return <PasscodeGate />;
  }

  return (
    <main className="underground-report">
      <header className="underground-hero" id="top">
        <nav className="topbar">
          <a className="brand" href="/" aria-label="IANLAN NextGen reports home">
            <span className="brand-mark">IN</span>
            <span>IANLAN NextGen</span>
          </a>
          <div className="nav-links">
            <a href="/">All reports</a>
            <a href="#network">Network</a>
            <a href="#areas">Areas</a>
            <a href="#entrances">Entrances</a>
            <a href="#downloads">Downloads</a>
          </div>
          <span className="live-pill"><i /> Read-only report passed</span>
        </nav>

        <div className="underground-hero-grid">
          <div className="underground-hero-copy">
            <p className="eyebrow">Report 02 · Underground systems atlas · 28 July 2026</p>
            <h1>Find your way<br /><em>below.</em></h1>
            <p>
              A comprehensive map-first guide to IANLAN&apos;s cataloged tunnels,
              bunkers, vaults, bars, adult-only clubs and private rooms,
              service spaces, and every known way underground.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#network">Open the network map</a>
              <a className="button ghost" href="/underground/underground-navigation-report.pdf">
                Download 97-page PDF
              </a>
            </div>
          </div>
          <a className="underground-hero-map" href="/underground/maps/01-underground-world-overview.png">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/underground/maps/01-underground-world-overview.png"
              alt="IANLAN underground geographic overview"
            />
            <span>Geographic overview · north is up · open full size ↗</span>
          </a>
        </div>
        <div className="underground-stats">
          <div><strong>{reportData.counts.maps}</strong><span>navigation maps</span></div>
          <div><strong>{reportData.counts.undergroundNavigationRecords}</strong><span>catalog records</span></div>
          <div><strong>{reportData.counts.c01Spaces}</strong><span>C01 spaces</span></div>
          <div><strong>{reportData.counts.entranceAndAccessRecords}</strong><span>entrances / access nodes</span></div>
          <div><strong>{reportData.counts.pdfPages}</strong><span>PDF pages</span></div>
        </div>
      </header>

      <section className="truth-band">
        <div>
          <p className="eyebrow">Field truth comes first</p>
          <h2>C01 east is cataloged,<br />not field-confirmed.</h2>
        </div>
        <p>
          ISSUE-002 remains open. The east-stack geometry is shown for navigation
          and review, but it does not prove the bunker was moved east or that the
          road, recovered parking, and sunken entrance exist. Use the legacy
          MainStreet C01 portal as the reliable public arrival until verified.
          No world edits were made for this report.
        </p>
      </section>

      <section className="underground-network" id="network">
        <div className="underground-heading light">
          <div>
            <p className="eyebrow">Skywalk logic, underground</p>
            <h2>Read connections<br />at a glance.</h2>
          </div>
          <p>
            Inspired by downtown skywalk diagrams: each box is a separate
            underground system, nodes are useful destinations, and lines are
            verified internal connections. No line between systems means no
            verified connecting tunnel.
          </p>
        </div>
        <a className="network-map" href="/underground/maps/02-underground-skywalk-schematic.png">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/underground/maps/02-underground-skywalk-schematic.png"
            alt="Skywalk-style schematic of all IANLAN underground systems"
          />
        </a>
        <div className="system-grid">
          {reportData.systems.map((system) => {
            const copy = systemCopy[system.id];
            return (
              <article className="system-card" key={system.id}>
                <span>{String(featureCounts[system.id] ?? 0).padStart(3, '0')} records</span>
                <h3>{copy?.title ?? system.label}</h3>
                <p>{copy?.copy ?? `Cataloged underground records for ${system.label}.`}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="underground-areas" id="areas">
        <div className="underground-heading">
          <div>
            <p className="eyebrow">Area-by-area navigation</p>
            <h2>Eight local maps.</h2>
          </div>
          <p>
            Geographic plans preserve world coordinates, access markers, and
            local route geometry. Open any map for its full-resolution version.
          </p>
        </div>
        <div className="underground-map-grid">
          {areaMaps.map(([image, title], index) => (
            <a href={`/underground/maps/${image}`} className="underground-map-card" key={image}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/underground/maps/${image}`} alt={title} loading="lazy" />
              <span><b>{String(index + 3).padStart(2, '0')}</b>{title}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="c01-atlas">
        <div className="underground-heading light">
          <div>
            <p className="eyebrow">Cataloged C01 room graph</p>
            <h2>Seven levels.<br />One vertical stack.</h2>
          </div>
          <p>
            {reportData.counts.c01Spaces} spaces and {reportData.counts.c01GraphEdges} route
            edges are indexed across security, garage, living, hospitality,
            agriculture, utility, command, owner-club, and residential programs.
            The maps document interior logic without claiming the contested
            surface arrival is complete.
          </p>
        </div>
        <div className="c01-map-grid">
          {c01Maps.map(([image, title]) => (
            <a href={`/underground/maps/${image}`} className="c01-map-card" key={image}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/underground/maps/${image}`} alt={`C01 ${title}`} loading="lazy" />
              <span>{title}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="entrance-section" id="entrances">
        <div className="underground-heading">
          <div>
            <p className="eyebrow">The ways in</p>
            <h2>Every cataloged entrance.</h2>
          </div>
          <p>
            Exact points are used where the catalog proves them. Centroids and
            contested surface nodes say so plainly—read those against in-world
            doors, signs, and terrain.
          </p>
        </div>
        <div className="entrance-table-wrap">
          <table className="entrance-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Entrance / access</th>
                <th>XYZ</th>
                <th>Class</th>
                <th>Leads to</th>
                <th>Certainty</th>
              </tr>
            </thead>
            <tbody>
              {entrances.map((entrance) => (
                <tr key={entrance.id}>
                  <td><code>{entrance.id}</code></td>
                  <td><strong>{entrance.name}</strong><span>{systemCopy[entrance.system]?.title}</span></td>
                  <td><code>{entrance.point ? entrance.point.join(', ') : 'field read'}</code></td>
                  <td>{entrance.access}</td>
                  <td>{entrance.route}</td>
                  <td className={entrance.certainty.includes('CONTESTED') ? 'contested' : ''}>
                    {entrance.certainty}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="underground-evidence">
        <div className="underground-heading light">
          <div>
            <p className="eyebrow">Accepted visual evidence</p>
            <h2>What below<br />looks like.</h2>
          </div>
          <p>
            Existing accepted captures are reorganized as a navigation evidence
            book. Their original paths and SHA-256 hashes remain in the
            screenshot manifest.
          </p>
        </div>
        <div className="underground-evidence-grid">
          {evidence.map(([image, title]) => (
            <a href={`/underground/screenshots/${image}`} key={image}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/underground/screenshots/${image}`} alt={title} loading="lazy" />
              <span>{title}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="underground-downloads" id="downloads">
        <div>
          <p className="eyebrow">Take the atlas with you</p>
          <h2>Report files &amp; machine records.</h2>
          <p>
            The PDF, responsive HTML report, complete inventory, QA result, and
            artifact manifest are published together.
          </p>
        </div>
        <div className="download-grid">
          <a href="/underground/underground-navigation-report.pdf"><b>PDF dossier</b><span>97 pages · maps, rooms, entrances</span></a>
          <a href="/underground/underground-navigation-report.html"><b>Full HTML report</b><span>Responsive long-form edition</span></a>
          <a href="/underground/underground-inventory.json"><b>Complete inventory</b><span>289 records · 168 C01 spaces</span></a>
          <a href="/underground/report-qa.json"><b>Report QA</b><span>All package gates passed</span></a>
          <a href="/underground/artifact-manifest.json"><b>Artifact manifest</b><span>Paths, bytes, and SHA-256</span></a>
          <a href="/underground/screenshot-manifest.json"><b>Screenshot manifest</b><span>Original evidence provenance</span></a>
        </div>
      </section>

      <footer>
        <a className="brand" href="/">
          <span className="brand-mark">IN</span>
          <span>IANLAN NextGen</span>
        </a>
        <p>
          Underground Navigation is a read-only catalog report. Ravensgate
          remains sealed; Raven Rock is a Minecraft creative approximation.
        </p>
      </footer>
    </main>
  );
}
