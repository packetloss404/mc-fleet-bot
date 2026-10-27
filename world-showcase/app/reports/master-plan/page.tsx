import type { Metadata } from 'next';
import Image from 'next/image';

import { SiteHeader } from '../../../components/SiteHeader';
import { masterPlanEvidenceReports } from '../../../lib/reports';
import report from '../../../public/master-plan-railway/report-input.json';
import validation from '../../../public/master-plan-railway/validation.json';
import currentState from '../../../public/current-plan-state/index.json';
import c01Visuals from '../../../public/c01-verified-as-built-2026-10-27/publication-manifest.json';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Master Plan · Whole-world execution record',
  description: 'Evidence-bound MP01–MP13 status, delivery queue, maps, and construction evidence.',
};

const readable = (value: string) => value
  .toLowerCase()
  .replaceAll('_', ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

const statusTone = (status: string) => {
  if (status.includes('READY')) return styles.ready;
  if (status.includes('REQUIRES')) return styles.requires;
  return styles.blocked;
};

const reconciliationDate = new Date(`${currentState.reconciledOn}T00:00:00Z`)
  .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const currentSurfaceAtlas = [
  {
    href: '/world-atlas-2026-08-26/00-overall-active-world-surface-atlas.png',
    label: 'Overall active-world surface atlas',
    dimensions: '2961 × 1512',
  },
  {
    href: '/world-atlas-2026-08-26/01-ravensreach-core-and-old-town.png',
    label: 'Ravensreach core + old town',
    dimensions: '805 × 885',
  },
  {
    href: '/world-atlas-2026-08-26/02-ravensgate.png',
    label: 'Ravensgate',
    dimensions: '725 × 965',
  },
  {
    href: '/world-atlas-2026-08-26/03-western-approach-road.png',
    label: 'Western approach road',
    dimensions: '964 × 324',
  },
  {
    href: '/world-atlas-2026-08-26/04-westlight-venue-and-district.png',
    label: 'Westlight venue + district',
    dimensions: '900 × 1028',
  },
  {
    href: '/world-atlas-2026-08-26/05-western-project-corridor.png',
    label: 'Western project corridor',
    dimensions: '1395 × 1107',
  },
  {
    href: '/world-atlas-2026-08-26/06-raven-rock-surface-access.png',
    label: 'Raven Rock surface access',
    dimensions: '1282 × 1282',
  },
];

const currentDecisionMaps = {
  href: '/reports/current-decision-maps',
  manifestHref: '/current-26-aug-decision-maps/publication-manifest.json',
  mapCount: 12,
};

const verifiedC01Maps = c01Visuals.publications.flatMap((publication) => (
  publication.assets.filter((asset) => asset.kind === 'plan' || asset.kind === 'section').map((asset) => ({
    href: asset.href,
    label: `${publication.name} · ${asset.kind === 'plan' ? 'plan' : 'section'}`,
    caption: `${publication.scope.canonicalTargetCount} canonical targets · ${publication.scope.changedCount} changed cells · ${publication.scope.stationCount > 0 ? `${publication.scope.stationCount} route stations` : `${publication.scope.totalDesignCellCount}-cell interface volume; no route claim`} · no public commissioning`,
    width: 1200,
    height: 760,
  }))
));

const latestGuardedReleaseMaps = [
  ...verifiedC01Maps,
  {
    href: '/c01-arrival-gravity-support-01-as-built-2026-08-27/c01-arrival-gravity-support-as-built-plan.svg',
    label: 'C01 arrival gravity-support as-built plan',
    caption: '33 polished-deepslate support cells · 219-cell verified halo · arrival-cadence seam and retained gravel preserved',
    width: 1200,
    height: 700,
  },
  {
    href: '/c01-arrival-gravity-support-01-as-built-2026-08-27/c01-arrival-gravity-support-as-built-section.svg',
    label: 'C01 arrival gravity-support section',
    caption: 'Seven protected floor supports · two clear headroom cells · exact reversible liner only, no route commissioning',
    width: 1200,
    height: 700,
  },
  {
    href: '/c01-arrival-wayfinding-frontier-01-as-built-2026-08-27/c01-arrival-wayfinding-as-built-plan.svg',
    label: 'C01 L1 arrival cadence as-built plan',
    caption: 'Three exact sea-lantern inlays · 81-cell verified dry halo · nine prior inlays and two gravel holds retained',
    width: 1200,
    height: 620,
  },
  {
    href: '/c01-arrival-wayfinding-frontier-01-as-built-2026-08-27/c01-arrival-wayfinding-as-built-section.svg',
    label: 'C01 L1 arrival cadence clearance section',
    caption: 'Three-cell extension · flat walk surface and two clear headroom cells verified · not a route or service commissioning',
    width: 1200,
    height: 560,
  },
  {
    href: '/c01-return-02-as-built-2026-08-27/c01-return-02-as-built-plan.svg',
    label: 'C01 Return-02 as-built plan',
    caption: '28-station, five-wide × five-clear return · 768 canonical post-state cells · protected switchback excluded',
    width: 1120,
    height: 760,
  },
  {
    href: '/c01-return-02-as-built-2026-08-27/c01-return-02-as-built-elevation.svg',
    label: 'C01 Return-02 as-built elevation',
    caption: 'Corrected immutable QA verifies both directions and four exact 5×5 endpoint contracts · no commissioning',
    width: 1080,
    height: 780,
  },
  {
    href: '/current-26-aug-release-evidence/mp11-bkr-c01-approach-gravity-containment-08/mp11-bkr-c01-finite-gravity-liner-post-plan.svg',
    label: 'C01 approach containment 08',
    caption: '19-cell finite gravity liner · immutable post state · 121-cell verified dry halo',
    width: 474,
    height: 496,
  },
  {
    href: '/current-26-aug-release-evidence/mp11-bkr-c01-approach-gravity-containment-07/mp11-bkr-c01-finite-gravity-liner-post-plan.svg',
    label: 'C01 approach containment 07',
    caption: '47-cell finite gravity liner · immutable post state · 262-cell verified dry halo',
    width: 648,
    height: 844,
  },
  {
    href: '/current-26-aug-release-evidence/mp11-bkr-c01-approach-gravity-containment-06/mp11-bkr-c01-finite-gravity-liner-post-plan.svg',
    label: 'C01 approach containment 06',
    caption: '99-cell finite gravity liner · immutable post state · 357-cell verified dry halo',
    width: 532,
    height: 902,
  },
  {
    href: '/current-26-aug-release-evidence/mp05-b07-surface-receiver-descent-east-wall-fixed-lighting-01/surface-receiver-descent-east-wall-fixed-lighting-profile.svg',
    label: 'B07 descent east-wall lighting',
    caption: 'Five fixed fixtures · dry three-wide core and both controlled door sets retained',
    width: 780,
    height: 680,
  },
  {
    href: '/current-26-aug-release-evidence/mp05-b07-ice-edge-receiver-fixed-lighting-01/ice-edge-receiver-fixed-lighting-plan-y65.svg',
    label: 'B07 ice-edge receiver lighting',
    caption: 'Three sealed-receiver fixtures · dry core and exterior bulkhead retained',
    width: 760,
    height: 360,
  },
  {
    href: '/current-26-aug-release-evidence/mp05-b07-surface-receiver-descent-fixed-lighting-01/surface-receiver-descent-fixed-lighting-profile.svg',
    label: 'B07 descent west-wall lighting',
    caption: 'Five fixed fixtures · dry stair core and controlled doors retained',
    width: 780,
    height: 680,
  },
  {
    href: '/current-26-aug-release-evidence/mp11-bkr-c01-approach-gravity-containment-04/mp11-bkr-c01-finite-gravity-liner-post-plan.svg',
    label: 'C01 approach containment 04',
    caption: '42-cell finite gravity liner · immutable post state · 226-cell verified halo',
    width: 706,
    height: 612,
  },
  {
    href: '/current-26-aug-release-evidence/mp11-bkr-c01-approach-gravity-containment-03/mp11-bkr-c01-finite-gravity-liner-post-plan.svg',
    label: 'C01 approach containment 03',
    caption: '116-cell finite gravity liner · immutable post state · 400-cell verified halo',
    width: 648,
    height: 844,
  },
  {
    href: '/current-26-aug-release-evidence/mp05-b07-central-bypass-fixed-lighting-01/central-bypass-fixed-lighting-section-x2106.svg',
    label: 'B07 central bypass lighting',
    caption: 'Six fixed internal fixtures · sealed restricted bypass · no route or egress opening',
    width: 760,
    height: 730,
  },
  {
    href: '/current-26-aug-release-evidence/mp05-b07-lower-pressure-gallery-fixed-lighting-01/lower-pressure-gallery-fixed-lighting-plan-y10.svg',
    label: 'B07 lower-pressure gallery lighting',
    caption: 'Three sealed-ceiling fixtures · dry segment and pressure closure retained',
    width: 760,
    height: 270,
  },
];

const currentDesignMaps = [
  {
    href: '/sys03-cobalt-pc01-platform-access-readiness-2026-08-27/sys03-cobalt-pc01-platform-access-readiness-map.svg',
    label: 'SYS03 Cobalt PC-01 platform/access readiness',
    caption: 'Zero authority: four public 5×5 endpoints unaccepted; RR pad is 3×3 only; RR-SE-1 remains service-only',
    width: 1280,
    height: 740,
  },
  {
    href: '/c01-main-switchback-design-2026-08-28/readiness-03.svg',
    label: 'C01 protected main switchback readiness',
    caption: 'Historical design: the later accepted 30-station main switchback release is recorded in the current plan state',
    width: 1050,
    height: 430,
  },
  {
    href: '/c01-main-switchback-design-2026-08-28/guard-transition-04.svg',
    label: 'C01 guard + protected-route transition',
    caption: 'Historical guard design: later main-switchback construction is accepted; protected-route retirement and public opening remain separate',
    width: 1000,
    height: 390,
  },
  {
    href: '/sys03-cobalt-station-pair-readiness-2026-08-27/sys03-cobalt-wl-rr-disjoint-station-pair-readiness-map.svg',
    label: 'SYS03 Cobalt Westlight ↔ Ravensreach station-pair candidate',
    caption: 'Candidate only: both R10 holds excluded; PC01–PC08 remain unaccepted; no route or passenger service',
    width: 1280,
    height: 740,
  },
  {
    href: '/current-26-aug-release-evidence/mp11-c01-public-vertical-switchback-return-02/mp11-c01-public-vertical-switchback-return-02-plan.svg',
    label: 'C01 5×5 switchback and return plan',
    caption: 'Disjoint 30-station main and 28-station return lanes · main protected route remains unchanged',
    width: 960,
    height: 690,
  },
  {
    href: '/current-26-aug-release-evidence/mp11-c01-public-vertical-switchback-return-02/mp11-c01-public-vertical-switchback-return-02-elevation.svg',
    label: 'C01 5×5 switchback elevation',
    caption: 'Historical sequencing design: the independent 28-station Return-02 is now accepted within its restricted scope',
    width: 900,
    height: 610,
  },
  {
    href: '/current-26-aug-release-evidence/mp11-c01-dimension-physical-01/mp11-c01-dimension-physical-01-plan.svg',
    label: 'C01 public-vertical defect plan',
    caption: 'Historical defect survey preceding the accepted finite upper-portion redesign; this drawing is not a post-state map',
    width: 620,
    height: 590,
  },
  {
    href: '/current-26-aug-release-evidence/mp11-c01-dimension-physical-01/mp11-c01-dimension-physical-01-elevation.svg',
    label: 'C01 public-vertical elevation',
    caption: 'Endpoint and return constraints shown before any physical package is authorized',
    width: 610,
    height: 520,
  },
];

const surfaceRailPromenadeMaps = [
  {
    href: '/surface-rail-promenade-2026-08-28-r8/01-double-track-promenade-cross-section.svg',
    label: 'Rail + promenade module',
    caption: '23-block guideway: protected five-wide path, opaque barrier, and separate six-wide service gallery',
    width: 1500,
    height: 960,
  },
  {
    href: '/surface-rail-promenade-2026-08-28-r8/02-citywide-exterior-loop-concept.svg',
    label: 'Exterior paired-guideway loop',
    caption: 'Eight source-bound survey candidates; fluid and unknown ground remain excluded from build selection',
    width: 1500,
    height: 1050,
  },
  {
    href: '/surface-rail-promenade-2026-08-28-r8/03-town-outer-loop-and-spurs.svg',
    label: 'Town anchors and held spurs',
    caption: 'Seven normal-walk anchors; existing routes retained while three interfaces require exact contracts',
    width: 1460,
    height: 940,
  },
  {
    href: '/surface-rail-promenade-2026-08-28-r8/04-ag0-first-finite-exterior-segment.svg',
    label: 'First finite exterior survey',
    caption: 'SL-02-N-AG0-0576: dry pier-bearing survey cell set; no operation, deck, or track authorization',
    width: 1500,
    height: 1020,
  },
  {
    href: '/surface-rail-promenade-2026-08-28-r8/05-ag1-as-built-pier-and-girder-plan.svg',
    label: 'AG-1 as-built support plan',
    caption: '1,165 verified support cells: three pier pads and a two-deep girder; rail and promenade remain unbuilt',
    width: 1300,
    height: 860,
  },
  {
    href: '/surface-rail-promenade-2026-08-28-r8/06-ag1-as-built-pier-and-girder-profile.svg',
    label: 'AG-1 as-built support profile',
    caption: 'Continuous pier shafts and the Y82–83 girder verified against the immutable post-state snapshot',
    width: 1300,
    height: 820,
  },
  {
    href: '/surface-rail-promenade-2026-08-28-r8/07-ag2-as-built-promenade-plan.svg',
    label: 'AG-2 as-built promenade plan',
    caption: '820 verified civil cells: protected five-wide path, sealed gallery, lighting, and an explicitly empty nine-wide rail reserve',
    width: 1320,
    height: 790,
  },
  {
    href: '/surface-rail-promenade-2026-08-28-r8/08-ag2-as-built-promenade-section.svg',
    label: 'AG-2 as-built promenade section',
    caption: 'Post-verified protected walking route above AG-1 support; rail, power, signals, and service are not built',
    width: 1320,
    height: 740,
  },
  {
    href: '/surface-rail-promenade-2026-08-28-r8/09-ag3-as-built-passive-rail-plan.svg',
    label: 'AG-3 as-built passive rail plan',
    caption: 'Two isolated unpowered tracks, rail-side barrier, and a three-wide maintenance-only recovery path—no station or service',
    width: 1320,
    height: 760,
  },
  {
    href: '/surface-rail-promenade-2026-08-28-r8/10-ag3-as-built-passive-rail-section.svg',
    label: 'AG-3 as-built passive rail section',
    caption: 'Exact rail support, headroom, separation, and recovery-path evidence from the immutable post-state',
    width: 1320,
    height: 700,
  },
  {
    href: '/surface-rail-promenade-2026-08-28-r8/11-ag4-adjacent-continuation-hold-survey.svg',
    label: 'AG-4 adjacent continuation hold survey',
    caption: 'The immediate continuation is held by water/sand bearing failures and a saved item; the next clean module is disjoint, not a connection',
    width: 1100,
    height: 440,
  },
  {
    href: '/surface-rail-promenade-2026-08-28-r8/12-ag4-gap-hydrology-gravity-hold.svg',
    label: 'AG-4 water and gravity hold',
    caption: '7,656 observed wet cells escape five measurement faces; no local plug, liner, drain, or bearing replacement is authorized',
    width: 1200,
    height: 600,
  },
];

const worldGuide = [
  {
    name: 'Ravensreach civic core',
    anchor: '/tp @s -93 ~ -387',
    state: 'Built / verify route locally',
    copy: 'Market, Moot and historic civic fabric. Later library evidence retains 245 exterior stair/parapet targets and a six-level bidirectional route; wider civic interfaces remain separately scoped.',
  },
  {
    name: 'Westlight + Ravensgate',
    anchor: '/tp @s -344 ~ -500',
    state: 'Built fabric / access review pending',
    copy: 'The western venue and district cluster sit on the Approach Road. Current material evidence is strong; a fresh public-egress survey comes before changes.',
  },
  {
    name: 'MainStreet + Arrival',
    anchor: '/tp @s 0 ~ 17',
    state: 'Built / public gateway candidate',
    copy: 'The central town surface and visitor edge. Do not use the warehouse, H11, or C01 interior as a passenger shortcut.',
  },
  {
    name: 'Empty Eight retail',
    anchor: '/tp @s 1661 50 45',
    state: 'Built public gallery / restricted annex separate',
    copy: 'Vacant retail shells, public gallery and theatre evidence exist. Sealed rail stubs, BOH and restricted areas are not public routes.',
  },
  {
    name: 'Combined Zones / B09 mountain',
    anchor: '/tp @s 2048 130 -748',
    state: 'Built maintenance guideway / not passenger rail',
    copy: 'B09 includes accepted bounded passive rail and a restricted maintenance shuttle. Cobalt and AG-3 also have bounded passive rail evidence; none proves a continuous passenger service.',
  },
  {
    name: 'Raven Rock + deep systems',
    anchor: 'Use Underground Navigation / POI Directory',
    state: 'Do not treat as public destination',
    copy: 'Raven Rock has catalog/history, not a current accepted public complex. C01, PassageWay, B03 and secure bunker systems remain separately controlled.',
  },
];

const buildBoard = [
  {
    id: '01',
    name: 'B09-P0 · mountain conversion survey',
    state: 'Survey captured',
    copy: 'Fresh B09 source has been captured. Resolve the exact guideway, 6×6 service-corridor route, exits, fluids, entities and ownership before placing conversion blocks.',
  },
  {
    id: '02',
    name: 'Cobalt first pair · Westlight ↔ Ravensreach',
    state: 'Choose exact alignment',
    copy: 'Freeze the shortest independently useful western station pair, including two public headhouses and its parallel 6×6 service corridor.',
  },
  {
    id: '03',
    name: 'Access before track',
    state: 'Blocked on survey',
    copy: 'Build pedestrian routes, exits, vertical access and controlled service doors first. Rail cannot open a station that cannot be walked safely.',
  },
  {
    id: '04',
    name: 'Guideway, controls and closed trial',
    state: 'After access QA',
    copy: 'Then build passive guideway, service corridor, power and block control; test one cart and one station pair before any passenger opening.',
  },
];

export default async function MasterPlanRailwayReport() {
  return (
    <main className={styles.report}>
      <SiteHeader current="master-plan" />
      <header className={styles.hero} id="top">
        <div className={styles.heroGrid}>
          <div>
            <p className={styles.eyebrow}>Documented evidence · reconciled {reconciliationDate}</p>
            <h1>The world, not<br /><em>just the paperwork.</em></h1>
            <p className={styles.lede}>
              Find accepted construction, dated maps, and the interfaces still
              awaiting commissioning. Current documented status comes from the
              source register below; each map retains its own survey date.
            </p>
            <div className={styles.actions}>
              <a href="#world-guide">Where can I go?</a>
              <a href="#build-board">What gets built next?</a>
              <a href="#world-atlas">Open the world map</a>
            </div>
          </div>
          <aside className={styles.truthCard}>
            <span>Current railway truth</span>
            <strong>No continuous passenger railway is proven.</strong>
            <p>
              Bounded rail, road, walking, and maintenance-shuttle components
              are documented. Completed finite packages do not commission the
              proposed citywide loop, stations, or passenger service.
            </p>
          </aside>
        </div>

        <div className={styles.metrics}>
          <div><strong>{currentState.plans.length}</strong><span>documented plans</span></div>
          <div><strong>7/7</strong><span>R00 gates passed</span></div>
          <div><strong>Accepted</strong><span>bounded MP05 MVP</span></div>
          <div><strong>{currentState.sources.length}</strong><span>bound source documents</span></div>
        </div>
      </header>

      <section className={styles.plans} id="current-plan-state">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Current documented plan state</p>
            <h2>Accepted work.<br />Exact remaining limits.</h2>
          </div>
          <p>
            R00 is now 7/7 PASS. The bounded MP05 MVP is accepted. C01 returns,
            the main switchback and finite upper-portion work have later accepted
            construction records; public openings and wider commissioning remain
            separate. This reconciliation reads the documented evidence and does
            not represent a new live-world survey.
          </p>
        </div>
        <div className={styles.planGrid}>
          {[...currentState.plans, ...currentState.systems].map((plan) => (
            <article className={styles.planCard} key={plan.id}>
              <header>
                <span>{plan.id}</span>
                <h3>{plan.title}</h3>
                <p><b>{plan.status}</b></p>
                <p>{plan.summary}</p>
              </header>
              <div className={styles.claimGroup}>
                <b>Accepted documented scope</b>
                {plan.built.length > 0
                  ? <ul>{plan.built.map((claim) => <li key={claim}>{claim}</li>)}</ul>
                  : <p>No separate whole-scope construction acceptance is asserted.</p>}
              </div>
              <div className={`${styles.claimGroup} ${styles.unproven}`}>
                <b>Remaining scope / commissioning limits</b>
                <ul>{plan.uncommissioned.map((claim) => <li key={claim}>{claim}</li>)}</ul>
              </div>
              <footer>
                <b>Controlling source documents</b>
                {plan.sourceIds.map((sourceId) => {
                  const source = currentState.sources.find((item) => item.id === sourceId);
                  return source ? <a key={source.id} href={source.href}>{source.label}</a> : null;
                })}
              </footer>
            </article>
          ))}
        </div>
        <div className={styles.programmeLinks}>
          <a href="/current-plan-state/index.json">Current source register <span>JSON ↗</span></a>
          <a href="/reports/masterplan-program">Historical Program · 5 August <span>Archive ↗</span></a>
        </div>
      </section>

      <section className={styles.commandDeck} id="world-guide">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Start here</p>
            <h2>Where you can go,<br />and what it means.</h2>
          </div>
          <p>
            These are known location anchors for getting your bearings, not a
            promise that every surrounding room, portal or underground route is
            public. The state label is the important part.
          </p>
        </div>
        <div className={styles.guideGrid}>
          {worldGuide.map((place) => (
            <article key={place.name}>
              <header><span>{place.state}</span><code>{place.anchor}</code></header>
              <h3>{place.name}</h3>
              <p>{place.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.worldAtlas} id="world-atlas">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Whole-world orientation</p>
            <h2>Find every<br />built area.</h2>
          </div>
          <p>
            The Build Index covers the town and the east-side Combined Zones, then
            explicitly marks systems that sit below ground. The 26 August surface
            atlas below is a separate seven-map set; every map is linked
            directly instead of being hidden behind two preview tiles.
          </p>
        </div>
        <div className={styles.atlasDirectory} aria-label="Current complete surface atlas">
          <div>
            <p>Surface atlas snapshot · 26 August 2026</p>
            <strong>All 7 surface maps</strong>
            <span>Read-only snapshot `ca93ba68…8865c7b` · north is up · no underground claims.</span>
          </div>
          <a href={currentSurfaceAtlas[0].href}>Open 26 August surface ↗</a>
          <div className={styles.atlasDirectoryLinks}>
            {currentSurfaceAtlas.map((map) => (
              <a href={map.href} key={map.href}>{map.label} · {map.dimensions}</a>
            ))}
            <a href="/world-atlas-2026-08-25/atlas-gallery.html">Historical 33 maps + 40 views ↗</a>
          </div>
        </div>
        <div className={styles.atlasGrid}>
          <a className={styles.atlasLink} href={currentSurfaceAtlas[0].href} target="_blank" rel="noreferrer">
            <Image
              alt="Current 26 August active-world surface atlas, with north at the top"
              className={styles.atlasImage}
              height={1512}
              priority
              src={currentSurfaceAtlas[0].href}
              width={2961}
            />
            <span>Open current complete surface atlas · 2961 × 1512</span>
          </a>
          <a className={styles.atlasLink} href="/atlas/master-plan-build-index.png" target="_blank" rel="noreferrer">
            <Image
              alt="Master Plan Build Index showing the town, Combined Zones mountain, Empty Eight, B09 rail, and Cheyenne"
              className={styles.atlasImage}
              height={2352}
              priority
              src="/atlas/master-plan-build-index.png"
              width={3434}
            />
            <span>22 August Build Index · town + Combined Zones · 3434 × 2352</span>
          </a>
          <a className={styles.atlasLink} href="/atlas/whole-world.png" target="_blank" rel="noreferrer">
            <Image
              alt="Original close top-down town atlas"
              className={styles.atlasImage}
              height={2352}
              src="/atlas/whole-world.png"
              width={2352}
            />
            <span>Open close town atlas · 2352 × 2352</span>
          </a>
          <a className={styles.atlasLink} href="/world-atlas-2026-08-25/atlas-gallery.html" target="_blank" rel="noreferrer">
            <Image
              alt="Underground world overview showing cataloged systems, routes, bunkers, and entrance markers"
              className={styles.atlasImage}
              height={1250}
              src="/world-atlas-2026-08-25/underground/navigation/maps/01-underground-world-overview.png"
              width={1800}
            />
            <span>Open full visual atlas · 33 maps + 40 screenshots</span>
          </a>
        </div>
      </section>

      <section className={styles.decisionMaps} id="current-decisions">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Decision evidence · 26 August 2026</p>
            <h2>Held interfaces,<br />shown plainly.</h2>
          </div>
          <p>
            A dated twelve-map volume brings together MP01,
            MP02–MP05, MP08, MP13 and SYS03 decision evidence. It is deliberately
            not a construction-completion atlas: ownership, containment, egress,
            and control holds stay visible on every card.
          </p>
        </div>
        <div className={styles.decisionMapsCard}>
          <div>
            <p>Read-only evidence at its 26 August source</p>
            <strong>{currentDecisionMaps.mapCount} maps · 10 held interfaces · 2 civil-only references</strong>
            <span>Historical atlas packages are retained separately; this additive volume does not rewrite their record.</span>
          </div>
          <div className={styles.decisionMapsActions}>
            <a href={currentDecisionMaps.href}>Open decision-map volume ↗</a>
            <a href={currentDecisionMaps.manifestHref}>Inspect exact manifest ↗</a>
          </div>
        </div>
      </section>

      <section className={styles.worldAtlas} id="current-designs">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Design archive · August 2026</p>
            <h2>Mapped before<br />it is built.</h2>
          </div>
          <p>
            These design drawings explain the C01 public-vertical work and the
            Cobalt station-pair candidate. Later accepted C01 construction is
            listed in the current plan state above; these retained drawings
            describe their original design stage.
          </p>
        </div>
        <div className={styles.atlasGrid} aria-label="Current guarded design maps">
          {currentDesignMaps.map((map) => (
            <a className={styles.atlasLink} href={map.href} key={map.href} rel="noreferrer" target="_blank">
              <Image
                alt={`${map.label} design map`}
                className={styles.atlasImage}
                height={map.height}
                loading="lazy"
                src={map.href}
                width={map.width}
              />
              <span>{map.label} · {map.caption}</span>
            </a>
          ))}
        </div>
      </section>

      <section className={styles.railway} id="surface-rail-promenade">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Surface mobility amendment</p>
            <h2>Rail beside a<br />walkable city.</h2>
          </div>
          <p>
            Roads and paths are now the rights-of-way for a staged above-ground
            rail-and-promenade system. These maps are exact design and survey
            evidence. AG-1 support, the bounded AG-2 promenade and service gallery,
            and the isolated AG-3 passive rails have accepted post-state records.
            The full loop, station, power, signals, passenger service, and
            old-road conversion remain incomplete. Existing routes stay usable until a
            replacement segment has passed its guarded route and return tests.
          </p>
        </div>
        <div className={styles.atlasGrid} aria-label="Above-ground rail and promenade design maps">
          {surfaceRailPromenadeMaps.map((map) => (
            <a className={styles.atlasLink} href={map.href} key={map.href} rel="noreferrer" target="_blank">
              <Image
                alt={`${map.label} map`}
                className={styles.atlasImage}
                height={map.height}
                loading="lazy"
                src={map.href}
                width={map.width}
              />
              <span>{map.label} · {map.caption}</span>
            </a>
          ))}
        </div>
        <div className={styles.programmeLinks}>
          <a href="/surface-rail-promenade-2026-08-28-r8/publication-manifest.json">Inspect map manifest <span>JSON ↗</span></a>
          <a href="/current-plan-state/sources/surface-rail-standard--ABOVE-GROUND-DOUBLE-TRACK-WALKWAY-STANDARD-2026-08-28.md">Open engineering standard <span>MD ↗</span></a>
        </div>
      </section>

      <section className={styles.worldAtlas} id="latest-releases">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Selected guarded physical releases · dated evidence</p>
            <h2>As-built maps,<br />not inferred status.</h2>
          </div>
          <p>
            These maps bind selected finite releases to their immutable post
            state and independent QA. They show exact containment or restricted
            safety work only; none of these maps opens a route, endpoint, egress, or
            public area.
          </p>
        </div>
        <div className={styles.atlasGrid} aria-label="Latest guarded release maps">
          {latestGuardedReleaseMaps.map((map) => (
            <a className={styles.atlasLink} href={map.href} key={map.href} target="_blank" rel="noreferrer">
              <Image
                alt={`${map.label} immutable post-release map`}
                className={styles.atlasImage}
                height={map.height}
                src={map.href}
                width={map.width}
              />
              <span>{map.label} · {map.caption}</span>
            </a>
          ))}
        </div>
        <div className={styles.programmeLinks}>
          <a href="/c01-verified-as-built-2026-10-27/publication-manifest.json">Verified C01 map publication <span>JSON ↗</span></a>
          <a href="/current-plan-state/index.json">Accepted scope and remaining interfaces <span>JSON ↗</span></a>
        </div>
      </section>

      <section className={styles.buildBoard} id="build-board">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Build board</p>
            <h2>The next things<br />that create a city.</h2>
          </div>
          <p>
            This is the actionable order—not a generic list of blockers. Each
            card is a bounded release lane, so one bad interface cannot stall
            unrelated construction.
          </p>
        </div>
        <ol className={styles.buildSteps}>
          {buildBoard.map((item) => (
            <li key={item.id}>
              <span>{item.id}</span>
              <div><small>{item.state}</small><h3>{item.name}</h3><p>{item.copy}</p></div>
            </li>
          ))}
        </ol>
        <div className={styles.buildLinks}>
          <a href="/master-plan-railway/PASSENGER-RAILWAY-PROGRAM-2026-08-22.md">Open subway build programme <span>MD ↗</span></a>
          <a href="/master-plan-railway/2026-08-22-passenger-railway-network-design.md">Open map + 20-stop design <span>MD ↗</span></a>
          <a href="/master-plan-railway/PASSENGER-RAILWAY-BUILDER-PACKETS-2026-08-23.md">Open ordinary-agent builder packets <span>MD ↗</span></a>
        </div>
      </section>

      <section className={styles.evidenceChapters} id="evidence-chapters">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Evidence chapters</p>
            <h2>The proof that<br />sits under this plan.</h2>
          </div>
          <p>
            These are parts of the Master Plan workspace: use them for exact
            maps, screenshots, coordinates, and construction limits. They do
            not override the register or its hard boundaries below.
          </p>
        </div>
        <div className={styles.chapterGrid}>
          {masterPlanEvidenceReports.map((chapter) => (
            <a href={chapter.href} key={chapter.slug}>
              <span>{chapter.number}</span>
              <div>
                <p>{chapter.project}</p>
                <h3>{chapter.title}</h3>
                <small>{chapter.summary}</small>
              </div>
              <b>Open ↗</b>
            </a>
          ))}
        </div>
      </section>

      <section className={styles.railway} id="railway">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Cross-Town Railway concept · 22 August 2026</p>
            <h2>A proposal with a<br />deliberate starting line.</h2>
          </div>
          <p>{report.railway.proposedDesign.serviceConcept}</p>
        </div>
        <div className={styles.railwayGrid}>
          <article>
            <span className={styles.kicker}>Accepted ingredients at the 22 August cutoff</span>
            <ul>
              {report.railway.acceptedComponents.map((claim) => <li key={claim}>{claim}</li>)}
            </ul>
          </article>
          <article className={styles.missing}>
            <span className={styles.kicker}>Original passenger-service requirements</span>
            <ol>
              {report.railway.missingForPassengerRail.map((claim) => <li key={claim}>{claim}</li>)}
            </ol>
          </article>
        </div>
        <div className={styles.rules}>
          <p><b>Alignment.</b> {report.railway.proposedDesign.alignmentRule}</p>
          <p><b>Stations.</b> {report.railway.proposedDesign.stationRule}</p>
          <p><b>Delivery.</b> {report.railway.proposedDesign.deliveryPattern}</p>
        </div>
        <div className={styles.programmeLinks}>
          <a href="/master-plan-railway/PASSENGER-RAILWAY-PROGRAM-2026-08-22.md">Subway build programme <span>MD ↗</span></a>
          <a href="/master-plan-railway/2026-08-22-passenger-railway-network-design.md">Network + 20-stop design <span>MD ↗</span></a>
          <a href="/master-plan-railway/passenger-railway-stop-register-2026-08-22.json">Machine stop register <span>JSON ↗</span></a>
          <a href="/master-plan-railway/PASSENGER-RAILWAY-INVENTORY-2026-08-22.md">Existing-rail conversion inventory <span>MD ↗</span></a>
          <a href="/master-plan-railway/PASSENGER-RAILWAY-ENGINEERING-STANDARD-2026-08-22.md">Engineering + 6×6 service standard <span>MD ↗</span></a>
          <a href="/master-plan-railway/PASSENGER-RAILWAY-BUILDER-PACKETS-2026-08-23.md">No-frontier builder packets <span>MD ↗</span></a>
        </div>
      </section>

      <section className={styles.plans} id="plans">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>MP01—MP13</p>
            <h2>The complete plan register.</h2>
          </div>
          <p>
            Historical reconciliation · 22 August 2026. These claims and their
            source hashes are preserved at that cutoff. Later current-state
            records above supersede them where scope overlaps; the historical
            register is not a fresh validation of the current checkout.
          </p>
        </div>
        <div className={styles.planGrid}>
          {report.plans.map((plan) => (
            <article className={styles.planCard} key={plan.id}>
              <header>
                <span>{plan.id}</span>
                <i>{readable(plan.deliveryClass)}</i>
                <h3>{plan.title}</h3>
                <p>{plan.qualification}</p>
              </header>
              <div className={styles.claimGroup}>
                <b>Accepted / built</b>
                <ul>{plan.built.map((claim) => <li key={claim}>{claim}</li>)}</ul>
              </div>
              <div className={`${styles.claimGroup} ${styles.unproven}`}>
                <b>Unbuilt or unproven</b>
                <ul>{plan.unbuiltOrUnproven.map((claim) => <li key={claim}>{claim}</li>)}</ul>
              </div>
              <div className={styles.claimGroup}>
                <b>Proposed remaining design</b>
                <ul>{plan.proposedRemainingDesign.map((claim) => <li key={claim}>{claim}</li>)}</ul>
              </div>
              <footer><b>Hard boundary</b>{plan.hardBoundary}</footer>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.sequence} id="sequence">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Historical X0—X9 framework · 22 August 2026</p>
            <h2>Evidence first.<br />Passenger service last.</h2>
          </div>
          <p>
            This is the original dependency framework. Its stage labels are
            retained as historical planning evidence; use the current source
            register for later accepted work and exact remaining interfaces.
          </p>
        </div>
        <div className={styles.stageList}>
          {report.dependencyOrder.map((stage) => (
            <article key={stage.id}>
              <span>{stage.id}</span>
              <div><h3>{stage.name}</h3><p>{stage.exit}</p></div>
              <i className={statusTone(stage.status)}>{readable(stage.status)}</i>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.boundaries}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Non-negotiable truth boundary</p>
            <h2>What this report cannot authorize.</h2>
          </div>
        </div>
        <div className={styles.boundaryGrid}>
          {report.hardExecutionBoundaries.map((boundary, index) => (
            <article key={boundary}><span>{String(index + 1).padStart(2, '0')}</span><p>{boundary}</p></article>
          ))}
        </div>
      </section>

      <section className={styles.evidence} id="evidence">
        <div>
          <p className={styles.eyebrow}>Historical validation · 22 August 2026</p>
          <h2>{validation.summary.passedStructuralCheckCount} checks at the original cutoff.</h2>
          <p>
            The original validation records {validation.summary.passedBindingCheckCount}/{validation.summary.bindingCheckCount}
            {' '}bindings at its own source cutoff. Several source documents have
            since changed; this archived result does not validate their current
            contents. The new source register binds the current documented state.
          </p>
        </div>
        <div className={styles.downloads}>
          <a href="/master-plan-railway/report-input.json">Structured plan input <span>JSON ↗</span></a>
          <a href="/master-plan-railway/validation.json">Reconciliation validation <span>JSON ↗</span></a>
          <a href="/master-plan-railway/master-plan.md">Unified source narrative <span>MD ↗</span></a>
          <a href="/master-plan-railway/publication-manifest.json">Publication manifest <span>JSON ↗</span></a>
        </div>
      </section>

      <footer className={styles.footer}>
        <a href="/">← Master Plan workspace</a>
        <span>IANLAN NextGen · read-only reconciliation</span>
        <a href="#top">Back to top ↑</a>
      </footer>
    </main>
  );
}
