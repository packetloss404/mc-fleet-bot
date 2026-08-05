import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { MasterplanProgram } from '../../../components/MasterplanProgram';
import { PasscodeGate } from '../../../components/PasscodeGate';
import {
  SITE_SESSION_COOKIE,
  verifySiteSession,
} from '../../../lib/siteAuth';
import {
  AUTHORITY_CHAIN,
  gallery,
  gates,
  masterplans,
} from '../../../lib/masterplans';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Masterplan Program',
  description:
    'The thirteen-plan masterplan library: the 01–05 authority chain that places the '
    + 'Combined Complex in the live world, and the 06–13 area baselines beside it.',
};

const authorityPlans = masterplans.filter((plan) => plan.track === 'authority');
const areaPlans = masterplans.filter((plan) => plan.track === 'area');
const passed = gates.filter((gate) => gate.state === 'PASS').length;

const stats = [
  [masterplans.length.toString(), 'masterplans'],
  [authorityPlans.length.toString(), 'in the authority chain'],
  [areaPlans.length.toString(), 'area baselines'],
  [`${passed} / ${gates.length}`, 'R00 gates passed'],
];

const holds = [
  {
    number: '01',
    title: 'No artifact here authorizes a world edit',
    copy:
      'Every plan in the library is documentation. The 05 build info records '
      + 'worldEditAuthorized as false and no construction package exists, so nothing '
      + 'in this report should be read as permission to build.',
  },
  {
    number: '02',
    title: 'Phase 1 coordination is a partial pass',
    copy:
      'Coordination, geometry, and design decisions have compiled evidence, but '
      + 'operation compilation and construction remain on hold. Twenty conservative '
      + 'choices are frozen so the program can advance without another decision-maker.',
  },
  {
    number: '03',
    title: 'No physical pilot cells exist',
    copy:
      'The C1 pilot is coordinated on paper only. Every R00–R13 release stays blocked '
      + 'until its exact gates pass, and the East Corridor rail profile is a design '
      + 'result rather than a surveyed alignment.',
  },
  {
    number: '04',
    title: 'Broad 2D envelopes are not ownership',
    copy:
      'Several project envelopes overlap in plan view. That overlap proves neither '
      + 'shared ownership nor collision — exact 3D cell and interface evidence is '
      + 'still required before either claim can be made.',
  },
  {
    number: '05',
    title: 'Reused external IDs need composite keys',
    copy:
      'External identifiers must be keyed by project_id plus external_id. Five RRCH-* '
      + 'identifiers refer to different Ravensreach and Town Expansion structures and '
      + 'will collide if keyed on the external ID alone.',
  },
  {
    number: '06',
    title: 'Catalog completeness is historical acceptance',
    copy:
      'A complete state records what was accepted at its snapshot date. The 06–13 '
      + 'plans carry a 2026-08-05 evidence cutoff with no live-world survey, so they '
      + 'describe the accepted record rather than a re-inspection.',
  },
];

