#!/usr/bin/env node
/**
 * Idempotently publish MainStreet's live navigation anchors and routes to the
 * active MarkerStore API. Staged Dynmap/warp YAML is not a substitute: those
 * plugins are absent on this server.
 */

const apiBase = process.env.MC_FLEET_API_URL ?? 'http://127.0.0.1:3001';

async function api(path, init) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${apiBase}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    });
    const payload = await response.json();
    if (response.ok) return payload;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get('retry-after') ?? '1');
      await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000));
      continue;
    }
    throw new Error(`${init?.method ?? 'GET'} ${path}: ${payload.error ?? response.status}`);
  }
  throw new Error(`${init?.method ?? 'GET'} ${path}: retry limit exceeded`);
}

const markerSpecs = [
  { name: 'MSA Discovery Court', kind: 'build-site', x: 91, y: 65, z: 200, tags: ['msa', 'arrival', 'public'] },
  { name: 'MSA Public Entry', kind: 'base', x: 116, y: 65, z: 172, tags: ['msa', 'mountain', 'public-entry'] },
  { name: 'MSA Public Concourse', kind: 'custom', x: 124, y: 63, z: 143, tags: ['msa', 'mountain', 'wayfinding'] },
  { name: 'MSA Underground Hangar', aliases: ['MSA Hangar'], kind: 'build-site', x: 150, y: 63, z: 110, tags: ['msa', 'mountain', 'hangar', 'underground'] },
  { name: 'MSA Hangar/Arena Hub', kind: 'custom', x: 200, y: 63, z: 109, tags: ['msa', 'mountain', 'wayfinding'] },
  { name: 'MSA Training Arena', kind: 'build-site', x: 225, y: 63, z: 110, tags: ['msa', 'mountain', 'arena'] },
  { name: 'MSA Hangar Office Shaft Landing', aliases: ['MSA Surface Shaft'], kind: 'custom', x: 200, y: 106, z: 153, tags: ['msa', 'mountain', 'shaft', 'surface', 'office'] },
  { name: 'MSA Surface Hangar Bay', kind: 'build-site', x: 218, y: 99, z: 160, tags: ['msa', 'mountain', 'hangar', 'surface'] },
  { name: 'MSA Surface Hangar South Door', kind: 'custom', x: 220, y: 99, z: 180, tags: ['msa', 'mountain', 'hangar', 'trail'] },
  { name: 'MSA Observatory', kind: 'custom', x: 200, y: 121, z: 165, tags: ['msa', 'mountain', 'observatory', 'roof'] },
  { name: 'MSA Heliport West Entry', kind: 'custom', x: 238, y: 89, z: 183, tags: ['msa', 'mountain', 'heliport', 'trail'] },
  { name: 'MSA Heliport', kind: 'build-site', x: 248, y: 90, z: 182, tags: ['msa', 'mountain', 'heliport'] },
  { name: 'MSA Penthouse Safe Room', kind: 'custom', x: 214, y: 106, z: 146, tags: ['msa', 'mountain', 'private', 'safe-room'] },
  { name: 'MSA Fallout Shelter', kind: 'custom', x: 160, y: 82, z: 148, tags: ['msa', 'mountain', 'private', 'shelter'] },
  { name: 'MSA Grand Vault Connector', kind: 'custom', x: 226, y: 82, z: 174, tags: ['msa', 'mountain', 'private', 'vault', 'connector'] },
  { name: 'MSA Grand Vault Upper Gallery', kind: 'custom', x: 240, y: 67, z: 190, tags: ['msa', 'mountain', 'private', 'vault', 'upper'] },
  { name: 'MSA Grand Vault Middle Gallery', kind: 'custom', x: 238, y: 56, z: 205, tags: ['msa', 'mountain', 'private', 'vault', 'middle'] },
  { name: 'MSA Grand Vault Lower Gallery', kind: 'custom', x: 246, y: 45, z: 222, tags: ['msa', 'mountain', 'private', 'vault', 'lower'] },
  { name: 'MSA Upper Shaft Landing', kind: 'custom', x: 200, y: 63, z: 151, tags: ['msa', 'mountain', 'shaft'] },
  { name: 'MSA Upper Briefing Theater', kind: 'custom', x: 160, y: 63, z: 154, tags: ['msa', 'mountain', 'theater'] },
  { name: 'MSA Lower Operations Landing', kind: 'custom', x: 200, y: 51, z: 151, tags: ['msa', 'mountain', 'lower-ops'] },
  { name: 'MSA Lower West Concourse', kind: 'custom', x: 145, y: 51, z: 126, tags: ['msa', 'mountain', 'lower-ops'] },
  { name: 'MSA Lower East Concourse', kind: 'custom', x: 260, y: 51, z: 126, tags: ['msa', 'mountain', 'lower-ops'] },
  { name: 'MSA Lower Theater', kind: 'custom', x: 145, y: 51, z: 175, tags: ['msa', 'mountain', 'lower-ops', 'theater'] },
  { name: 'MSA Conference A', kind: 'custom', x: 174, y: 51, z: 175, tags: ['msa', 'mountain', 'lower-ops', 'conference'] },
  { name: 'MSA Conference B', kind: 'custom', x: 194, y: 51, z: 175, tags: ['msa', 'mountain', 'lower-ops', 'conference'] },
  { name: 'MSA Conference C', kind: 'custom', x: 214, y: 51, z: 175, tags: ['msa', 'mountain', 'lower-ops', 'conference'] },
  { name: 'MSA Pond Overlook', kind: 'custom', x: 217, y: 69, z: -250, tags: ['msa', 'pond', 'overlook'] },
];

