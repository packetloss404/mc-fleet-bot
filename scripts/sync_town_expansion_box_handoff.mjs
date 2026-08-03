#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SETTINGS = path.join(ROOT, 'data/box-integration.json');
const LOCAL_ROOT = path.join(
  ROOT,
  'data/exports/box/town-expansion-r1-final-2026-07-28',
);
const REMOTE_BASE = 'exports/town-expansion-r1-final-2026-07-28';
const REPORT = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/box-upload-verification.json',
);
const RECEIPT = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/box-upload-verification-receipt.json',
);
const BOX_API = 'https://api.box.com/2.0';
const BOX_UPLOAD = 'https://upload.box.com/api/2.0';
const BOX_TOKEN = 'https://api.box.com/oauth2/token';
const CONCURRENCY = 4;
const startedAtUtc = new Date().toISOString();

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function hash(filename, algorithm) {
  return crypto.createHash(algorithm).update(fs.readFileSync(filename)).digest('hex');
}

function relativeFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { recursive: true })) {
    const absolute = path.join(directory, entry);
    if (fs.statSync(absolute).isFile()) {
      files.push(entry.split(path.sep).join('/'));
    }
  }
  return files.sort();
}

function atomicWriteJson(filename, value) {
  const temporary = `${filename}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o644,
  });
  fs.renameSync(temporary, filename);
}

async function readResponse(response) {
  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text.slice(0, 500) };
    }
  }
  if (!response.ok) {
    const message = payload?.message
      ?? payload?.error_description
      ?? payload?.error
      ?? `${response.status} ${response.statusText}`;
    throw new Error(`Box API ${response.status}: ${message}`);
  }
  return payload;
}

async function boxJson(token, url, options = {}) {
  return readResponse(await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
    body: options.body,
  }));
}

async function listItems(token, folderId) {
  const entries = [];
  let marker;
  do {
    const url = new URL(`${BOX_API}/folders/${encodeURIComponent(folderId)}/items`);
    url.searchParams.set('limit', '1000');
    url.searchParams.set('usemarker', 'true');
    url.searchParams.set('fields', 'id,type,name,sha1,size,modified_at');
    if (marker) url.searchParams.set('marker', marker);
    const payload = await boxJson(token, url.toString());
    entries.push(...(payload.entries ?? []));
    marker = payload.next_marker ?? undefined;
  } while (marker);
  return entries;
}

async function createFolder(token, parentId, name) {
  try {
    return await boxJson(token, `${BOX_API}/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parent: { id: parentId } }),
    });
  } catch (error) {
    const existing = (await listItems(token, parentId)).find(
      (entry) => entry.type === 'folder' && entry.name === name,
    );
    if (existing) return existing;
    throw error;
  }
}

async function uploadNew(token, parentId, filename, localPath) {
  const form = new FormData();
  form.append('attributes', JSON.stringify({
    name: filename,
    parent: { id: parentId },
  }));
  form.append('file', new Blob([await fs.promises.readFile(localPath)]), filename);
  const payload = await readResponse(await fetch(`${BOX_UPLOAD}/files/content`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  }));
  invariant(payload.entries?.[0], `Box upload omitted file ${filename}`);
  return payload.entries[0];
}

async function uploadVersion(token, fileId, filename, localPath) {
  const form = new FormData();
  form.append('attributes', JSON.stringify({ name: filename }));
  form.append('file', new Blob([await fs.promises.readFile(localPath)]), filename);
  const payload = await readResponse(await fetch(
    `${BOX_UPLOAD}/files/${encodeURIComponent(fileId)}/content`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  ));
  invariant(payload.entries?.[0], `Box version upload omitted file ${filename}`);
  return payload.entries[0];
}

invariant(fs.existsSync(SETTINGS), 'Box settings are missing');
invariant(fs.existsSync(LOCAL_ROOT), 'Prepared Box handoff is missing');
const settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf8'));
invariant(settings.enabled === true, 'Box integration is disabled');
invariant(settings.authMode === 'client_credentials', (
  'This verifier requires configured Box client credentials'
));
for (const key of ['clientId', 'clientSecret', 'subjectId', 'folderId']) {
  invariant(typeof settings[key] === 'string' && settings[key], (
    `Box setting ${key} is missing`
  ));
}

const tokenPayload = await readResponse(await fetch(BOX_TOKEN, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: settings.clientId,
    client_secret: settings.clientSecret,
    box_subject_type: settings.subjectType,
    box_subject_id: settings.subjectId,
  }),
}));
invariant(tokenPayload.access_token, 'Box token response omitted access_token');
const token = tokenPayload.access_token;
const configuredRoot = await boxJson(
  token,
  `${BOX_API}/folders/${encodeURIComponent(settings.folderId)}`,
);
invariant(configuredRoot.type === 'folder', 'Configured Box root is not a folder');

