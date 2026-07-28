#!/usr/bin/env node

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Database from 'better-sqlite3';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function argument(name, fallback) {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

const sourcePath = path.resolve(
  ROOT,
  argument('--source', 'data/knowledge-base/redevelopment-release-incidents.json'),
);
const databasePath = path.resolve(
  ROOT,
  argument('--database', 'data/knowledge-base/redevelopment-kb.sqlite'),
);
const reportPath = path.resolve(
  ROOT,
  argument('--report', 'data/knowledge-base/redevelopment-kb.report.json'),
);
const markdownPath = path.resolve(
  ROOT,
  argument(
    '--markdown',
    'docs/redevelopment/2026-07-28-town-expansion/knowledge-base/incident-ledger.md',
  ),
);

const sourceBytes = fs.readFileSync(sourcePath);
const source = JSON.parse(sourceBytes);
if (
  source.schemaVersion !== 1
  || !Array.isArray(source.incidents)
  || !Array.isArray(source.postQaDefects)
  || !Array.isArray(source.errorOccurrences)
  || !Array.isArray(source.preventionRules)
) {
  throw new Error('unsupported or incomplete redevelopment KB source');
}

const incidentIds = new Set();
const recoveryIds = new Set();
for (const incident of source.incidents) {
  if (
    !incident.id
    || !/^(RED|TOWN)-\d{8}-\d+$/.test(incident.id)
    || incidentIds.has(incident.id)
  ) {
    throw new Error(`duplicate or missing incident id: ${incident.id}`);
  }
  incidentIds.add(incident.id);
  for (const recovery of incident.recoveries ?? []) {
    if (!recovery.id || recoveryIds.has(recovery.id)) {
      throw new Error(`duplicate or missing recovery id: ${recovery.id}`);
    }
    recoveryIds.add(recovery.id);
  }
}

const defectIds = new Set();
for (const defect of source.postQaDefects) {
  if (
    !defect.id
    || !/^QA-\d{8}-\d+$/.test(defect.id)
    || defectIds.has(defect.id)
    || incidentIds.has(defect.id)
  ) {
    throw new Error(`duplicate, misplaced, or missing QA defect id: ${defect.id}`);
  }
  defectIds.add(defect.id);
}

const occurrenceIds = new Set();
for (const occurrence of source.errorOccurrences) {
  if (
    !occurrence.id
    || occurrenceIds.has(occurrence.id)
    || incidentIds.has(occurrence.id)
    || defectIds.has(occurrence.id)
  ) {
    throw new Error(`duplicate or missing error-occurrence id: ${occurrence.id}`);
  }
  if (
    occurrence.parentType === 'incident'
    && !incidentIds.has(occurrence.parentId)
  ) {
    throw new Error(`${occurrence.id} references missing incident ${occurrence.parentId}`);
  }
  if (
    occurrence.parentType === 'qa-defect'
    && !defectIds.has(occurrence.parentId)
  ) {
    throw new Error(`${occurrence.id} references missing QA defect ${occurrence.parentId}`);
  }
  if (
    !['incident', 'qa-defect', 'wip-family'].includes(occurrence.parentType)
  ) {
    throw new Error(`${occurrence.id} has unsupported parentType ${occurrence.parentType}`);
  }
  occurrenceIds.add(occurrence.id);
}

const ruleIds = new Set();
for (const rule of source.preventionRules) {
  if (!rule.id || ruleIds.has(rule.id)) {
    throw new Error(`duplicate or missing prevention-rule id: ${rule.id}`);
  }
  ruleIds.add(rule.id);
}
for (const record of [...source.incidents, ...source.postQaDefects]) {
  for (const ruleId of record.preventionRuleIds ?? []) {
    if (!ruleIds.has(ruleId)) {
      throw new Error(`${record.id} references missing prevention rule ${ruleId}`);
    }
  }
}

const executionCount = source.incidents.reduce(
  (total, incident) => total + (incident.recoveries?.length ?? 0),
  0,
);
const executionStatusCounts = source.incidents
  .flatMap((incident) => incident.recoveries ?? [])
  .reduce(
    (counts, recovery) => {
      if (recovery.status === 'complete') counts.complete += 1;
      else if (recovery.status === 'failed') counts.failed += 1;
      else counts.inProgress += 1;
      return counts;
    },
    { complete: 0, failed: 0, inProgress: 0 },
  );
if (
  source.countingPolicy?.incidentCount !== source.incidents.length
  || source.countingPolicy?.executionCount !== executionCount
  || source.countingPolicy?.executionStatusCounts?.complete !== executionStatusCounts.complete
  || source.countingPolicy?.executionStatusCounts?.failed !== executionStatusCounts.failed
  || source.countingPolicy?.executionStatusCounts?.inProgress !== executionStatusCounts.inProgress
) {
  throw new Error('declared incident/execution counts or statuses do not match source rows');
}

const generatedOutputPaths = new Set(
  [databasePath, reportPath, markdownPath].map((filename) => path.resolve(filename)),
);
const requiredArtifactPaths = new Set();
for (const incident of source.incidents) {
  requiredArtifactPaths.add(incident.transactionArtifact);
  for (const recovery of incident.recoveries ?? []) {
    requiredArtifactPaths.add(recovery.artifact);
  }
}
for (const defect of source.postQaDefects) {
  for (const filename of defect.evidenceArtifacts ?? []) {
    requiredArtifactPaths.add(filename);
  }
}
for (const occurrence of source.errorOccurrences) {
  for (const filename of occurrence.evidenceArtifacts ?? []) {
    requiredArtifactPaths.add(filename);
  }
}

const prevalidatedArtifacts = new Map();
const missingArtifacts = [];
for (const relativePath of requiredArtifactPaths) {
  if (typeof relativePath !== 'string' || relativePath.length === 0) {
    throw new Error('KB evidence artifact paths must be non-empty strings');
  }
  const absolutePath = path.resolve(ROOT, relativePath);
  if (
    absolutePath !== ROOT
    && !absolutePath.startsWith(`${ROOT}${path.sep}`)
  ) {
    throw new Error(`KB evidence artifact escapes the repository root: ${relativePath}`);
  }
  if (generatedOutputPaths.has(absolutePath)) {
    throw new Error(`generated KB output cannot be its own evidence input: ${relativePath}`);
  }
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    missingArtifacts.push(relativePath);
    continue;
  }
  const bytes = fs.readFileSync(absolutePath);
  prevalidatedArtifacts.set(relativePath, {
    path: relativePath,
    absolutePath,
    bytes: bytes.length,
    sha256: sha256(bytes),
  });
}
if (missingArtifacts.length > 0) {
  throw new Error(
    `required KB evidence artifacts are missing: ${missingArtifacts.join(', ')}`,
  );
}

