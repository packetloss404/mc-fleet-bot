#!/usr/bin/env node
/** Import MainStreet America's authored room bounds into WorldFeatureStore. */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { WorldFeatureStore } = require('../dist/world/WorldFeatureStore');

const root = path.resolve(__dirname, '..');
const manifestPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'mainstreet-america', 'planning', 'floorplans.yaml');
const store = new WorldFeatureStore();

try {
  const plan = yaml.load(fs.readFileSync(manifestPath, 'utf8'));
  if (!plan || !Array.isArray(plan.homes)) {
    throw new Error('floorplan manifest must contain a homes array');
  }

  const homesByExternalId = new Map(
    store.listFeatures({ projectId: plan.project_id, kind: 'building', limit: 1_000 })
      .filter((feature) => feature.externalId)
      .map((feature) => [feature.externalId, feature]),
  );
  const roomFeatures = [];

  for (const home of plan.homes) {
    const parent = homesByExternalId.get(home.id);
    if (!parent) {
      throw new Error(`building feature ${home.id} is missing; import world-features.json first`);
    }
    if (!home.shell || !Array.isArray(home.shell.floors_y) || !Array.isArray(home.rooms)) {
      throw new Error(`home ${home.id} has an invalid shell or rooms list`);
    }
    for (const room of home.rooms) {
      if (!Array.isArray(room.bounds) || room.bounds.length !== 4) {
        throw new Error(`${home.id}/${room.name} bounds must be [minX,minZ,maxX,maxZ]`);
      }
      const floorY = home.shell.floors_y[room.floor - 1];
      if (!Number.isFinite(floorY)) {
        throw new Error(`${home.id}/${room.name} references missing floor ${room.floor}`);
      }
      const [minX, minZ, maxX, maxZ] = room.bounds;
      roomFeatures.push({
        projectId: plan.project_id,
        externalId: `ROOM:${home.id}:${room.name}`,
        parentId: parent.id,
        world: plan.world,
        name: `${home.name} — ${room.name.replaceAll('_', ' ')}`,
        kind: 'room',
        status: 'partial',
        geometry: {
          type: 'bounds',
          minX,
          maxX,
          minY: floorY + 1,
          maxY: floorY + 4,
          minZ,
          maxZ,
        },
        source: 'manifest',
        sourceRef: path.relative(root, manifestPath),
        confidence: 0.8,
        completionRatio: 0.82,
        conditionScore: 86,
        tags: ['model-home-room', home.id.toLowerCase(), home.style.toLowerCase().replaceAll(' ', '-')],
        attributes: {
          homeId: home.id,
          floor: room.floor,
          planConcept: home.plan_concept,
          circulation: home.circulation,
        },
      });
    }
  }

  const imported = store.importFeatures(roomFeatures);
  console.log(JSON.stringify({
    projectId: plan.project_id,
    homes: plan.homes.length,
    rooms: imported.length,
    dbPath: store.dbPath,
  }));
} finally {
  store.close();
}
