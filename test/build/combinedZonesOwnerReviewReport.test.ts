import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../..');
const reportDirectory = path.join(repoRoot, 'masterplans', '05-combined-zones');
const reportPath = path.join(reportDirectory, 'phase1-owner-review-report.html');
const temporaryReportPath = path.join(reportDirectory, '.phase1-owner-review-report.test.html');
const bundle = JSON.parse(readFileSync(path.join(reportDirectory, 'phase1-owner-review-bundle.json'), 'utf8'));
const acceptance = JSON.parse(readFileSync(path.join(reportDirectory, 'phase1-owner-review-acceptance.json'), 'utf8'));
const r00 = JSON.parse(readFileSync(path.join(reportDirectory, 'phase1-r00-readiness-audit.json'), 'utf8'));
const d05Future = JSON.parse(readFileSync(path.join(reportDirectory, 'phase1-d05-future-state.json'), 'utf8'));
const d05Support = JSON.parse(readFileSync(path.join(reportDirectory, 'phase1-d05-support-material-design.json'), 'utf8'));
const d06Detailed = JSON.parse(readFileSync(path.join(reportDirectory, 'phase1-d06-detailed-mechanism-setout.json'), 'utf8'));
const d02C01 = JSON.parse(readFileSync(path.join(reportDirectory, 'phase1-d02-c01-ownership-loading-interface-proposal.json'), 'utf8'));
const b09Technical = JSON.parse(readFileSync(path.join(reportDirectory, 'phase1-b09-funicular-technical-system.json'), 'utf8'));
const b11Technical = JSON.parse(readFileSync(path.join(reportDirectory, 'phase1-b11-surface-road-technical-proposal.json'), 'utf8'));
const passiveShell = JSON.parse(readFileSync(path.join(reportDirectory, 'phase1-grand-avenue-passive-shell-candidate.json'), 'utf8'));
const g03Setout = JSON.parse(readFileSync(path.join(reportDirectory, 'phase1-g03-canonical-setout.json'), 'utf8'));
const g06Clearance = JSON.parse(readFileSync(path.join(reportDirectory, 'phase1-g06-proposed-clearance-audit.json'), 'utf8'));
const ownershipInterfaces = JSON.parse(readFileSync(path.join(reportDirectory, 'phase1-proposed-ownership-interface-registry.json'), 'utf8'));

afterAll(() => {
  if (existsSync(temporaryReportPath)) unlinkSync(temporaryReportPath);
});

describe('Combined Zones owner review HTML5 report', () => {
  it('is reproducible from the bound JSON evidence', () => {
    execFileSync(
      process.execPath,
      [
        'scripts/generate_combined_zones_owner_review_report.mjs',
        'masterplans/05-combined-zones/.phase1-owner-review-report.test.html',
      ],
      { cwd: repoRoot },
    );

    expect(readFileSync(temporaryReportPath, 'utf8')).toBe(readFileSync(reportPath, 'utf8'));
  });

  it('shows the exact review identity, safety boundary, packet statuses, and R00 gates', () => {
    const html = readFileSync(reportPath, 'utf8');

    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain(bundle.authority.bundlePayloadSha256);
    expect(html).toContain(bundle.authority.copyableStatement);
    expect(html).toContain(acceptance.acceptanceRecordPayloadSha256);
    expect(html).toContain(acceptance.actualApprovalText);
    expect(html).toContain('was not recited verbatim');
    expect(html).toContain('Owner acceptance recorded');
    expect(html).toContain('Technical HOLDs retained');
    expect(html).toContain('0 operations');
    expect(html).toContain('No live calls, database writes, Minecraft operations');
    expect(html).toContain('Concept intent · not measured evidence');
    expect(html).toContain('PassageWay route cells');
    expect(html).toContain('Reserve the tunnel now; build only a sealed rough shell');
    expect(html).toContain(passiveShell.decision.ifAnyHoldRemainsAtRoadRelease);
    expect(html).toContain(passiveShell.exactGeometricQuantities.candidateInfluenceUnionCells.toLocaleString('en-US'));
    expect(html).toContain(d05Future.reportIdentitySha256.slice(0, 12));
    expect(html).toContain(d05Support.summary.supportTreatmentClassNullCellCount.toLocaleString('en-US'));
    expect(html).toContain(d06Detailed.exactDetailedProposalLayers.canonicalProposalCellCountAfterPrecedence.toLocaleString('en-US'));
    expect(html).toContain(d02C01.proposalPayload.oneOwnerPrecedence.exactConflictAccounting.terminalDatumCellCount.toLocaleString('en-US'));
    expect(html).toContain(`withholds ${d02C01.proposalPayload.oneOwnerPrecedence.exactConflictAccounting.d02CellsWithheldByLoadingSeparation.cellCount} of ${d02C01.proposalPayload.oneOwnerPrecedence.exactConflictAccounting.d02CandidateCellCountAtStack}`);
    expect(html).toContain(`${b09Technical.exactTechnicalReservationProposals.proposalLayerCount} station, guideway/support`);
    expect(html).toContain(b11Technical.exactCellSets.proposedRoadConstruction.cellCount.toLocaleString('en-US'));
    expect(html).toContain(`${g03Setout.gate.unresolvedRequiredDomainCount} null/planning-only domains`);
    expect(html).toContain(g06Clearance.supportEvidenceAudit.protectedCores.overlapCellCount.toString());
    expect(html).toContain(ownershipInterfaces.proposalAccounting.knownCrossScopeProposedCellCount.toLocaleString('en-US'));

    for (const packet of bundle.packetSummary) {
      expect(html).toContain(packet.scope);
      expect(html).toContain(`${packet.remainingHoldCount} HOLD`);
    }

    for (const gate of r00.gates) {
      expect(html).toContain(gate.id.replace(/^G(\d+)_/, 'G$1 · ').replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (character: string) => character.toUpperCase()));
      expect(html).toContain(gate.status);
    }
  });

  it('has no missing local links or images', () => {
    const html = readFileSync(reportPath, 'utf8');
    const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
    const localReferences = references.filter((reference) => (
      !reference.startsWith('#')
      && !reference.startsWith('data:')
      && !reference.startsWith('http://')
      && !reference.startsWith('https://')
    ));

    expect(localReferences.length).toBeGreaterThan(20);
    for (const reference of localReferences) {
      expect(existsSync(path.resolve(reportDirectory, reference)), `Missing report reference: ${reference}`).toBe(true);
    }
  });
});