function parseEvidenceJson(relativePath, label) {
  const artifact = prevalidatedArtifacts.get(relativePath);
  try {
    return JSON.parse(fs.readFileSync(artifact.absolutePath, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is not valid JSON (${relativePath}): ${error.message}`);
  }
}

function artifactGroupCount(artifact, groupField, commandField) {
  if (Number.isInteger(artifact[groupField])) return artifact[groupField];
  if (Number.isInteger(artifact[commandField])) return artifact[commandField];
  return null;
}

for (const incident of source.incidents) {
  if (typeof incident.transactionExpectedStatus !== 'string') {
    throw new Error(`${incident.id} is missing transactionExpectedStatus`);
  }
  const transaction = parseEvidenceJson(
    incident.transactionArtifact,
    `${incident.id} transaction ledger`,
  );
  if (transaction.status !== incident.transactionExpectedStatus) {
    throw new Error(
      `${incident.id} transaction status mismatch: expected `
      + `${incident.transactionExpectedStatus}, found ${transaction.status}`,
    );
  }
  if (transaction.startedAtUtc !== incident.startedAtUtc) {
    throw new Error(
      `${incident.id} transaction start mismatch: source ${incident.startedAtUtc}, `
      + `artifact ${transaction.startedAtUtc}`,
    );
  }
  if (
    !Array.isArray(transaction.packages)
    || !transaction.packages.some(
      (releasePackage) => releasePackage.status === incident.transactionExpectedStatus,
    )
  ) {
    throw new Error(
      `${incident.id} transaction has no package linked to status `
      + incident.transactionExpectedStatus,
    );
  }

  for (const recovery of incident.recoveries ?? []) {
    const execution = parseEvidenceJson(
      recovery.artifact,
      `${recovery.id} recovery execution`,
    );
    if (execution.status !== recovery.status) {
      throw new Error(
        `${recovery.id} status mismatch: source ${recovery.status}, `
        + `artifact ${execution.status}`,
      );
    }
    const successfulGroups = artifactGroupCount(
      execution,
      'successfulGroups',
      'successfulCommands',
    );
    const failedGroups = artifactGroupCount(execution, 'failedGroups', 'failedCommands');
    if (
      recovery.successfulGroups !== null
      && successfulGroups !== recovery.successfulGroups
    ) {
      throw new Error(
        `${recovery.id} successful-group mismatch: source `
        + `${recovery.successfulGroups}, artifact ${successfulGroups}`,
      );
    }
    if (
      recovery.failedGroups !== null
      && failedGroups !== recovery.failedGroups
    ) {
      throw new Error(
        `${recovery.id} failed-group mismatch: source `
        + `${recovery.failedGroups}, artifact ${failedGroups}`,
      );
    }
  }
}

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
const temporaryPath = `${databasePath}.new`;
if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath);
const database = new Database(temporaryPath);

database.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = DELETE;
  CREATE TABLE metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE incidents (
    id TEXT PRIMARY KEY,
    started_at_utc TEXT NOT NULL,
    completed_at_utc TEXT,
    scope TEXT NOT NULL,
    status TEXT NOT NULL,
    summary TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    resolution TEXT NOT NULL,
    transaction_artifact TEXT NOT NULL
  );
  CREATE TABLE recovery_executions (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL REFERENCES incidents(id),
    kind TEXT NOT NULL,
    target TEXT NOT NULL,
    status TEXT NOT NULL,
    successful_groups INTEGER,
    failed_groups INTEGER,
    artifact TEXT NOT NULL,
    artifact_exists INTEGER NOT NULL,
    artifact_sha256 TEXT
  );
  CREATE TABLE prevention_rules (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL
  );
  CREATE TABLE incident_prevention_rules (
    incident_id TEXT NOT NULL REFERENCES incidents(id),
    rule_id TEXT NOT NULL REFERENCES prevention_rules(id),
    PRIMARY KEY (incident_id, rule_id)
  );
  CREATE TABLE qa_defects (
    id TEXT PRIMARY KEY,
    detected_at_utc TEXT NOT NULL,
    scope TEXT NOT NULL,
    status TEXT NOT NULL,
    summary TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    impact TEXT NOT NULL,
    resolution TEXT NOT NULL
  );
  CREATE TABLE qa_defect_prevention_rules (
    defect_id TEXT NOT NULL REFERENCES qa_defects(id),
    rule_id TEXT NOT NULL REFERENCES prevention_rules(id),
    PRIMARY KEY (defect_id, rule_id)
  );
  CREATE TABLE error_occurrences (
    id TEXT PRIMARY KEY,
    occurred_at_utc TEXT NOT NULL,
    parent_type TEXT NOT NULL,
    parent_id TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL,
    summary TEXT NOT NULL,
    evidence_disposition TEXT NOT NULL
  );
  CREATE TABLE artifacts (
    path TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    artifact_exists INTEGER NOT NULL,
    bytes INTEGER,
    sha256 TEXT
  );
  CREATE TABLE error_occurrence_artifacts (
    occurrence_id TEXT NOT NULL REFERENCES error_occurrences(id),
    artifact_path TEXT NOT NULL REFERENCES artifacts(path),
    PRIMARY KEY (occurrence_id, artifact_path)
  );
  CREATE TABLE knowledge_entries (
    id INTEGER PRIMARY KEY,
    entry_type TEXT NOT NULL,
    stable_id TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    tags TEXT NOT NULL
  );
  CREATE VIRTUAL TABLE knowledge_search USING fts5(
    title,
    body,
    tags,
    content='knowledge_entries',
    content_rowid='id'
  );
  CREATE TRIGGER knowledge_entries_ai AFTER INSERT ON knowledge_entries BEGIN
    INSERT INTO knowledge_search(rowid, title, body, tags)
    VALUES (new.id, new.title, new.body, new.tags);
  END;
`);

const insertMetadata = database.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)');
const insertIncident = database.prepare(`
  INSERT INTO incidents (
    id, started_at_utc, completed_at_utc, scope, status, summary,
    root_cause, resolution, transaction_artifact
  ) VALUES (
    @id, @startedAtUtc, @completedAtUtc, @scope, @status, @summary,
    @rootCause, @resolution, @transactionArtifact
  )
`);
const insertRecovery = database.prepare(`
  INSERT INTO recovery_executions (
    id, incident_id, kind, target, status, successful_groups,
    failed_groups, artifact, artifact_exists, artifact_sha256
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertRule = database.prepare(
  'INSERT INTO prevention_rules (id, title, body) VALUES (@id, @title, @body)',
);
const linkRule = database.prepare(
  'INSERT INTO incident_prevention_rules (incident_id, rule_id) VALUES (?, ?)',
);
const insertQaDefect = database.prepare(`
  INSERT INTO qa_defects (
    id, detected_at_utc, scope, status, summary, root_cause, impact, resolution
  ) VALUES (
    @id, @detectedAtUtc, @scope, @status, @summary, @rootCause, @impact, @resolution
  )
`);
const linkQaDefectRule = database.prepare(
  'INSERT INTO qa_defect_prevention_rules (defect_id, rule_id) VALUES (?, ?)',
);
const insertOccurrence = database.prepare(`
  INSERT INTO error_occurrences (
    id, occurred_at_utc, parent_type, parent_id, category, status, summary,
    evidence_disposition
  ) VALUES (
    @id, @occurredAtUtc, @parentType, @parentId, @category, @status, @summary,
    @evidenceDisposition
  )
`);
const insertArtifact = database.prepare(`
  INSERT OR IGNORE INTO artifacts (
    path, category, artifact_exists, bytes, sha256
  ) VALUES (?, ?, ?, ?, ?)
`);
const linkOccurrenceArtifact = database.prepare(`
  INSERT INTO error_occurrence_artifacts (occurrence_id, artifact_path)
  VALUES (?, ?)
`);
const insertEntry = database.prepare(`
  INSERT INTO knowledge_entries (entry_type, stable_id, title, body, tags)
  VALUES (?, ?, ?, ?, ?)
`);

function inspectArtifact(relativePath, category) {
  const prevalidated = prevalidatedArtifacts.get(relativePath);
  const record = {
    path: relativePath,
    category,
    exists: true,
    bytes: prevalidated.bytes,
    sha256: prevalidated.sha256,
  };
  insertArtifact.run(
    record.path,
    record.category,
    Number(record.exists),
    record.bytes,
    record.sha256,
  );
  return record;
}

const artifactRecords = [];
const populate = database.transaction(() => {
  insertMetadata.run('schema_version', '1');
  insertMetadata.run('source_path', path.relative(ROOT, sourcePath));
  insertMetadata.run('source_sha256', sha256(sourceBytes));
  insertMetadata.run('source_updated_at_utc', source.updatedAtUtc);
  insertMetadata.run('incident_count', String(source.incidents.length));
  insertMetadata.run('rollback_recovery_execution_count', String(executionCount));

  for (const rule of source.preventionRules) {
    insertRule.run(rule);
    insertEntry.run(
      'prevention-rule',
      rule.id,
      `${rule.id}: ${rule.title}`,
      rule.body,
      'release safety rollback recovery prevention',
    );
  }

  for (const incident of source.incidents) {
    insertIncident.run(incident);
    const transaction = inspectArtifact(incident.transactionArtifact, 'transaction-ledger');
    artifactRecords.push(transaction);
    for (const ruleId of incident.preventionRuleIds ?? []) {
      linkRule.run(incident.id, ruleId);
    }
    insertEntry.run(
      'incident',
      incident.id,
      `${incident.id}: ${incident.scope}`,
      [
        incident.summary,
        `Root cause: ${incident.rootCause}`,
        `Resolution: ${incident.resolution}`,
      ].join('\n'),
      `incident ${incident.status} rollback recovery ${incident.preventionRuleIds.join(' ')}`,
    );
    for (const recovery of incident.recoveries ?? []) {
      const artifact = inspectArtifact(recovery.artifact, 'recovery-execution');
      artifactRecords.push(artifact);
      insertRecovery.run(
        recovery.id,
        incident.id,
        recovery.kind,
        recovery.target,
        recovery.status,
        recovery.successfulGroups,
        recovery.failedGroups,
        recovery.artifact,
        Number(artifact.exists),
        artifact.sha256,
      );
      insertEntry.run(
        'recovery-execution',
        recovery.id,
        `${recovery.id}: ${recovery.kind}`,
        `${recovery.target}; status ${recovery.status}; artifact ${recovery.artifact}`,
        `execution ${recovery.status} ${recovery.kind} ${incident.id}`,
      );
    }
  }

  for (const defect of source.postQaDefects) {
    insertQaDefect.run(defect);
    for (const ruleId of defect.preventionRuleIds ?? []) {
      linkQaDefectRule.run(defect.id, ruleId);
    }
    insertEntry.run(
      'qa-defect',
      defect.id,
      `${defect.id}: ${defect.scope}`,
      [
        defect.summary,
        `Root cause: ${defect.rootCause}`,
        `Impact: ${defect.impact}`,
        `Resolution: ${defect.resolution}`,
      ].join('\n'),
      `qa defect ${defect.status} ${defect.preventionRuleIds.join(' ')}`,
    );
    for (const filename of defect.evidenceArtifacts ?? []) {
      artifactRecords.push(inspectArtifact(filename, 'qa-defect-evidence'));
    }
  }

  for (const occurrence of source.errorOccurrences) {
    insertOccurrence.run(occurrence);
    insertEntry.run(
      'error-occurrence',
      occurrence.id,
      `${occurrence.id}: ${occurrence.category}`,
      [
        occurrence.summary,
        `Status: ${occurrence.status}`,
        `Parent: ${occurrence.parentType} ${occurrence.parentId}`,
        `Evidence: ${occurrence.evidenceDisposition}`,
      ].join('\n'),
      `error occurrence ${occurrence.category} ${occurrence.status} ${occurrence.parentId}`,
    );
    for (const filename of occurrence.evidenceArtifacts ?? []) {
      artifactRecords.push(inspectArtifact(filename, 'error-occurrence-evidence'));
      linkOccurrenceArtifact.run(occurrence.id, filename);
    }
  }
});
populate();

database.exec('INSERT INTO knowledge_search(knowledge_search) VALUES (\'optimize\')');
const integrity = database.pragma('integrity_check', { simple: true });
const foreignKeys = database.pragma('foreign_key_check');
const tableCounts = Object.fromEntries(
  [
    'incidents',
    'recovery_executions',
    'prevention_rules',
    'incident_prevention_rules',
    'qa_defects',
    'qa_defect_prevention_rules',
    'error_occurrences',
    'error_occurrence_artifacts',
    'artifacts',
    'knowledge_entries',
  ].map((table) => [
    table,
    database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count,
  ]),
);
database.close();

if (integrity !== 'ok' || foreignKeys.length !== 0) {
  fs.rmSync(temporaryPath);
  throw new Error(`KB database validation failed: integrity=${integrity}`);
}
if (sha256(fs.readFileSync(sourcePath)) !== sha256(sourceBytes)) {
  fs.rmSync(temporaryPath);
  throw new Error('KB source changed while the database was being built');
}
for (const artifact of prevalidatedArtifacts.values()) {
  if (sha256(fs.readFileSync(artifact.absolutePath)) !== artifact.sha256) {
    fs.rmSync(temporaryPath);
    throw new Error(`KB evidence changed while the database was being built: ${artifact.path}`);
  }
}
fs.renameSync(temporaryPath, databasePath);

const artifactByPath = new Map(
  artifactRecords.map((artifact) => [artifact.path, artifact]),
);
const markdown = [
  '# Redevelopment rollback and recovery incident ledger',
  '',
  `Source updated: ${source.updatedAtUtc}`,
  '',
  `- Atomic rollback incidents: ${source.countingPolicy.incidentCount}`,
  `- Rollback/recovery executions: ${source.countingPolicy.executionCount}`,
  `- Completed executions: ${source.countingPolicy.executionStatusCounts.complete}`,
  `- Failed executions: ${source.countingPolicy.executionStatusCounts.failed}`,
  `- Executions in progress: ${source.countingPolicy.executionStatusCounts.inProgress}`,
  `- Post-QA defects: ${source.postQaDefects.length}`,
  '',
  'An incident is one atomic release transaction that required compensation. An',
  'execution is one rollback or bounded-recovery invocation. Both measures are',
  'retained because one incident may reverse several packages or require a failed',
  'generic rollback followed by a successful bounded recovery.',
  '',
  ...source.incidents.flatMap((incident) => {
    const transaction = artifactByPath.get(incident.transactionArtifact);
    return [
      `## ${incident.id} — ${incident.scope}`,
      '',
      `Status: **${incident.status}**  `,
      `Window: ${incident.startedAtUtc} to ${incident.completedAtUtc ?? 'open'}`,
      '',
      incident.summary,
      '',
      `**Root cause:** ${incident.rootCause}`,
      '',
      `**Resolution:** ${incident.resolution}`,
      '',
      `Prevention controls: ${incident.preventionRuleIds.join(', ')}`,
      '',
      '| Recovery execution | Kind | Target | Status | Successful groups | Failed groups |',
      '|---|---|---|---:|---:|---:|',
      ...(incident.recoveries ?? []).map((recovery) => (
        `| ${recovery.id} | ${recovery.kind} | ${recovery.target} | `
        + `${recovery.status} | ${recovery.successfulGroups ?? 'not reported'} | `
        + `${recovery.failedGroups ?? 'not reported'} |`
      )),
      '',
      `Transaction evidence: \`${incident.transactionArtifact}\`  `,
      `Transaction SHA-256: \`${transaction?.sha256 ?? 'MISSING'}\``,
      '',
      ...(incident.recoveries ?? []).map((recovery) => {
        const artifact = artifactByPath.get(recovery.artifact);
        return `- ${recovery.id}: \`${recovery.artifact}\` — `
          + `SHA-256 \`${artifact?.sha256 ?? 'MISSING'}\``;
      }),
      '',
    ];
  }),
  '## Post-QA defects',
  '',
  ...source.postQaDefects.flatMap((defect) => [
    `### ${defect.id} — ${defect.scope}`,
    '',
    `Status: **${defect.status}**  `,
    `Detected: ${defect.detectedAtUtc}`,
    '',
    defect.summary,
    '',
    `**Root cause:** ${defect.rootCause}`,
    '',
    `**Impact:** ${defect.impact}`,
    '',
    `**Resolution:** ${defect.resolution}`,
    '',
    `Prevention controls: ${defect.preventionRuleIds.join(', ')}`,
    '',
    ...(defect.evidenceArtifacts ?? []).map((filename) => {
      const artifact = artifactByPath.get(filename);
      return `- \`${filename}\` — SHA-256 \`${artifact?.sha256 ?? 'MISSING'}\``;
    }),
    '',
  ]),
  '## Error and failure occurrence ledger',
  '',
  'Occurrence rows retain repeated attempts and child failures without inflating',
  'the unique rollback-incident or QA-defect counts.',
  '',
  '| Occurrence | Time | Parent | Category | Status |',
  '|---|---|---|---|---|',
  ...source.errorOccurrences.map((occurrence) => (
    `| ${occurrence.id} | ${occurrence.occurredAtUtc} | `
    + `${occurrence.parentType}:${occurrence.parentId} | `
    + `${occurrence.category} | ${occurrence.status} |`
  )),
  '',
  ...source.errorOccurrences.flatMap((occurrence) => [
    `### ${occurrence.id}`,
    '',
    occurrence.summary,
    '',
    `Evidence disposition: ${occurrence.evidenceDisposition}`,
    '',
    ...(occurrence.evidenceArtifacts ?? []).map((filename) => {
      const artifact = artifactByPath.get(filename);
      return `- \`${filename}\` — SHA-256 \`${artifact?.sha256 ?? 'MISSING'}\``;
    }),
    '',
  ]),
  '## Prevention control catalog',
  '',
  ...source.preventionRules.flatMap((rule) => [
    `### ${rule.id} — ${rule.title}`,
    '',
    rule.body,
    '',
  ]),
].join('\n');
fs.writeFileSync(markdownPath, `${markdown}\n`);

const databaseBytes = fs.readFileSync(databasePath);
const markdownBytes = fs.readFileSync(markdownPath);
const report = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  status: 'PASS',
  source: {
    path: path.relative(ROOT, sourcePath),
    bytes: sourceBytes.length,
    sha256: sha256(sourceBytes),
  },
  database: {
    path: path.relative(ROOT, databasePath),
    bytes: databaseBytes.length,
    sha256: sha256(databaseBytes),
    integrityCheck: integrity,
    foreignKeyErrors: foreignKeys.length,
  },
  markdown: {
    path: path.relative(ROOT, markdownPath),
    bytes: markdownBytes.length,
    sha256: sha256(markdownBytes),
  },
  countingPolicy: source.countingPolicy,
  tableCounts,
  missingArtifactCount: artifactRecords.filter((artifact) => !artifact.exists).length,
  missingArtifacts: artifactRecords
    .filter((artifact) => !artifact.exists)
    .map((artifact) => artifact.path),
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
