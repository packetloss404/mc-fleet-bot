import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const DECISION_PATH = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-design-decisions.json',
);

interface Decision {
  id: string;
  topic: string;
  status: 'RESOLVED' | 'HOLD';
  selection: string | null;
  [key: string]: unknown;
}

interface DecisionAudit {
  schemaVersion: number;
  id: string;
  status: string;
  authority: {
    chain: string;
    planToDevelop: string;
    offlineOnly: boolean;
    worldEditAuthorized: boolean;
    constructionPackageExists: boolean;
  };
  sourceReferences: Array<{ path: string; relevance: string }>;
  summary: {
    decisionCount: number;
    resolvedDecisionIds: string[];
    holdDecisionIds: string[];
    resolvedCount: number;
    holdCount: number;
    phase1DecisionGatePassed: boolean;
  };
  decisions: Decision[];
  gateDecision: {
    phase1OfflineDesignMayContinue: boolean;
    phase1Exit: string;
    advanceToPhysicalPhase: boolean;
    liveBuildMayProceed: boolean;
  };
}

function readAudit(): DecisionAudit {
  return JSON.parse(fs.readFileSync(DECISION_PATH, 'utf8')) as DecisionAudit;
}

function decision(audit: DecisionAudit, id: string): Decision {
  const found = audit.decisions.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`missing decision ${id}`);
  return found;
}

describe('Combined Zones Phase 1 design decisions', () => {
  it('audits exactly D01-D07 and remains fail-closed', () => {
    const audit = readAudit();

    expect(audit).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-design-decisions',
      status: 'HOLD_THREE_OF_SEVEN_DECISIONS_UNRESOLVED',
      authority: {
        chain: '01 + 02 + 03 -> 04 normalized architecture -> 05 current-world placement',
        planToDevelop: 'docs/masterplans/05-combined-zones/MASTERPLAN.md',
        offlineOnly: true,
        worldEditAuthorized: false,
        constructionPackageExists: false,
      },
      summary: {
        decisionCount: 7,
        resolvedDecisionIds: ['D01', 'D03', 'D04', 'D07'],
        holdDecisionIds: ['D02', 'D05', 'D06'],
        resolvedCount: 4,
        holdCount: 3,
        phase1DecisionGatePassed: false,
      },
      gateDecision: {
        phase1OfflineDesignMayContinue: true,
        phase1Exit: 'HOLD',
        advanceToPhysicalPhase: false,
        liveBuildMayProceed: false,
      },
    });

    expect(audit.decisions.map(({ id }) => id)).toEqual([
      'D01',
      'D02',
      'D03',
      'D04',
      'D05',
      'D06',
      'D07',
    ]);
    expect(new Set(audit.decisions.map(({ id }) => id)).size).toBe(7);
  });

  it('selects current-world placement while keeping transformed geometry non-executable', () => {
    const d01 = decision(readAudit(), 'D01');

    expect(d01).toMatchObject({
      status: 'RESOLVED',
      selection: 'SAME_WORLD_CURRENT_MAP_WITH_MASTERPLAN05_VERTICAL_ADAPTATION',
    });
    expect(d01.remainingImplementationGates).toContain(
      'retain worldEditAuthorized=false until a separate manifest-bound release authorization',
    );
  });

  it('omits only the unbuilt L2 proposal and preserves the complete rail reservation', () => {
    const audit = readAudit();
    const d03 = decision(audit, 'D03');
    const d04 = decision(audit, 'D04');

    expect(d03).toMatchObject({
      status: 'RESOLVED',
      selection: 'DELETE_UNSURVEYED_L2_FROM_ACTIVE_SCOPE',
    });
    expect(d03.meaning).toContain('No physical road or world cells are authorized for removal.');

    expect(d04).toMatchObject({
      status: 'RESOLVED',
      selection: 'RESERVE_FIRST_FULLY_CLEAR_SPANNED_RAIL_STRIP',
      frozenReservation: {
        widthBlocks: 13,
        flank: 'north',
        centerlineOffsetsFromC1: [-28, -24],
        fullOffsetRangeInclusive: { from: -30, to: -18 },
      },
    });
  });

  it('keeps D02, D05, and D06 on HOLD while resolving factual D07 wording', () => {
    const audit = readAudit();

    expect(decision(audit, 'D02')).toMatchObject({
      status: 'HOLD',
      selection: null,
      conservativeDefault: 'NO_C1_PHYSICAL_RELEASE_UNTIL_D02_RESOLVED_AND_R00_ACCEPTED',
      releaseLifecycleValidation: {
        releaseId: 'CZ-R01-PHASE1-BOUNDED-VISUAL-PILOT',
        validationRole: 'POST_R00_VALIDATION_NOT_D02_OR_G02_CLOSURE_EVIDENCE',
      },
    });
    expect(decision(audit, 'D05')).toMatchObject({
      status: 'HOLD',
      resolvedInterimPolicy: 'DEFAULT_DENY_NO_TOUCH',
      protectedRelicCount: 3,
      exactBufferCellSetsFrozen: false,
      hydrologyPlanApproved: false,
    });
    expect(decision(audit, 'D06')).toMatchObject({
      status: 'HOLD',
      exactInternalDesignFrozen: true,
      completeLifeSafetyDesignFrozen: false,
      adoptedIntentNotConstructionDetail: {
        retailShellCount: 24,
        sealedFutureInterfaceCount: 8,
      },
    });
    expect(decision(audit, 'D07')).toMatchObject({
      status: 'RESOLVED',
      selection: 'FACT_CHECKED_ARCHITECTURAL_COMPOSITE_WORDING_AND_C2_OMISSION',
      resolvedPortalPolicy: 'NO_ACTIVE_PORTAL_MECHANISM_IN_CURRENT_SCOPE',
      geologicalWordingStatus: 'RESOLVED_FACT_CHECKED_ARCHITECTURAL_COMPOSITE',
    });

    expect((audit as any).decisionPolicy).toMatchObject({
      g02ClosureBoundary: 'PRE_R00_DESIGN_ACCEPTANCE_ONLY',
    });
    const forbidden = /\b(operations?|source guards?|manifests?|preflights?|live[- ]entity|pilots?|execution|rollbacks?|route[- ]qa|post[- ]state)\b/i;
    for (const id of ['D02', 'D05', 'D06']) {
      const closure = decision(audit, id).closureEvidenceRequired as string[];
      expect(closure, id).toBeInstanceOf(Array);
      expect(closure.some((item) => forbidden.test(item)), id).toBe(false);
    }
  });

  it('references every authority layer without treating any source as build authorization', () => {
    const audit = readAudit();
    const paths = audit.sourceReferences.map(({ path: sourcePath }) => sourcePath);

    expect(paths.some((sourcePath) => sourcePath.startsWith('docs/masterplans/01-'))).toBe(true);
    expect(paths.some((sourcePath) => sourcePath.startsWith('docs/masterplans/02-'))).toBe(true);
    expect(paths.some((sourcePath) => sourcePath.startsWith('docs/masterplans/03-'))).toBe(true);
    expect(paths.some((sourcePath) => sourcePath.startsWith('docs/masterplans/04-'))).toBe(true);
    expect(paths.some((sourcePath) => sourcePath.startsWith('docs/masterplans/05-'))).toBe(true);

    for (const sourcePath of paths) {
      expect(fs.existsSync(path.join(ROOT, sourcePath)), sourcePath).toBe(true);
    }
  });
});
