#!/usr/bin/env node
/**
 * MP09 Long Water integrated successor design.
 *
 * This consumes current, read-only physical screens and produces the exact
 * design contract that must exist before any Long Water block is changed. It
 * deliberately emits neither operations nor a relaxed ownership claim.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const required = (name) => {
  const result = option(name);
  if (!result) throw new Error(`${name} is required`);
  return result;
};
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const read = (filename) => fs.readFileSync(absolute(filename));
const readJson = (filename) => JSON.parse(read(filename));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const write = (filename, payload) => {
  fs.mkdirSync(path.dirname(absolute(filename)), { recursive: true });
  fs.writeFileSync(absolute(filename), `${typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2)}\n`);
};
const hashSnapshot = (snapshot) => {
  const members = [];
  for (const directory of ['region', 'entities', 'poi']) {
    const root = path.join(absolute(snapshot), directory);
    for (const name of fs.readdirSync(root).filter((name) => name.endsWith('.mca')).sort()) members.push(path.join(directory, name));
  }
  members.push('level.dat');
  const hash = crypto.createHash('sha256');
  for (const member of members) {
    hash.update(`${member}\0`);
    hash.update(fs.readFileSync(path.join(absolute(snapshot), member)));
    hash.update('\0');
  }
  return { sha256: hash.digest('hex'), memberCount: members.length };
};
const assert = (condition, message) => { if (!condition) throw new Error(`MP09 integrated design rejected: ${message}`); };

const snapshot = required('--snapshot');
const microPath = required('--micro');
const basinPath = required('--basin');
const dryPath = required('--dry');
const out = required('--out');
const markdown = required('--markdown');
const planMap = required('--plan-map');
const sectionMap = required('--section-map');
const generatedAtUtc = option('--generated-at', new Date().toISOString());
const micro = readJson(microPath);
const basin = readJson(basinPath);
const dry = readJson(dryPath);
const capture = readJson(path.join(snapshot, 'combined-zones-complete-save-capture.json'));
const identity = hashSnapshot(snapshot);

assert(micro.status === 'NO_DRY_OWNED_ROUTE_OR_SUPPORT_MICRO_SCOPE_ON_CURRENT_RAVENSGATE_EVIDENCE', 'micro screen status drifted');
assert(micro.longWaterScreen.routeDeck.cellCount === 196, 'route deck cell count drifted');
assert(micro.longWaterScreen.exactHeadroomFailures.cellCount === 21, 'headroom failure count drifted');
assert(micro.longWaterScreen.waterTableLiner.exactSourceWaterCells === 186, 'source-water count drifted');
assert(micro.longWaterScreen.interactionHaloFluid.cellCount === 593, 'fluid halo count drifted');
assert(micro.longWaterScreen.storedBlockEntities.length === 0 && micro.source.entitiesPresent === true, 'current entity coverage is incomplete or contains target blockers');
assert(micro.ownershipAndHydrology.matchingLongWaterInterfaceContracts.length === 0, 'an unexpected Long Water interface is present');
assert(basin.decision.result === 'NO_CLOSED_BASIN_OR_ACCESS_PACKAGE_CAN_BE_STATED', 'basin screen is no longer a hold');
assert(basin.hydrology.componentCellCountWithinSurveyEnvelope === 1469, 'fluid component count drifted');
assert(basin.hydrology.closedBasinProven === false, 'closed basin unexpectedly marked proven');
assert(JSON.stringify(basin.hydrology.boundaryFaces) === JSON.stringify(['maxY', 'minY']), 'fluid-boundary contact changed');
assert(dry.decision.exactTargetCells.length === 0, 'dry screen unexpectedly emitted targets');

const contract = {
  schemaVersion: 1,
  id: 'MP09-LONG-WATER-INTEGRATED-CONTAINMENT-GRADE-DESIGN-02',
  status: 'DESIGN_ONLY_NO_SAFE_INDEPENDENT_PHYSICAL_DELTA',
  generatedAtUtc,
  source: {
    immutableSnapshot: {
      path: relative(snapshot), sha256: identity.sha256, memberCount: identity.memberCount,
      captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, immutableCopy: capture.immutableCopy === true,
    },
    inputs: Object.fromEntries([microPath, basinPath, dryPath,
      'data/world-review/ravensgate-ownership-contract-20260825/ravensgate-ownership-contract.json'].map((filename) => [relative(filename), sha256(read(filename))])),
  },
  exactCurrentCondition: {
    reviewedTwoWideDeck: { bounds: { minX: -87, maxX: -86, minY: 67, maxY: 69, minZ: -552, maxZ: -455 }, cells: 196 },
    northTieIn: { cells: [{ x: -87, y: 67, z: -454 }, { x: -86, y: 67, z: -454 }], issue: 'both proposed first walking cells at z=-455 are blocked through y=69 by stone-brick states' },
    tempiettoLanding: { entrance: { x: -85, y: 69, z: -552 }, issue: 'arrival grade rises from y=67 to y=69 and requires a designed two-wide landing' },
    sourceWaterDisplacement: { cells: 186, bounds: { minX: -87, maxX: -86, minY: 66, maxY: 66, minZ: -550, maxZ: -458 } },
    interactionHaloFluidCells: 593,
    affectedFluidComponent: {
      cellsWithinSurveyEnvelope: 1469, bounds: basin.hydrology.componentBoundsWithinSurveyEnvelope,
      surveyBounds: basin.hydrology.surveyBounds, boundaryContacts: { faces: basin.hydrology.boundaryFaces, cellCount: basin.hydrology.boundaryContactCellCount },
      conclusion: 'The component is not a proven closed basin: it meets both the top and base of the surveyed vertical envelope.',
    },
    currentSafetyCensus: { storedBlockEntities: 0, savedEntitiesAtCapture: 0, note: 'Historical saved-entity zero is not an execution clearance.' },
    ownership: { exactLongWaterHydrologyOrLandingContracts: 0, result: 'DEFAULT_DENY' },
  },
  mandatoryIntegratedPackageOrder: [
    {
      phase: 'A — exact 3-D authority and hydrology boundary', mutationAllowed: false,
      requirements: ['one owner per containment, water, bridge, north-tie, and Tempietto landing cell', 'enumerate the full six-neighbour water component beyond the present y64..70 screen until all side/base/top exits are classified', 'declare the preserved water volume, any outlet/overflow, and every excluded structure/protected core'],
    },
    {
      phase: 'B — source-bound containment and drainage design', mutationAllowed: false,
      requirements: ['complete before/after state for every containment/flow-control cell', 'prove no unclassified fluid can reach the proposed 186-cell displacement band', 'preserve the underground exclusion and y36..43 buffer; no foundation may enter either'],
    },
    {
      phase: 'C — two-wide bridge/grade/landing geometry', mutationAllowed: false,
      requirements: ['replace the blocked north tie-in with a separately owned geometry that yields two clear headroom cells', 'provide a supported one-step-or-less grade from north approach to Tempietto entrance (-85,69,-552)', 'prove bidirectional normal walking after the containment state is projected'],
    },
    {
      phase: 'D — compiler and guarded release kernel', mutationAllowed: false,
      requirements: ['canonical forward/inverse operations; forward containment before water displacement before deck/landing, exact inverse in reverse hydraulic order', 'fresh complete source, block-entity exclusion, repeated live-entity clearance, strict parser/source and projected rollback preflights, journaled execution, fresh post capture, rollback poststate preflight, independent hydrology and route QA'],
    },
  ],
  rejectedIndependentDeltas: [
    'paving or lighting dry unprogrammed ground',
    'deck-only headroom carve',
    '186-cell water-table liner without full basin proof',
    'Tempietto landing without Long Water containment',
    'broad Ravensgate or Town Expansion ownership inference',
  ],
  decision: {
    physicalOperations: 0, rollbackOperations: 0, configOrCatalogMutations: 0,
    releaseEligible: false,
    reasonCodes: ['21_HEADROOM_FAILURES', '186_SOURCE_WATER_DISPLACEMENTS', '593_HALO_FLUIDS', 'VERTICALLY_OPEN_1469_CELL_COMPONENT', 'ZERO_LONG_WATER_OWNERSHIP_INTERFACES', 'NO_NAMED_DRY_DEFECT'],
  },
  nonClaims: ['closed basin', 'safe hydrology', 'safe grade', 'public route', 'Ravensgate completion'],
};
contract.identitySha256 = sha256(JSON.stringify(contract));

const district = { minX: -148, maxX: -64, minZ: -562, maxZ: -420 };
const mapPoint = ({ x, z }) => ({ x: 55 + ((x - district.minX) / (district.maxX - district.minX)) * 700, y: 58 + ((district.maxZ - z) / (district.maxZ - district.minZ)) * 610 });
const rect = (bounds, fill, stroke, label) => { const topLeft = mapPoint({ x: bounds.minX, z: bounds.maxZ }); const bottomRight = mapPoint({ x: bounds.maxX, z: bounds.minZ }); return `<rect x="${topLeft.x}" y="${topLeft.y}" width="${bottomRight.x-topLeft.x}" height="${bottomRight.y-topLeft.y}" fill="${fill}" stroke="${stroke}" stroke-width="2"/><text x="${topLeft.x+5}" y="${topLeft.y+17}" class="small">${label}</text>`; };
const plan = `<svg xmlns="http://www.w3.org/2000/svg" width="810" height="760" viewBox="0 0 810 760"><style>text{font-family:Arial,sans-serif;fill:#eff6ff}.title{font-size:21px;font-weight:700}.small{font-size:12px}.note{font-size:13px;fill:#cbd5e1}.grid{stroke:#334155;stroke-width:1}</style><rect width="100%" height="100%" fill="#0b1220"/><text x="55" y="29" class="title">MP09 Long Water — integrated containment/grade dependency map</text>${[-560,-540,-520,-500,-480,-460,-440,-420].map((z)=>{const p=mapPoint({x:-100,z});return `<line x1="55" y1="${p.y}" x2="755" y2="${p.y}" class="grid"/><text x="8" y="${p.y+4}" class="small">z ${z}</text>`;}).join('')}${[-140,-120,-100,-80,-60].map((x)=>{const p=mapPoint({x,z:-500});return `<line x1="${p.x}" y1="58" x2="${p.x}" y2="668" class="grid"/><text x="${p.x-13}" y="688" class="small">x ${x}</text>`;}).join('')}${rect({minX:-148,maxX:-64,minZ:-562,maxZ:-420},'none','#94a3b8','frozen Ravensgate district')}${rect({minX:-93,maxX:-77,minZ:-562,maxZ:-551},'#475569','#cbd5e1','Tempietto / landing')}${rect({minX:-87,maxX:-86,minZ:-550,maxZ:-455},'#0e7490','#67e8f9','186 water displacement band')}${rect({minX:-92,maxX:-78,minZ:-550,maxZ:-455},'rgba(59,130,246,.22)','#60a5fa','1,469-cell component extents')}${rect({minX:-87,maxX:-86,minZ:-454,maxZ:-431},'#64748b','#fbbf24','north garden tie-in')}${rect({minX:-105,maxX:-65,minZ:-449,maxZ:-426},'#475569','#cbd5e1','Stoa protected realm')}<line x1="${mapPoint({x:-86.5,z:-454}).x}" y1="${mapPoint({x:-86.5,z:-454}).y}" x2="${mapPoint({x:-86.5,z:-552}).x}" y2="${mapPoint({x:-86.5,z:-552}).y}" stroke="#ef4444" stroke-width="5" stroke-dasharray="8 6"/><text x="55" y="720" class="note">Red dashed: reviewed alignment only — zero operations. Blue: current affected water, vertically unbounded at y64/y70 survey faces.</text><text x="55" y="741" class="note">No dry side-ground is designated as a route or claimed for paving.</text></svg>`;
const rows = [70,69,68,67,66,65,64];
const section = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="470" viewBox="0 0 1000 470"><style>text{font-family:Arial,sans-serif;fill:#eff6ff}.title{font-size:21px;font-weight:700}.label{font-size:14px}.small{font-size:12px;fill:#cbd5e1}.grid{stroke:#334155;stroke-width:1}</style><rect width="100%" height="100%" fill="#0b1220"/><text x="48" y="31" class="title">Long Water section / release sequence — current state blocks all isolated phases</text>${rows.map((y,index)=>`<line x1="110" y1="${78+index*42}" x2="930" y2="${78+index*42}" class="grid"/><text x="48" y="${83+index*42}" class="label">y=${y}</text>`).join('')}<rect x="185" y="${78+3*42}" width="510" height="38" fill="#65a30d"/><text x="198" y="${103+3*42}" class="label">reviewed deck floor y67, x=-87..-86, z=-455..-550</text><rect x="185" y="${78+4*42}" width="510" height="38" fill="#0284c7"/><text x="198" y="${103+4*42}" class="label">186 source-water cells at y66 proposed as displacement — prohibited until containment proof</text><rect x="185" y="${78}" width="510" height="38" fill="rgba(59,130,246,.25)" stroke="#60a5fa"/><rect x="185" y="${78+6*42}" width="510" height="38" fill="rgba(59,130,246,.25)" stroke="#60a5fa"/><text x="710" y="100" class="small">fluid component reaches y70 limit</text><text x="710" y="352" class="small">fluid component reaches y64 limit</text><rect x="715" y="${78+2*42}" width="95" height="38" fill="#991b1b"/><rect x="715" y="${78+3*42}" width="95" height="38" fill="#991b1b"/><text x="825" y="${78+3*42+26}" class="small">north z=-455: 21 exact headroom failures</text><path d="M 695 245 L 790 203 L 875 161" fill="none" stroke="#f59e0b" stroke-width="6"/><text x="710" y="275" class="small">required future designed grade to Tempietto entrance y69</text><text x="110" y="414" class="label">Required ordering: exact 3-D ownership + full basin census → containment/drainage proof → bridge/grade/landing → canonical inverse + guarded physical kernel.</text><text x="110" y="442" class="small">No deck-only, liner-only, landing-only, or dry-land paving package is permitted.</text></svg>`;
write(out, contract);
write(planMap, plan);
write(sectionMap, section);
const md = `# MP09 Long Water integrated containment and grade design 02\n\n**Status:** \`${contract.status}\`. This is a precise future package design, not an operation, route, hydrology acceptance, or release.\n\n![Long Water dependency plan](${path.basename(planMap)})\n\n![Long Water section and order](${path.basename(sectionMap)})\n\n## Current-source result\n\nThe MP06 post snapshot preserves the same sole named unbuilt Stoa-to-Tempietto objective, but it is not separable into paving. The exact two-wide reviewed band contains **21** headroom failures at its north tie-in, requires **186** source-water displacements at y66, and has **593** fluid cells in its immediate halo. Its affected six-neighbour component contains **1,469** fluid cells inside the district screen and reaches both y64 and y70 boundaries; the source does not prove a closed basin. There are zero Long Water hydrology, displacement, grade, or landing interface contracts.\n\n## Required integrated build\n\n1. Establish exact 3-D ownership and extend the fluid census until every top, base, and side exit is classified.\n2. Design containment/drainage first, including preserved water volume and every outlet/overflow decision.\n3. Design a separately owned two-wide north tie-in and a supported one-step-or-less grade/landing to the Tempietto entrance \`(-85,69,-552)\`.\n4. Only then compile a canonical forward/inverse package: containment before displacement before deck/landing; rollback reverses that hydraulic dependency.\n5. The fresh release kernel still applies before any mutation, including renewed source, repeated live entity clearance, strict preflights, journal, post snapshot, rollback proof, and independent hydrology/route QA.\n\n## Explicitly rejected shortcuts\n\nDeck-only carving, a 186-cell liner by itself, landing-only work, dry-ground paving, and broad Ravensgate/Town Expansion ownership inference are all default-deny.\n\n## Evidence\n\n- Current micro-scope: \`${relative(microPath)}\`\n- Current closed-basin survey: \`${relative(basinPath)}\`\n- Current dry-component screen: \`${relative(dryPath)}\`\n`;
write(markdown, md);
process.stdout.write(`${JSON.stringify({ status: contract.status, out: relative(out), markdown: relative(markdown), planMap: relative(planMap), sectionMap: relative(sectionMap), identitySha256: contract.identitySha256 }, null, 2)}\n`);
