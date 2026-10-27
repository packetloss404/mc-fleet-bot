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
    status: 'Reconciliation passed',
    published: '22 August 2026',
    image: '/underground/maps/01-underground-world-overview.png',
    href: '/reports/master-plan',
    metrics: [
      { value: '13', label: 'plans reconciled' },
      { value: '30', label: 'built claims' },
      { value: '29 / 29', label: 'evidence bindings' },
    ],
  },
  {
    slug: 'underground-navigation',
    number: '02',
    title: 'Underground Navigation',
    project: 'MC Fleet · World Systems Atlas',
    summary: (
      'A current-snapshot access guide to what is walkable, public, staff-only, '
      + 'adults-only, sealed, or still unproven below grade.'
    ),
    status: 'Current access sealed',
    published: '22 August 2026',
    image: '/underground/maps/02-underground-skywalk-schematic.png',
    href: '/reports/underground-navigation',
    metrics: [
      { value: '20', label: 'navigation maps' },
      { value: '298', label: 'catalog records' },
      { value: '19 / 22', label: 'current routes' },
    ],
  },
  {
    slug: 'masterplan-program',
    number: '03',
    title: 'Masterplan Program',
    project: 'MC Fleet · Combined Complex & area baselines',
    summary: (
      'The thirteen-plan library: the 01–05 authority chain that places the '
      + 'Combined Complex in the live world, the eight area baselines beside it, '
      + 'and the gates still holding construction.'
    ),
    status: 'Build HOLD',
    published: '5 August 2026',
    image: '/masterplans/hero-phase0-overlay.webp',
    href: '/reports/masterplan-program',
    metrics: [
      { value: '13', label: 'masterplans' },
      { value: '2 / 7', label: 'R00 gates passed' },
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
    status: 'Directory sealed',
    published: '29 July 2026',
    image: '/atlas/town-expansion/map-whole-world-overview.png',
    href: '/reports/poi-coordinate-directory',
    metrics: [
      { value: '1,215', label: 'places indexed' },
      { value: '6', label: 'operator groups' },
      { value: '135', label: 'PDF pages' },
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
      'What is physically built now across Cheyenne, Raven Rock, and C01—'
      + 'with design intent, historical releases, and commissioning limits kept separate.'
    ),
    status: 'Evidence sealed',
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
