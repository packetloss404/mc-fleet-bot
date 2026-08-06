/**
 * Masterplan program data, transcribed from docs/masterplans.
 *
 * Sources are the committed build-info.json files (plans 01–05) and the
 * MASTERPLAN.md front matter (plans 06–13). Every number here is copied from
 * that evidence rather than derived, so a plan that has not been re-audited
 * keeps its stated status instead of being upgraded by implication.
 */

export type PlanTrack = 'authority' | 'area';

export type PlanTone = 'accepted' | 'hold' | 'input';

export interface PlanFact {
  label: string;
  value: string;
}

export interface Masterplan {
  id: string;
  number: string;
  name: string;
  track: PlanTrack;
  role: string;
  status: string;
  tone: PlanTone;
  summary: string;
  cover: string;
  facts: PlanFact[];
}

/** The 01→05 chain controls the Combined Complex / Combined Zones program. */
export const AUTHORITY_CHAIN = '01 + 02 + 03 → 04 normalized architecture → 05 current-world placement';

export const masterplans: Masterplan[] = [
  {
    id: '01-cheyenne-mountain-complex',
    number: '01',
    name: 'Cheyenne Mountain Complex',
    track: 'authority',
    role: 'Internal architectural program',
    status: 'Design input · v1.0',
    tone: 'input',
    summary:
      'The hardened-mountain program: portal approach, J-curve bore, blast-door '
      + 'airlock, spring-mounted chambers, command centre, and reservoir. Feeds the '
      + '04 normalization as internal architecture, not as a placement authority.',
    cover: '/masterplans/01-cheyenne-cover.webp',
    facts: [
      { label: 'Buildings', value: '15' },
      { label: 'Renderings', value: '16' },
      { label: 'Block budget', value: '414,700' },
      { label: 'Build height', value: '1,550' },
      { label: 'Scale', value: '2:1 vertical · 4:1 horizontal' },
      { label: 'Open questions', value: '7' },
    ],
  },
  {
    id: '02-subtropolis',
    number: '02',
    name: 'SubTropolis',
    track: 'authority',
    role: 'Internal architectural program',
    status: 'Design input · v1.0',
    tone: 'input',
    summary:
      'The mined-limestone industrial park: an 8×8 pillar grid on a 5-block ceiling, '
      + 'Hushpuckney Avenue as the spine, and thirteen tenant zones including the '
      + 'USPS and NARA vault programs.',
    cover: '/masterplans/02-subtropolis-cover.webp',
    facts: [
      { label: 'Tenant zones', value: '13' },
      { label: 'Renderings', value: '20' },
      { label: 'Block budget', value: '550,000' },
      { label: 'Footprint', value: '200 × 200 blocks' },
      { label: 'Main avenue', value: '350 blocks' },
      { label: 'Open questions', value: '13' },
    ],
  },
  {
    id: '03-houston-tunnel-system',
    number: '03',
    name: 'Houston Tunnel System',
    track: 'authority',
    role: 'Internal architectural program',
    status: 'Design input · v1.0',
    tone: 'input',
    summary:
      'The downtown pedestrian tunnel network: twenty-four city blocks served seven '
      + 'blocks below grade, with lobby descents, garage-direct access, and four '
      + 'food-court anchors.',
    cover: '/masterplans/03-houston-cover.webp',
    facts: [
      { label: 'City blocks', value: '24' },
      { label: 'Food courts', value: '4' },
      { label: 'Renderings', value: '20' },
      { label: 'Block budget', value: '176,500' },
      { label: 'Tunnel depth', value: '7 blocks' },
      { label: 'Open questions', value: '10' },
    ],
  },
  {
    id: '04-combined-complex',
    number: '04',
    name: 'Combined Complex',
    track: 'authority',
    role: 'Normalized composition',
    status: 'Normalized · v2.0 No-Ravine Rework',
    tone: 'input',
    summary:
      'The three internal programs normalized into one continuous mountain. The '
      + 'V-ravine is dropped for a single granite peak over a horizontal '
      + 'granite–limestone contact at Y=200; the service tunnel becomes an ascending '
      + '3.33:1 bore and the summit platform replaces the skybridge.',
    cover: '/masterplans/04-combined-complex-cover.webp',
    facts: [
      { label: 'World footprint', value: '1,500 × 1,500 blocks' },
      { label: 'Granite peak', value: 'Y=800' },
      { label: 'Geological contact', value: 'Y=200' },
      { label: 'Service tunnel', value: 'Y=0 → Y=200 at 3.33:1' },
      { label: 'Centerpieces', value: '7' },
      { label: 'World edits authorized', value: 'No' },
    ],
  },
  {
    id: '05-combined-zones',
    number: '05',
    name: 'Combined Zones',
    track: 'authority',
    role: 'Current-world placement',
    status: 'Phase 1 partial pass · build HOLD',
    tone: 'hold',
    summary:
      'Where the normalized complex would actually sit in the live world. Phase 0 '
      + 'terrain evidence passes for detailed design; Phase 1 coordination is a '
      + 'partial pass. Operation compilation and construction remain on hold and no '
      + 'artifact here authorizes a world edit.',
    cover: '/masterplans/05-combined-zones-cover.webp',
    facts: [
      { label: 'Reservation', value: 'X 1500‥2550 · Z −1150‥300' },
      { label: 'Local origin', value: '(2048, 72, −328)' },
      { label: 'East Corridor', value: '1,244.3 blocks' },
      { label: 'Rail profile', value: 'PASS · 1-in-8 · Y 63‥114' },
      { label: 'Subway', value: '8 tracks · 8 platforms' },
      { label: 'Phase 0 chunks', value: '14,238 atlas · 6,097 reserve' },
      { label: 'G03 domains', value: '30 / 30 exact' },
      { label: 'G04 cells', value: '15,286,976 assigned once' },
    ],
  },
  {
    id: '06-approach-road',
    number: '06',
    name: 'Western Approach Road',
    track: 'area',
    role: 'Catalog baseline · stewardship',
    status: 'Complete · cataloged',
    tone: 'accepted',
    summary:
      'The regional road connection from Ravensgate toward Westlight. A deliberately '
      + 'narrow scope: two durable features, not the whole Westlight district or any '
      + 'later Town Expansion road package.',
    cover: '/atlas/western-corridor.png',
    facts: [
      { label: 'Durable features', value: '2' },
      { label: 'Envelope', value: 'X −352‥−148 · Z −509‥−484' },
      { label: 'Carriageway', value: '7 blocks wide · 6 authored points' },
      { label: 'Condition', value: '100 · completion 1.0' },
    ],
  },
  {
    id: '07-mainstreet-america',
    number: '07',
    name: 'MainStreet America',
    track: 'area',
    role: 'Campus baseline · phased stewardship',
    status: 'Accepted as-built campus',
    tone: 'accepted',
    summary:
      'The reconstructed campus after several design, construction, repair, interior, '
      + 'and redevelopment waves. Future work is maintenance or separately approved '
      + 'redevelopment — not a blanket refit.',
    cover: '/atlas/mainstreet.png',
    facts: [
      { label: 'Buildings', value: '32' },
      { label: 'Rooms cataloged', value: '126' },
      { label: 'Districts', value: '13' },
      { label: 'Site envelope', value: 'X −300‥300 · Z −300‥300' },
    ],
  },
  {
    id: '08-raven-rock',
    number: '08',
    name: 'Raven Rock / Site R',
    track: 'area',
    role: 'Interior, wet-edge, legibility plan',
    status: 'Built · route evidence open',
    tone: 'accepted',
    summary:
      'A substantially built underground destination. The plan starts from the accepted '
      + 'world record rather than the original brief, and keeps the interior labeled as '
      + 'a creative approximation rather than a real floor plan.',
    cover: '/atlas/raven-rock.png',
    facts: [
      { label: 'Complete features', value: '81' },
      { label: 'Named rooms', value: '28' },
      { label: 'Release', value: 'Wave 2 accepted' },
      { label: 'Open', value: 'Public-route + life-safety evidence' },
    ],
  },
  {
    id: '09-ravensgate',
    number: '09',
    name: 'Ravensgate',
    track: 'area',
    role: 'Frozen boundary · default-deny underground',
    status: 'Frozen · complete',
    tone: 'accepted',
    summary:
      'A compact civic-garden district with a deliberately frozen boundary, so that '
      + 'neighbouring pavilion, Guild Hall, library, water, or underground work cannot '
      + 'be mislabeled as a Ravensgate expansion.',
    cover: '/atlas/ravensgate.png',
    facts: [
      { label: 'Cataloged structures', value: '4' },
      { label: 'District', value: 'X −148‥−64 · Z −562‥−420' },
      { label: 'Scanned envelope', value: 'X −111‥−65 · Y 68‥109' },
      { label: 'Underground policy', value: 'Default deny' },
    ],
  },
  {
    id: '10-ravensreach',
    number: '10',
    name: 'Ravensreach',
    track: 'area',
    role: 'Stewardship · completion plan',
    status: 'Built · interfaces open',
    tone: 'accepted',
    summary:
      'A built civic settlement with a deep legacy document set. The plan reconciles '
      + 'the early incident and redesign records against later accepted evidence, and '
      + 'guards against a return to destructive grading.',
    cover: '/atlas/ravensreach.png',
    facts: [
      { label: 'Durable features', value: '63' },
      { label: 'Structures', value: '11' },
      { label: 'Named rooms', value: '46' },
      { label: 'Open', value: 'External route + configuration' },
    ],
  },
  {
    id: '11-town-expansion-r1',
    number: '11',
    name: 'Town Expansion R1',
    track: 'area',
    role: 'Accepted release baseline',
    status: 'Accepted · PASS',
    tone: 'accepted',
    summary:
      'A completed, accepted release rather than an unbuilt proposal. Deliberately '
      + 'cross-area — Manager Vale, the owner route and observatory, MainStreet, '
      + 'Westlight, the oasis district, C01, and the northeast data district.',
    cover: '/atlas/town-expansion/map-whole-world-overview.png',
    facts: [
      { label: 'Durable records', value: '340' },
      { label: 'Composition', value: '6 buildings · 261 custom · 63 rooms' },
      { label: 'Derived envelope', value: 'X −714‥1300 · Z −719‥296' },
      { label: 'Verifier', value: 'PASS / ACCEPTED' },
      { label: 'Completion ratio', value: '1.0' },
    ],
  },
  {
    id: '12-westlight-district',
    number: '12',
    name: 'Westlight District',
    track: 'area',
    role: 'Interior baseline · chronology reconciliation',
    status: 'Complete · verified interior',
    tone: 'accepted',
    summary:
      'A complete interior district whose saved-world census reports no primary '
      + 'ladders, no multi-floor structure without stairs, no cave-air exposure, and '
      + 'no empty or under-detailed rooms.',
    cover: '/atlas/westlight.png',
    facts: [
      { label: 'Durable records', value: '59' },
      { label: 'Structures', value: '14 buildings · 34 rooms' },
      { label: 'Envelope', value: 'X −429‥−260 · Z −556‥−445' },
      { label: 'Census', value: '10 multi-floor · 0 ladder-primary' },
    ],
  },
  {
    id: '13-westlight-venue',
    number: '13',
    name: 'Westlight Venue',
    track: 'area',
    role: 'Venue baseline · focal display',
    status: 'Accepted · complete',
    tone: 'accepted',
    summary:
      'The stadium and theatre complex only — not the surrounding district and not the '
      + 'full Westlight program. Includes the focal-display record that earlier '
      + 'database-and-media reports predated.',
    cover: '/atlas/westlight.png',
    facts: [
      { label: 'Durable records', value: '26' },
      { label: 'District', value: 'X −443‥−272 · Z −640‥−488' },
      { label: 'Condition', value: '100 · confidence 1.0' },
      { label: 'Focal display', value: 'WL-INFINITY-SCREEN' },
    ],
  },
];

