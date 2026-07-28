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
    project: 'MC Fleet · Town Expansion R1',
    summary: (
      'The accepted as-built record: master planning, district maps, '
      + 'database-linked objects, route proof, release QA, and rollback evidence.'
    ),
    status: 'Accepted',
    published: '28 July 2026',
    image: '/atlas/town-expansion/map-whole-world-overview.png',
    href: '/reports/master-plan',
    metrics: [
      { value: '340', label: 'objects' },
      { value: '1,178', label: 'visual records' },
      { value: '22', label: 'routes passed' },
    ],
  },
  {
    slug: 'underground-navigation',
    number: '02',
    title: 'Underground Navigation',
    project: 'MC Fleet · World Systems Atlas',
    summary: (
      'A map-first guide to every cataloged tunnel, bunker, vault, below-grade '
      + 'venue, underground room, and known way in.'
    ),
    status: 'Report complete',
    published: '28 July 2026',
    image: '/underground/maps/02-underground-skywalk-schematic.png',
    href: '/reports/underground-navigation',
    metrics: [
      { value: '18', label: 'navigation maps' },
      { value: '289', label: 'catalog records' },
      { value: '22', label: 'access nodes' },
    ],
  },
];