const folderByPath = new Map([['', configuredRoot]]);
async function ensureDirectory(remoteDirectory) {
  let currentPath = '';
  let parent = configuredRoot;
  for (const segment of remoteDirectory.split('/').filter(Boolean)) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    const cached = folderByPath.get(currentPath);
    if (cached) {
      parent = cached;
      continue;
    }
    const existing = (await listItems(token, parent.id)).find(
      (entry) => entry.type === 'folder' && entry.name === segment,
    );
    const folder = existing ?? await createFolder(token, parent.id, segment);
    folderByPath.set(currentPath, folder);
    parent = folder;
  }
  return parent;
}

const localFiles = relativeFiles(LOCAL_ROOT).map((relativePath) => {
  const absolutePath = path.join(LOCAL_ROOT, relativePath);
  const stat = fs.statSync(absolutePath);
  invariant(stat.size <= 50 * 1024 * 1024, (
    `File exceeds Box direct-upload limit: ${relativePath}`
  ));
  return {
    relativePath,
    absolutePath,
    bytes: stat.size,
    sha1: hash(absolutePath, 'sha1'),
    sha256: hash(absolutePath, 'sha256'),
  };
});

const remoteDirectories = [
  ...new Set(localFiles.map(({ relativePath }) => {
    const directory = path.posix.dirname(relativePath);
    return directory === '.'
      ? REMOTE_BASE
      : `${REMOTE_BASE}/${directory}`;
  })),
].sort((left, right) => (
  left.split('/').length - right.split('/').length
  || left.localeCompare(right)
));
for (const directory of remoteDirectories) await ensureDirectory(directory);

const itemMapByDirectory = new Map();
for (const directory of remoteDirectories) {
  const folder = folderByPath.get(directory);
  invariant(folder, `Missing Box folder cache for ${directory}`);
  itemMapByDirectory.set(
    directory,
    new Map((await listItems(token, folder.id)).map((entry) => [entry.name, entry])),
  );
}