const existingMarkers = (await api('/api/markers')).markers;
const markerByName = new Map(existingMarkers.map((marker) => [marker.name, marker]));
for (const spec of markerSpecs) {
  const {
    name, aliases = [], kind, x, y, z, tags,
  } = spec;
  const body = {
    name,
    kind,
    position: { x, y, z },
    tags,
    notes: 'As-built and walk-verified 2026-07-26.',
  };
  const existing = markerByName.get(name)
    ?? aliases.map((alias) => markerByName.get(alias)).find(Boolean);
  const result = existing
    ? await api(`/api/markers/${existing.id}`, { method: 'PATCH', body: JSON.stringify(body) })
    : await api('/api/markers', { method: 'POST', body: JSON.stringify(body) });
  markerByName.set(name, result.marker);
  for (const alias of aliases) markerByName.delete(alias);
}

const routeSpecs = [
  {
    name: 'MSA Arrival to Hangar and Arena',
    names: [
      'MSA Discovery Court',
      'MSA Public Entry',
      'MSA Public Concourse',
      'MSA Underground Hangar',
      'MSA Hangar/Arena Hub',
      'MSA Training Arena',
    ],
    loop: false,
  },
  {
    name: 'MSA Underground to Surface Hangar',
    aliases: ['MSA Surface Shaft to Public Hub'],
    names: [
      'MSA Public Concourse',
      'MSA Hangar/Arena Hub',
      'MSA Upper Shaft Landing',
      'MSA Hangar Office Shaft Landing',
      'MSA Surface Hangar Bay',
    ],
    loop: false,
  },
  {
    name: 'MSA Surface Hangar to Heliport',
    names: [
      'MSA Surface Hangar Bay',
      'MSA Surface Hangar South Door',
      'MSA Heliport West Entry',
      'MSA Heliport',
    ],
    loop: false,
  },
  {
    name: 'MSA Private Residence to Grand Vault',
    names: [
      'MSA Penthouse Safe Room',
      'MSA Fallout Shelter',
      'MSA Grand Vault Connector',
      'MSA Grand Vault Upper Gallery',
      'MSA Grand Vault Middle Gallery',
      'MSA Grand Vault Lower Gallery',
    ],
    loop: false,
  },
  {
    name: 'MSA Lower Operations Loop',
    names: [
      'MSA Lower Operations Landing',
      'MSA Lower West Concourse',
      'MSA Lower Theater',
      'MSA Conference A',
      'MSA Conference B',
      'MSA Conference C',
      'MSA Lower East Concourse',
      'MSA Lower Operations Landing',
    ],
    loop: true,
  },
];
const existingRoutes = (await api('/api/routes')).routes;
for (const spec of routeSpecs) {
  const body = {
    name: spec.name,
    waypointIds: spec.names.map((name) => {
      const marker = markerByName.get(name);
      if (!marker) throw new Error(`missing marker ${name}`);
      return marker.id;
    }),
    loop: spec.loop,
  };
  const existing = existingRoutes.find(
    (route) => route.name === spec.name || (spec.aliases ?? []).includes(route.name),
  );
  if (existing) {
    await api(`/api/routes/${existing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
  } else {
    await api('/api/routes', { method: 'POST', body: JSON.stringify(body) });
  }
}

const zoneSpecs = [
  {
    name: 'MainStreet America Protected Property',
    mode: 'guard',
    shape: 'rectangle',
    rectangle: { minX: -300, minZ: -300, maxX: 300, maxZ: 300 },
    rules: { worldGuardRegion: 'mainstreet_america', membersOnlyBuild: true },
  },
  {
    name: 'MainStreet Mountain Surface Operations',
    mode: 'build',
    shape: 'rectangle',
    rectangle: { minX: 90, minZ: 135, maxX: 294, maxZ: 231 },
    rules: { projectId: 'DIV-C01-SURFACE' },
  },
];
const existingZones = (await api('/api/zones')).zones;
for (const body of zoneSpecs) {
  const existing = existingZones.find((zone) => zone.name === body.name);
  if (existing) {
    await api(`/api/zones/${existing.id}`, { method: 'PATCH', body: JSON.stringify(body) });
  } else {
    await api('/api/zones', { method: 'POST', body: JSON.stringify(body) });
  }
}

console.log(JSON.stringify({
  markers: markerSpecs.length,
  routes: routeSpecs.length,
  zones: zoneSpecs.length,
}, null, 2));