export interface GalleryShot {
  image: string;
  plan: string;
  title: string;
}

/** Rendered views drawn from the 01–05 rendering and map sets. */
export const gallery: GalleryShot[] = [
  { image: '/masterplans/gallery-cheyenne-jcurve.webp', plan: 'Cheyenne', title: 'J-curve tunnel entrance' },
  { image: '/masterplans/gallery-cheyenne-battle-cab.webp', plan: 'Cheyenne', title: 'Battle cab command center' },
  { image: '/masterplans/gallery-cheyenne-main-chamber.webp', plan: 'Cheyenne', title: 'Main chamber reveal' },
  { image: '/masterplans/gallery-subtropolis-pillars.webp', plan: 'SubTropolis', title: 'Pillar grid reveal' },
  { image: '/masterplans/gallery-subtropolis-avenue.webp', plan: 'SubTropolis', title: 'Hushpuckney Avenue' },
  { image: '/masterplans/gallery-houston-corridor.webp', plan: 'Houston', title: 'Typical tunnel corridor' },
  { image: '/masterplans/gallery-houston-food-court.webp', plan: 'Houston', title: 'Esperson food court' },
  { image: '/masterplans/gallery-combined-mountain.webp', plan: 'Combined Complex', title: 'Continuous mountain range' },
  { image: '/masterplans/gallery-combined-pavilion.webp', plan: 'Combined Complex', title: 'Public shaft surface pavilion' },
  { image: '/masterplans/gallery-east-corridor-plan.webp', plan: 'Combined Zones', title: 'East Corridor plan' },
  { image: '/masterplans/gallery-vertical-zoning.webp', plan: 'Combined Zones', title: 'Vertical zoning section' },
];

export interface Gate {
  id: string;
  title: string;
  state: 'PASS' | 'HOLD';
  note: string;
}

/** R00 readiness audit — evaluates G01–G07 only. */
export const gates: Gate[] = [
  { id: 'G01', title: 'Siting and terrain', state: 'PASS', note: 'Phase 0 revised siting passes for detailed design, not for build.' },
  { id: 'G02', title: 'Complete-save intake', state: 'HOLD', note: 'Awaiting complete-save evidence.' },
  { id: 'G03', title: 'Canonical setout', state: 'PASS', note: 'All 30 proposal domains exact.' },
  { id: 'G04', title: 'Ownership accounting', state: 'HOLD', note: '15,286,976 cells assigned once with zero unowned or multiply owned, but final ownership acceptance is absent.' },
  { id: 'G05', title: 'External interface / state', state: 'HOLD', note: 'External-interface and state evidence outstanding.' },
  { id: 'G06', title: 'Protected features', state: 'HOLD', note: 'Owner selected controlled shipwreck removal; the exact 126-cell treatment, attribution, salvage, and release evidence remain HOLD.' },
  { id: 'G07', title: 'Mechanisms', state: 'HOLD', note: 'Accepted-owner and mechanism evidence outstanding.' },
];