const actions = new Array(localFiles.length);
let cursor = 0;
let processed = 0;
async function uploadWorker() {
  while (cursor < localFiles.length) {
    const index = cursor;
    cursor += 1;
    const file = localFiles[index];
    const directoryPart = path.posix.dirname(file.relativePath);
    const remoteDirectory = directoryPart === '.'
      ? REMOTE_BASE
      : `${REMOTE_BASE}/${directoryPart}`;
    const filename = path.posix.basename(file.relativePath);
    const folder = folderByPath.get(remoteDirectory);
    const existing = itemMapByDirectory.get(remoteDirectory)?.get(filename);
    invariant(folder, `Missing remote folder ${remoteDirectory}`);
    try {
      if (
        existing?.type === 'file'
        && existing.sha1?.toLowerCase() === file.sha1
        && Number(existing.size) === file.bytes
      ) {
        actions[index] = { status: 'unchanged' };
      } else if (existing?.type === 'file') {
        await uploadVersion(token, existing.id, filename, file.absolutePath);
        actions[index] = { status: 'updated' };
      } else {
        await uploadNew(token, folder.id, filename, file.absolutePath);
        actions[index] = { status: 'uploaded' };
      }
    } catch (error) {
      actions[index] = {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
    processed += 1;
    if (processed % 50 === 0 || processed === localFiles.length) {
      process.stderr.write(`Box handoff progress ${processed}/${localFiles.length}\n`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, () => uploadWorker()));

const finalItemsByDirectory = new Map();
for (const directory of remoteDirectories) {
  const folder = folderByPath.get(directory);
  finalItemsByDirectory.set(
    directory,
    new Map((await listItems(token, folder.id)).map((entry) => [entry.name, entry])),
  );
}

const verifiedAtUtc = new Date().toISOString();
const files = localFiles.map((file, index) => {
  const directoryPart = path.posix.dirname(file.relativePath);
  const remoteDirectory = directoryPart === '.'
    ? REMOTE_BASE
    : `${REMOTE_BASE}/${directoryPart}`;
  const filename = path.posix.basename(file.relativePath);
  const remote = finalItemsByDirectory.get(remoteDirectory)?.get(filename);
  const action = actions[index] ?? { status: 'failed', error: 'No action result' };
  const passed = (
    action.status !== 'failed'
    && remote?.type === 'file'
    && remote.sha1?.toLowerCase() === file.sha1
    && Number(remote.size) === file.bytes
  );
  return {
    localPath: path.relative(ROOT, file.absolutePath).split(path.sep).join('/'),
    remotePath: `${remoteDirectory}/${filename}`,
    boxFileId: remote?.id ?? null,
    bytes: file.bytes,
    sha1: file.sha1,
    sha256: file.sha256,
    remoteSha1: remote?.sha1 ?? null,
    remoteBytes: remote?.size ?? null,
    uploadedAtUtc: remote?.modified_at ?? null,
    verifiedAtUtc,
    action: action.status,
    passed,
    error: action.error ?? null,
  };
});
const failedFiles = files.filter((file) => !file.passed);
const actionCounts = files.reduce((counts, file) => {
  counts[file.action] = (counts[file.action] ?? 0) + 1;
  return counts;
}, {});
const report = {
  schemaVersion: 1,
  id: 'town-expansion-r1-box-upload-verification',
  startedAtUtc,
  completedAtUtc: new Date().toISOString(),
  status: failedFiles.length === 0 ? 'BOX_VERIFIED' : 'BOX_VERIFICATION_FAILED',
  passed: failedFiles.length === 0,
  credentialsIncluded: false,
  localRoot: path.relative(ROOT, LOCAL_ROOT).split(path.sep).join('/'),
  remoteRoot: REMOTE_BASE,
  configuredFolderMatched: true,
  counts: {
    files: files.length,
    bytes: files.reduce((sum, file) => sum + file.bytes, 0),
    actions: actionCounts,
    verified: files.length - failedFiles.length,
    failed: failedFiles.length,
  },
  reportPublicationRule: (
    'This report excludes itself from its file rows. Its separate receipt '
    + 'binds the uploaded report bytes and Box file identity.'
  ),
  failures: failedFiles.map((file) => ({
    localPath: file.localPath,
    remotePath: file.remotePath,
    action: file.action,
    error: file.error,
  })),
  files,
};
atomicWriteJson(REPORT, report);
invariant(report.passed, `Box verification failed for ${failedFiles.length} files`);

const verificationDirectory = `${REMOTE_BASE}/verification`;
const verificationFolder = await ensureDirectory(verificationDirectory);
const reportName = path.basename(REPORT);
const reportSha1 = hash(REPORT, 'sha1');
const reportSha256 = hash(REPORT, 'sha256');
const reportBytes = fs.statSync(REPORT).size;
let remoteReport = (await listItems(token, verificationFolder.id)).find(
  (entry) => entry.type === 'file' && entry.name === reportName,
);
if (
  remoteReport?.sha1?.toLowerCase() !== reportSha1
  || Number(remoteReport?.size) !== reportBytes
) {
  if (remoteReport) {
    await uploadVersion(token, remoteReport.id, reportName, REPORT);
  } else {
    await uploadNew(token, verificationFolder.id, reportName, REPORT);
  }
}
remoteReport = (await listItems(token, verificationFolder.id)).find(
  (entry) => entry.type === 'file' && entry.name === reportName,
);
const reportVerified = (
  remoteReport?.sha1?.toLowerCase() === reportSha1
  && Number(remoteReport?.size) === reportBytes
);
const receipt = {
  schemaVersion: 1,
  id: 'town-expansion-r1-box-upload-verification-receipt',
  generatedAtUtc: new Date().toISOString(),
  status: reportVerified ? 'BOX_REPORT_VERIFIED' : 'BOX_REPORT_VERIFICATION_FAILED',
  passed: reportVerified,
  credentialsIncluded: false,
  report: {
    localPath: path.relative(ROOT, REPORT).split(path.sep).join('/'),
    remotePath: `${verificationDirectory}/${reportName}`,
    boxFileId: remoteReport?.id ?? null,
    bytes: reportBytes,
    sha1: reportSha1,
    sha256: reportSha256,
    remoteSha1: remoteReport?.sha1 ?? null,
    remoteBytes: remoteReport?.size ?? null,
    uploadedAtUtc: remoteReport?.modified_at ?? null,
    verifiedAtUtc: new Date().toISOString(),
  },
};
atomicWriteJson(RECEIPT, receipt);
invariant(receipt.passed, 'Uploaded Box verification report did not match');

process.stdout.write(`${JSON.stringify({
  status: report.status,
  counts: report.counts,
  report: path.relative(ROOT, REPORT),
  reportReceipt: {
    status: receipt.status,
    path: path.relative(ROOT, RECEIPT),
    remotePath: receipt.report.remotePath,
    boxFileId: receipt.report.boxFileId,
  },
}, null, 2)}\n`);