export default async function MasterplanProgramReport() {
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
            <a href="#chain">Chain</a>
            <a href="#plans">Plans</a>
            <a href="#gates">Gates</a>
            <a href="#views">Views</a>
          </div>
          <span className="live-pill hold"><i /> Build HOLD · not authorized</span>
        </nav>

        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <p className="eyebrow">Report 03 · Masterplan program · 5 August 2026 UTC</p>
            <h1>Thirteen plans.<br /><em>One authority.</em></h1>
            <p className="hero-lede">
              Three internal architectural programs compose into one normalized
              complex, which is then placed against the real world surface. Eight
              retroactive area baselines sit beside that chain — indexed to the
              durable catalog, and explicitly subordinate to it.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#plans">Browse the library</a>
              <a className="button ghost" href="#gates">See what still blocks</a>
            </div>
          </div>
          <div className="hero-map">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/masterplans/hero-phase0-overlay.webp"
              alt="Current world surface with the proposed Combined Zones placement overlaid"
            />
            <div className="map-caption">
              <span>Authoritative proposed-placement overlay</span>
              <span>Phase 0 · 14,238 atlas chunks · North ↑</span>
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
            <span>Plan of record</span>
            <code>05-combined-zones</code>
          </div>
        </div>
      </header>

      <section className="chain-section" id="chain">
        <div className="section-heading light">
          <div>
            <p className="eyebrow">How the plans compose</p>
            <h2>The authority<br />chain.</h2>
          </div>
          <p className="section-lede">
            Only one path through the library controls the Combined Complex
            program. Reading any other plan as an authority on placement, or any
            broad envelope as an ownership claim, is the failure mode this chain
            exists to prevent.
          </p>
        </div>

        <div className="chain-flow" aria-label={AUTHORITY_CHAIN}>
          <div className="chain-inputs">
            {authorityPlans.slice(0, 3).map((plan) => (
              <div className="chain-node" key={plan.id}>
                <span>{plan.number}</span>
                <b>{plan.name}</b>
                <i>{plan.role}</i>
              </div>
            ))}
          </div>
          <div className="chain-arrow" aria-hidden="true">→</div>
          <div className="chain-node emphasis">
            <span>04</span>
            <b>Combined Complex</b>
            <i>Normalized composition</i>
          </div>
          <div className="chain-arrow" aria-hidden="true">→</div>
          <div className="chain-node emphasis terminal">
            <span>05</span>
            <b>Combined Zones</b>
            <i>Current-world placement</i>
          </div>
        </div>

        <div className="chain-note">
          <p>
            The plan to advance is Masterplan 05, using the exact boundary in
            the 04 authority reconciliation. The 06–13 area plans are keyed
            one-to-one to durable catalog projects and do not alter or supersede
            this chain.
          </p>
        </div>
      </section>

      <MasterplanProgram plans={masterplans} />

      <section className="gates-section" id="gates">
        <div className="section-heading light">
          <div>
            <p className="eyebrow">R00 readiness audit</p>
            <h2>What still<br />blocks.</h2>
          </div>
          <p className="section-lede">
            The readiness audit evaluates G01–G07 only. Two gates pass. The
            remaining five hold on complete-save, technical, external-interface,
            protected-feature, accepted-owner, and mechanism evidence.
          </p>
        </div>

        <div className="gate-grid">
          {gates.map((gate) => (
            <article className={`gate-card ${gate.state.toLowerCase()}`} key={gate.id}>
              <header>
                <code>{gate.id}</code>
                <span className="gate-state">{gate.state}</span>
              </header>
              <h3>{gate.title}</h3>
              <p>{gate.note}</p>
            </article>
          ))}
        </div>

        <div className="hold-grid">
          {holds.map((hold) => (
            <article className="phase-card" key={hold.number}>
              <span>{hold.number}</span>
              <h3>{hold.title}</h3>
              <p>{hold.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="views-section" id="views">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Rendered intent</p>
            <h2>Design views</h2>
          </div>
          <p className="section-lede">
            Renderings and plan drawings from the 01–05 sets. These illustrate
            architectural intent for an unbuilt program — they are not saved-world
            captures and not evidence of construction.
          </p>
        </div>
        <div className="views-grid">
          {gallery.map((shot) => (
            <a href={shot.image} className="view-tile" key={shot.image}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shot.image} alt={`${shot.plan}: ${shot.title}`} loading="lazy" />
              <span><b>{shot.plan}</b>{shot.title}</span>
            </a>
          ))}
        </div>
      </section>

      <footer>
        <a className="brand" href="/">
          <span className="brand-mark">IN</span>
          <span>IANLAN NextGen</span>
        </a>
        <p>
          Masterplan program · plan of record <code>05-combined-zones</code>.
          Every figure is transcribed from the committed plan evidence. The
          program is documentation only and authorizes no world edits.
        </p>
      </footer>
    </main>
  );
}
