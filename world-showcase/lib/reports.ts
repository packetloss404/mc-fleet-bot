import currentState from '../public/current-plan-state/index.json';
import coordinateData from '../public/coordinates/portal-summary.json';
import undergroundData from '../public/underground/portal-summary.json';

export interface ReportMetric {
  value: string;
  label: string;
}

export interface ReportDefinition {
  slug: string;
  number: string;
  title: string;
  project: string;
  summary: string;
  status: string;
  published: string;
  image: string;
  href: string;
  metrics: ReportMetric[];
}

export const reports: ReportDefinition[] = [
  {
    slug: 'master-plan',
    number: '01',
    title: 'Master Plan',
    project: 'MC Fleet · Cross-town reconciliation',
    summary: (
      'Thirteen evidence-bound plans: what is accepted, what remains unproven, '
      + 'and the exact dependency chain toward a future Cross-Town Railway.'
    ),
    status: 'Current documented plan state',
    published: new Date(`${currentState.reconciledOn}T00:00:00Z`).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }),
    image: '/underground/maps/01-underground-world-overview.png',
    href: '/reports/master-plan',
    metrics: [
      { value: '13', label: 'plans reconciled' },
      { value: '7 / 7', label: 'R00 gates passed' },
      { value: String(currentState.sources.length), label: 'bound source documents' },
    ],
  },
  {
    slug: 'underground-navigation',
    number: '02',
    title: 'Underground Navigation',
    project: 'MC Fleet · World Systems Atlas',
    summary: (
      'The dated underground atlas regenerated 27 August, with later access and '
      + 'construction records linked from the current plan state.'
    ),
    status: 'Historical atlas · 22 August route snapshot',
    published: '27 August 2026',
    image: '/underground/maps/02-underground-skywalk-schematic.png',
    href: '/reports/underground-navigation',
    metrics: [
      { value: String(undergroundData.counts.maps), label: 'historical navigation maps' },
      { value: String(undergroundData.counts.undergroundNavigationRecords), label: 'catalog records at cutoff' },
      { value: String(undergroundData.counts.entranceAndAccessRecords), label: 'historical access nodes' },
    ],
  },
  {
    slug: 'masterplan-program',
    number: '03',
    title: 'Masterplan Program · Archive',
    project: 'MC Fleet · Combined Complex & area baselines',
    summary: (
      'The thirteen-plan library: the 01–05 authority chain that places the '
      + 'Combined Complex in the live world, the eight area baselines beside it, '
      + 'and the gate decisions recorded at its 5 August cutoff.'
    ),
    status: 'Historical archive · superseded gate status',
    published: '5 August 2026',
    image: '/masterplans/hero-phase0-overlay.webp',
    href: '/reports/masterplan-program',
    metrics: [
      { value: '13', label: 'masterplans' },
      { value: '2 / 7', label: 'R00 gates at historical cutoff' },
      { value: '30 / 30', label: 'G03 domains exact' },
    ],
  },
  {
    slug: 'poi-coordinate-directory',
    number: '04',
    title: 'POI Coordinate Directory',
    project: 'MC Fleet · World Operator Index',
    summary: (
      'Every cataloged point and place of interest, grouped for operators and '
      + 'searchable with copy-ready teleport coordinates.'
    ),
    status: '27 August catalog edition',
    published: '27 August 2026',
    image: '/atlas/town-expansion/map-whole-world-overview.png',
    href: '/reports/poi-coordinate-directory',
    metrics: [
      { value: coordinateData.counts.records.toLocaleString(), label: 'places indexed' },
      { value: '6', label: 'operator groups' },
      { value: String(coordinateData.counts.pdfPages), label: 'PDF pages' },
    ],
  },
  {
    slug: 'empty-eight',
    number: '05',
    title: 'The Empty Eight',
    project: 'Combined Zones · South Galleria',
    summary: (
      'The accepted public-retail conversion: two PF08 stairs, eleven lit '
      + 'vacant shells, exact terminal evidence, and clearly retained boundaries.'
    ),
    status: 'Public route accepted',
    published: '22 August 2026',
    image: '/empty-eight/public-south-galleria.png',
    href: '/reports/empty-eight',
    metrics: [
      { value: '11', label: 'public vacant bays' },
      { value: '2', label: 'gallery stairs' },
      { value: '33', label: 'public lights' },
    ],
  },
  {
    slug: 'bunker-construction-status',
    number: '06',
    title: 'Bunker Construction Status',
    project: 'MC Fleet · Terminal Evidence Review',
    summary: (
      'The 22 August terminal review of Cheyenne, Raven Rock, and C01; '
      + 'later scoped releases are recorded in the current plan state.'
    ),
    status: 'Historical terminal review · 22 August',
    published: '22 August 2026',
    image: '/bunker-construction-status/maps/01-bunker-evidence-overview.png',
    href: '/reports/bunker-construction-status',
    metrics: [
      { value: '5,988 / 5,988', label: 'Cheyenne exact' },
      { value: '900,946', label: 'east C01 exact' },
      { value: '0', label: 'Raven Rock current' },
    ],
  },
];

export const masterPlanReport = reports[0];

// The workspace is intentionally hierarchical: the Master Plan is the entry
// point and these are its evidence chapters, not unrelated projects.
export const masterPlanEvidenceReports = reports.filter((report) => (
  [
    'underground-navigation',
    'poi-coordinate-directory',
    'empty-eight',
    'bunker-construction-status',
  ].includes(report.slug)
));

export const masterPlanArchiveReports = reports.filter((report) => (
  report.slug === 'masterplan-program'
));
