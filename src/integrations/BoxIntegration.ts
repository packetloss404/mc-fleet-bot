import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createCanvas, loadImage } from 'canvas';
import { atomicWriteBufferSync, atomicWriteJsonSync } from '../util/atomicWrite';
import { logger } from '../util/logger';

const BOX_API_BASE = 'https://api.box.com/2.0';
const BOX_UPLOAD_BASE = 'https://upload.box.com/api/2.0';
const BOX_TOKEN_URL = 'https://api.box.com/oauth2/token';
const DIRECT_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024;

const SETTINGS_FILE = path.join('data', 'box-integration.json');
const SYNC_STATE_FILE = path.join('data', 'box-sync-state.json');
const PDF_EXPORT_DIR = path.join('data', 'exports', 'box', 'maps');

const ALLOWED_EXTENSIONS = new Set([
  '.csv',
  '.gif',
  '.html',
  '.jpeg',
  '.jpg',
  '.json',
  '.md',
  '.pdf',
  '.png',
  '.svg',
  '.txt',
  '.webp',
  '.yaml',
  '.yml',
]);

export type BoxAuthMode = 'access_token' | 'client_credentials';
export type BoxArtifactCategory = 'maps' | 'screenshots' | 'documents' | 'outputs';

export interface BoxIntegrationSettings {
  enabled: boolean;
  authMode: BoxAuthMode;
  accessToken: string;
  clientId: string;
  clientSecret: string;
  subjectType: 'enterprise' | 'user';
  subjectId: string;
  folderId: string;
  folderName: string;
  autoSync: boolean;
  autoSyncIntervalMinutes: number;
  categories: Record<BoxArtifactCategory, boolean>;
}

export interface BoxIntegrationPublicSettings
  extends Omit<BoxIntegrationSettings, 'accessToken' | 'clientSecret'> {
  accessTokenConfigured: boolean;
  accessTokenMasked: string;
  clientSecretConfigured: boolean;
  clientSecretMasked: string;
}

export interface BoxArtifact {
  absolutePath: string;
  relativePath: string;
  category: BoxArtifactCategory;
  size: number;
  modifiedAt: string;
  uploadable: boolean;
  reason?: string;
}

export interface BoxConnectionResult {
  user: {
    id: string;
    name: string;
    login: string;
  };
  folder: {
    id: string;
    name: string;
  };
}

export interface BoxSyncReport {
  startedAt: string;
  completedAt: string;
  folderId: string;
  folderName: string;
  discovered: number;
  uploaded: number;
  updated: number;
  unchanged: number;
  skipped: number;
  failed: number;
  bytesUploaded: number;
  errors: Array<{ path: string; error: string }>;
}

interface BoxItem {
  id: string;
  type: 'file' | 'folder' | 'web_link';
  name: string;
  sha1?: string;
}

interface BoxItemsResponse {
  entries?: BoxItem[];
  next_marker?: string | null;
}

interface BoxUploadResponse {
  entries?: BoxItem[];
}

interface BoxTokenResponse {
  access_token?: string;
  expires_in?: number;
}

interface ArtifactRoot {
  localPath: string;
  remotePath: string;
  defaultCategory: BoxArtifactCategory;
}

const DEFAULT_SETTINGS: BoxIntegrationSettings = {
  enabled: false,
  authMode: 'access_token',
  accessToken: '',
  clientId: '',
  clientSecret: '',
  subjectType: 'enterprise',
  subjectId: '',
  folderId: '',
  folderName: 'mc-fleet-bot',
  autoSync: false,
  autoSyncIntervalMinutes: 60,
  categories: {
    maps: true,
    screenshots: true,
    documents: true,
    outputs: true,
  },
};

function maskSecret(secret: string): string {
  if (!secret) return '(not set)';
  return '••••••••';
}

function normalizeRelativePath(value: string): string {
  return value.split(path.sep).join('/');
}

function safeRemoteName(value: string): string {
  return value.replace(/[\\/]/g, '-').trim().slice(0, 255);
}

function isMapLike(relativePath: string): boolean {
  const normalized = normalizeRelativePath(relativePath).toLowerCase();
  if (/(?:^|\/)atlas-[^/]+(?:\/|$)/.test(normalized)) return true;
  const name = path.basename(relativePath).toLowerCase();
  return /(?:map|site-plan|bluemap|overview|arrival|mountain|cutaway|audit)/.test(name);
}

function categorizeArtifact(
  relativePath: string,
  defaultCategory: BoxArtifactCategory,
): BoxArtifactCategory {
  const ext = path.extname(relativePath).toLowerCase();
  if (ext === '.pdf' || isMapLike(relativePath)) return 'maps';
  if (['.gif', '.jpeg', '.jpg', '.png', '.webp'].includes(ext)) return 'screenshots';
  return defaultCategory;
}

export class BoxIntegration {
  private readonly workspaceRoot: string;
  private readonly settingsPath: string;
  private readonly syncStatePath: string;
  private readonly pdfExportDir: string;
  private settings: BoxIntegrationSettings;
  private cachedToken: { value: string; expiresAt: number } | null = null;
  private autoSyncTimer: NodeJS.Timeout | null = null;
  private syncPromise: Promise<BoxSyncReport> | null = null;

  constructor(workspaceRoot = process.cwd()) {
    this.workspaceRoot = path.resolve(workspaceRoot);
    this.settingsPath = path.join(this.workspaceRoot, SETTINGS_FILE);
    this.syncStatePath = path.join(this.workspaceRoot, SYNC_STATE_FILE);
    this.pdfExportDir = path.join(this.workspaceRoot, PDF_EXPORT_DIR);
    this.settings = this.loadSettings();
  }

  getPublicSettings(): BoxIntegrationPublicSettings {
    return {
      enabled: this.settings.enabled,
      authMode: this.settings.authMode,
      clientId: this.settings.clientId,
      subjectType: this.settings.subjectType,
      subjectId: this.settings.subjectId,
      folderId: this.settings.folderId,
      folderName: this.settings.folderName,
      autoSync: this.settings.autoSync,
      autoSyncIntervalMinutes: this.settings.autoSyncIntervalMinutes,
      categories: { ...this.settings.categories },
      accessTokenConfigured: Boolean(this.settings.accessToken),
      accessTokenMasked: maskSecret(this.settings.accessToken),
      clientSecretConfigured: Boolean(this.settings.clientSecret),
      clientSecretMasked: maskSecret(this.settings.clientSecret),
    };
  }

  getLastSync(): BoxSyncReport | null {
    try {
      if (!fs.existsSync(this.syncStatePath)) return null;
      return JSON.parse(fs.readFileSync(this.syncStatePath, 'utf8')) as BoxSyncReport;
    } catch (err) {
      logger.warn({ err }, 'Failed to load Box sync state');
      return null;
    }
  }

  updateSettings(
    patch: Partial<BoxIntegrationSettings> & {
      accessToken?: string;
      clientSecret?: string;
    },
  ): BoxIntegrationPublicSettings {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new Error('Box settings must be an object');
    }
    const previous = this.settings;
    const authMode = patch.authMode ?? previous.authMode;
    if (authMode !== 'access_token' && authMode !== 'client_credentials') {
      throw new Error('authMode must be access_token or client_credentials');
    }
    const subjectType = patch.subjectType ?? previous.subjectType;
    if (subjectType !== 'enterprise' && subjectType !== 'user') {
      throw new Error('subjectType must be enterprise or user');
    }
    const interval = patch.autoSyncIntervalMinutes ?? previous.autoSyncIntervalMinutes;
    if (!Number.isFinite(interval) || interval < 5 || interval > 10080) {
      throw new Error('autoSyncIntervalMinutes must be between 5 and 10080');
    }
    if (patch.enabled !== undefined && typeof patch.enabled !== 'boolean') {
      throw new Error('enabled must be a boolean');
    }
    if (patch.autoSync !== undefined && typeof patch.autoSync !== 'boolean') {
      throw new Error('autoSync must be a boolean');
    }
    for (const field of [
      'accessToken',
      'clientId',
      'clientSecret',
      'subjectId',
      'folderId',
      'folderName',
    ] as const) {
      if (patch[field] !== undefined && typeof patch[field] !== 'string') {
        throw new Error(`${field} must be a string`);
      }
    }
    const categories = { ...previous.categories };
    if (patch.categories !== undefined) {
      if (
        !patch.categories
        || typeof patch.categories !== 'object'
        || Array.isArray(patch.categories)
      ) {
        throw new Error('categories must be an object');
      }
      for (const category of Object.keys(categories) as BoxArtifactCategory[]) {
        const value = patch.categories[category];
        if (value !== undefined) {
          if (typeof value !== 'boolean') {
            throw new Error(`categories.${category} must be a boolean`);
          }
          categories[category] = value;
        }
      }
    }

    this.settings = {
      enabled: patch.enabled ?? previous.enabled,
      authMode,
      accessToken: patch.accessToken?.trim() || previous.accessToken,
      clientId: patch.clientId?.trim() ?? previous.clientId,
      clientSecret: patch.clientSecret?.trim() || previous.clientSecret,
      subjectType,
      subjectId: patch.subjectId?.trim() ?? previous.subjectId,
      folderId: patch.folderId?.trim() ?? previous.folderId,
      folderName: safeRemoteName(patch.folderName ?? previous.folderName) || 'mc-fleet-bot',
      autoSync: patch.autoSync ?? previous.autoSync,
      autoSyncIntervalMinutes: interval,
      categories,
    };
    this.cachedToken = null;
    this.saveSettings();
    this.startAutoSync();
    return this.getPublicSettings();
  }

  startAutoSync(): void {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
    if (!this.settings.enabled || !this.settings.autoSync) return;
    const intervalMs = this.settings.autoSyncIntervalMinutes * 60 * 1000;
    this.autoSyncTimer = setInterval(() => {
      void this.syncAll().catch((err) => {
        logger.warn({ err }, 'Scheduled Box artifact sync failed');
      });
    }, intervalMs);
    this.autoSyncTimer.unref();
  }

  async testConnection(): Promise<BoxConnectionResult> {
    const token = await this.getAccessToken();
    const user = await this.boxJson<{ id: string; name: string; login: string }>(
      `${BOX_API_BASE}/users/me`,
      { token },
    );
    const folder = await this.resolveRootFolder(token);
    return {
      user: {
        id: String(user.id),
        name: String(user.name ?? ''),
        login: String(user.login ?? ''),
      },
      folder: {
        id: folder.id,
        name: folder.name,
      },
    };
  }

  discoverArtifacts(requestedPaths?: string[]): BoxArtifact[] {
    const roots = this.artifactRoots();
    const artifacts: BoxArtifact[] = [];

    if (requestedPaths?.length) {
      const candidates = requestedPaths.map((candidate) => {
        const absolutePath = path.resolve(this.workspaceRoot, candidate);
        const root = roots.find((entry) => (
          absolutePath === entry.localPath || absolutePath.startsWith(`${entry.localPath}${path.sep}`)
        ));
        if (!root) {
          throw new Error(`Artifact path is outside the approved export roots: ${candidate}`);
        }
        return { absolutePath, root };
      });
      for (const candidate of candidates) {
        this.collectArtifacts(candidate.absolutePath, candidate.root, artifacts);
      }
    } else {
      for (const root of roots) {
        this.collectArtifacts(root.localPath, root, artifacts);
      }
    }

    const unique = new Map<string, BoxArtifact>();
    for (const artifact of artifacts) {
      if (!this.settings.categories[artifact.category]) continue;
      unique.set(artifact.relativePath, artifact);
    }
    return [...unique.values()].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  async generatePdfMaps(): Promise<Array<{ source: string; pdf: string }>> {
    const imageExtensions = new Set(['.jpeg', '.jpg', '.png', '.svg', '.webp']);
    const sourceArtifacts = this.discoverArtifacts()
      .filter((artifact) => artifact.category === 'maps')
      .filter((artifact) => imageExtensions.has(path.extname(artifact.absolutePath).toLowerCase()))
      .filter((artifact) => !artifact.absolutePath.startsWith(`${this.pdfExportDir}${path.sep}`));

    fs.mkdirSync(this.pdfExportDir, { recursive: true });
    const generated: Array<{ source: string; pdf: string }> = [];
    for (const artifact of sourceArtifacts) {
      const stem = artifact.relativePath
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const pdfPath = path.join(this.pdfExportDir, `${stem || 'map'}.pdf`);
      this.assertApprovedArtifactFile(artifact.absolutePath);
      const sourceStat = fs.statSync(artifact.absolutePath);
      if (fs.existsSync(pdfPath) && fs.statSync(pdfPath).mtimeMs >= sourceStat.mtimeMs) {
        generated.push({
          source: normalizeRelativePath(path.relative(this.workspaceRoot, artifact.absolutePath)),
          pdf: normalizeRelativePath(path.relative(this.workspaceRoot, pdfPath)),
        });
        continue;
      }

      const image = await loadImage(artifact.absolutePath);
      const width = Math.max(1, Math.round(image.width));
      const height = Math.max(1, Math.round(image.height));
      const canvas = createCanvas(width, height, 'pdf');
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, width, height);
      const pdf = canvas.toBuffer('application/pdf', {
        title: path.basename(artifact.absolutePath),
        author: 'mc-fleet-bot',
        subject: 'Minecraft world map and build evidence',
      });
      atomicWriteBufferSync(pdfPath, pdf);
      generated.push({
        source: normalizeRelativePath(path.relative(this.workspaceRoot, artifact.absolutePath)),
        pdf: normalizeRelativePath(path.relative(this.workspaceRoot, pdfPath)),
      });
    }
    atomicWriteJsonSync(path.join(this.pdfExportDir, 'manifest.json'), {
      generatedAt: new Date().toISOString(),
      files: generated,
    });
    return generated;
  }

  async syncAll(requestedPaths?: string[]): Promise<BoxSyncReport> {
    if (this.syncPromise) return this.syncPromise;
    this.syncPromise = this.performSync(requestedPaths).finally(() => {
      this.syncPromise = null;
    });
    return this.syncPromise;
  }

  private async performSync(requestedPaths?: string[]): Promise<BoxSyncReport> {
    if (!this.settings.enabled) {
      throw new Error('Box integration is disabled');
    }
    if (this.settings.categories.maps) {
      await this.generatePdfMaps();
    }
    const artifacts = this.discoverArtifacts(requestedPaths);
    const token = await this.getAccessToken();
    const rootFolder = await this.resolveRootFolder(token);
    const report: BoxSyncReport = {
      startedAt: new Date().toISOString(),
      completedAt: '',
      folderId: rootFolder.id,
      folderName: rootFolder.name,
      discovered: artifacts.length,
      uploaded: 0,
      updated: 0,
      unchanged: 0,
      skipped: 0,
      failed: 0,
      bytesUploaded: 0,
      errors: [],
    };
    const folderCache = new Map<string, BoxItem>();
    folderCache.set('', rootFolder);

    for (const artifact of artifacts) {
      if (!artifact.uploadable) {
        report.skipped += 1;
        report.errors.push({
          path: artifact.relativePath,
          error: artifact.reason ?? 'Artifact is not uploadable',
        });
        continue;
      }
      try {
        const parts = artifact.relativePath.split('/');
        const filename = parts.pop();
        if (!filename) throw new Error('Artifact filename is empty');
        const remoteDirectory = parts.join('/');
        const parent = await this.ensureRemotePath(token, rootFolder.id, remoteDirectory, folderCache);
        const entries = await this.listFolderItems(token, parent.id);
        const existing = entries.find((item) => item.type === 'file' && item.name === filename);
        const digest = await this.sha1(artifact.absolutePath);
        if (existing?.sha1?.toLowerCase() === digest) {
          report.unchanged += 1;
          continue;
        }
        if (existing) {
          await this.uploadFileVersion(token, existing.id, artifact.absolutePath, filename);
          report.updated += 1;
        } else {
          await this.uploadNewFile(token, parent.id, artifact.absolutePath, filename);
          report.uploaded += 1;
        }
        report.bytesUploaded += artifact.size;
      } catch (err) {
        report.failed += 1;
        report.errors.push({
          path: artifact.relativePath,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    report.completedAt = new Date().toISOString();
    atomicWriteJsonSync(this.syncStatePath, report);
    logger.info(
      {
        folderId: report.folderId,
        discovered: report.discovered,
        uploaded: report.uploaded,
        updated: report.updated,
        unchanged: report.unchanged,
        skipped: report.skipped,
        failed: report.failed,
      },
      'Box artifact sync completed',
    );
    return report;
  }

  private artifactRoots(): ArtifactRoot[] {
    return [
      {
        localPath: path.join(this.workspaceRoot, 'mainstreet-america', 'qa'),
        remotePath: 'mainstreet-america/qa',
        defaultCategory: 'documents',
      },
      {
        localPath: path.join(this.workspaceRoot, 'mainstreet-america', 'visuals'),
        remotePath: 'mainstreet-america/visuals',
        defaultCategory: 'documents',
      },
      {
        localPath: path.join(this.workspaceRoot, 'mainstreet-america', 'planning'),
        remotePath: 'mainstreet-america/planning',
        defaultCategory: 'documents',
      },
      {
        localPath: path.join(this.workspaceRoot, 'mainstreet-america', 'integration'),
        remotePath: 'mainstreet-america/integration',
        defaultCategory: 'documents',
      },
      {
        localPath: path.join(this.workspaceRoot, 'docs'),
        remotePath: 'docs',
        defaultCategory: 'documents',
      },
      {
        localPath: path.join(this.workspaceRoot, 'data', 'buildops'),
        remotePath: 'outputs/buildops',
        defaultCategory: 'outputs',
      },
      {
        localPath: path.join(this.workspaceRoot, 'data', 'looks'),
        remotePath: 'troubleshooting/screenshots',
        defaultCategory: 'screenshots',
      },
      {
        localPath: path.join(this.workspaceRoot, 'data', 'exports', 'box'),
        remotePath: 'exports',
        defaultCategory: 'outputs',
      },
    ];
  }

  private collectArtifacts(
    candidatePath: string,
    root: ArtifactRoot,
    artifacts: BoxArtifact[],
  ): void {
    if (!fs.existsSync(candidatePath)) return;
    const stat = fs.lstatSync(candidatePath);
    // Artifact roots are intentionally narrow. Following a symlink here would
    // let a link under docs/ or qa/ expose arbitrary workspace or host files.
    if (stat.isSymbolicLink()) return;
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(candidatePath)) {
        this.collectArtifacts(path.join(candidatePath, name), root, artifacts);
      }
      return;
    }
    if (!stat.isFile()) return;
    if (!this.isPathInsideRoot(candidatePath, root.localPath)) return;
    const ext = path.extname(candidatePath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) return;
    const withinRoot = normalizeRelativePath(path.relative(root.localPath, candidatePath));
    const relativePath = normalizeRelativePath(path.posix.join(root.remotePath, withinRoot));
    const category = categorizeArtifact(relativePath, root.defaultCategory);
    const uploadable = stat.size <= DIRECT_UPLOAD_LIMIT_BYTES;
    artifacts.push({
      absolutePath: candidatePath,
      relativePath,
      category,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      uploadable,
      reason: uploadable
        ? undefined
        : 'File exceeds Box direct-upload limit (50 MB); chunk upload is not enabled',
    });
  }

  private async getAccessToken(): Promise<string> {
    if (this.settings.authMode === 'access_token') {
      if (!this.settings.accessToken) {
        throw new Error('Box access/app token is not configured');
      }
      return this.settings.accessToken;
    }
    if (
      !this.settings.clientId
      || !this.settings.clientSecret
      || !this.settings.subjectId
    ) {
      throw new Error('Box client ID, client secret, and subject ID are required');
    }
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60_000) {
      return this.cachedToken.value;
    }
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.settings.clientId,
      client_secret: this.settings.clientSecret,
      box_subject_type: this.settings.subjectType,
      box_subject_id: this.settings.subjectId,
    });
    const response = await fetch(BOX_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const payload = await this.readResponse<BoxTokenResponse>(response);
    if (!payload.access_token) {
      throw new Error('Box token response did not include an access token');
    }
    this.cachedToken = {
      value: payload.access_token,
      expiresAt: Date.now() + Math.max(60, payload.expires_in ?? 3600) * 1000,
    };
    return payload.access_token;
  }

  private async resolveRootFolder(token: string): Promise<BoxItem> {
    if (this.settings.folderId) {
      const folder = await this.boxJson<BoxItem>(
        `${BOX_API_BASE}/folders/${encodeURIComponent(this.settings.folderId)}`,
        { token },
      );
      if (folder.type !== 'folder') throw new Error('Configured Box item is not a folder');
      return folder;
    }
    const entries = await this.listFolderItems(token, '0');
    const matching = entries.find((item) => (
      item.type === 'folder'
      && item.name.toLowerCase() === this.settings.folderName.toLowerCase()
    ));
    if (matching) return matching;
    return this.createFolder(token, '0', this.settings.folderName);
  }

  private async ensureRemotePath(
    token: string,
    rootFolderId: string,
    remoteDirectory: string,
    cache: Map<string, BoxItem>,
  ): Promise<BoxItem> {
    if (!remoteDirectory) {
      const root = cache.get('');
      if (!root) throw new Error('Box root folder cache is missing');
      return root;
    }
    let parentId = rootFolderId;
    let currentPath = '';
    let currentFolder = cache.get('');
    for (const segment of remoteDirectory.split('/').filter(Boolean)) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const cached = cache.get(currentPath);
      if (cached) {
        parentId = cached.id;
        currentFolder = cached;
        continue;
      }
      const entries = await this.listFolderItems(token, parentId);
      let folder = entries.find((item) => item.type === 'folder' && item.name === segment);
      if (!folder) folder = await this.createFolder(token, parentId, segment);
      cache.set(currentPath, folder);
      parentId = folder.id;
      currentFolder = folder;
    }
    if (!currentFolder) throw new Error(`Unable to resolve Box directory ${remoteDirectory}`);
    return currentFolder;
  }

  private async listFolderItems(token: string, folderId: string): Promise<BoxItem[]> {
    const entries: BoxItem[] = [];
    let marker: string | undefined;
    do {
      const url = new URL(`${BOX_API_BASE}/folders/${encodeURIComponent(folderId)}/items`);
      url.searchParams.set('limit', '1000');
      url.searchParams.set('usemarker', 'true');
      url.searchParams.set('fields', 'id,type,name,sha1');
      if (marker) url.searchParams.set('marker', marker);
      const payload = await this.boxJson<BoxItemsResponse>(url.toString(), { token });
      entries.push(...(payload.entries ?? []));
      marker = payload.next_marker ?? undefined;
    } while (marker);
    return entries;
  }

  private async createFolder(token: string, parentId: string, name: string): Promise<BoxItem> {
    try {
      return await this.boxJson<BoxItem>(`${BOX_API_BASE}/folders`, {
        token,
        method: 'POST',
        body: JSON.stringify({
          name: safeRemoteName(name),
          parent: { id: parentId },
        }),
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      // A concurrent sync can win the create race. Re-list before surfacing 409.
      const entries = await this.listFolderItems(token, parentId);
      const existing = entries.find((item) => item.type === 'folder' && item.name === name);
      if (existing) return existing;
      throw err;
    }
  }

  private async uploadNewFile(
    token: string,
    parentId: string,
    localPath: string,
    name: string,
  ): Promise<BoxItem> {
    this.assertApprovedArtifactFile(localPath);
    const form = new FormData();
    form.append('attributes', JSON.stringify({ name, parent: { id: parentId } }));
    form.append('file', new Blob([await fs.promises.readFile(localPath)]), name);
    const response = await fetch(`${BOX_UPLOAD_BASE}/files/content`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const payload = await this.readResponse<BoxUploadResponse>(response);
    const uploaded = payload.entries?.[0];
    if (!uploaded) throw new Error('Box upload response did not include a file');
    return uploaded;
  }

  private async uploadFileVersion(
    token: string,
    fileId: string,
    localPath: string,
    name: string,
  ): Promise<BoxItem> {
    this.assertApprovedArtifactFile(localPath);
    const form = new FormData();
    form.append('attributes', JSON.stringify({ name }));
    form.append('file', new Blob([await fs.promises.readFile(localPath)]), name);
    const response = await fetch(
      `${BOX_UPLOAD_BASE}/files/${encodeURIComponent(fileId)}/content`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
    );
    const payload = await this.readResponse<BoxUploadResponse>(response);
    const uploaded = payload.entries?.[0];
    if (!uploaded) throw new Error('Box version response did not include a file');
    return uploaded;
  }

  private async boxJson<T>(
    url: string,
    options: {
      token: string;
      method?: string;
      body?: string;
      headers?: Record<string, string>;
    },
  ): Promise<T> {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${options.token}`,
        ...(options.headers ?? {}),
      },
      body: options.body,
    });
    return this.readResponse<T>(response);
  }

  private async readResponse<T>(response: Response): Promise<T> {
    const text = await response.text();
    let payload: unknown = {};
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text.slice(0, 500) };
      }
    }
    if (!response.ok) {
      const error = payload as {
        code?: string;
        message?: string;
        context_info?: { errors?: Array<{ message?: string }> };
      };
      const detail = error.context_info?.errors?.[0]?.message;
      throw new Error(
        `Box API ${response.status}: ${detail ?? error.message ?? error.code ?? response.statusText}`,
      );
    }
    return payload as T;
  }

  private async sha1(filePath: string): Promise<string> {
    this.assertApprovedArtifactFile(filePath);
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha1');
      const stream = fs.createReadStream(filePath);
      stream.on('error', reject);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  private saveSettings(): void {
    const directory = path.dirname(this.settingsPath);
    fs.mkdirSync(directory, { recursive: true });
    const temporaryPath = `${this.settingsPath}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    try {
      // The generic atomic JSON helper creates its temporary file with the
      // process umask. Credentials must be private from the first write, not
      // only after the final rename.
      fs.writeFileSync(temporaryPath, JSON.stringify(this.settings, null, 2), {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      });
      fs.renameSync(temporaryPath, this.settingsPath);
      fs.chmodSync(this.settingsPath, 0o600);
    } catch (err) {
      try { fs.unlinkSync(temporaryPath); } catch { /* no temporary file to clean up */ }
      throw err;
    }
  }

  private loadSettings(): BoxIntegrationSettings {
    try {
      if (!fs.existsSync(this.settingsPath)) return structuredClone(DEFAULT_SETTINGS);
      const parsed = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8')) as Partial<BoxIntegrationSettings>;
      const authMode = parsed.authMode === 'client_credentials' ? parsed.authMode : 'access_token';
      const subjectType = parsed.subjectType === 'user' ? parsed.subjectType : 'enterprise';
      const interval = typeof parsed.autoSyncIntervalMinutes === 'number'
        && Number.isFinite(parsed.autoSyncIntervalMinutes)
        && parsed.autoSyncIntervalMinutes >= 5
        && parsed.autoSyncIntervalMinutes <= 10080
        ? parsed.autoSyncIntervalMinutes
        : DEFAULT_SETTINGS.autoSyncIntervalMinutes;
      const categories = { ...DEFAULT_SETTINGS.categories };
      if (parsed.categories && typeof parsed.categories === 'object') {
        for (const category of Object.keys(categories) as BoxArtifactCategory[]) {
          const value = parsed.categories[category];
          if (typeof value === 'boolean') categories[category] = value;
        }
      }
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_SETTINGS.enabled,
        authMode,
        accessToken: typeof parsed.accessToken === 'string' ? parsed.accessToken : '',
        clientId: typeof parsed.clientId === 'string' ? parsed.clientId : '',
        clientSecret: typeof parsed.clientSecret === 'string' ? parsed.clientSecret : '',
        subjectType,
        subjectId: typeof parsed.subjectId === 'string' ? parsed.subjectId : '',
        folderId: typeof parsed.folderId === 'string' ? parsed.folderId : '',
        folderName: typeof parsed.folderName === 'string'
          ? safeRemoteName(parsed.folderName) || DEFAULT_SETTINGS.folderName
          : DEFAULT_SETTINGS.folderName,
        autoSync: typeof parsed.autoSync === 'boolean' ? parsed.autoSync : DEFAULT_SETTINGS.autoSync,
        autoSyncIntervalMinutes: interval,
        categories,
      };
    } catch (err) {
      logger.warn({ err }, 'Failed to load Box settings; using defaults');
      return structuredClone(DEFAULT_SETTINGS);
    }
  }

  private isPathInsideRoot(candidatePath: string, rootPath: string): boolean {
    const candidateAbsolute = path.resolve(candidatePath);
    const rootAbsolute = path.resolve(rootPath);
    if (
      candidateAbsolute !== rootAbsolute
      && !candidateAbsolute.startsWith(`${rootAbsolute}${path.sep}`)
    ) {
      return false;
    }
    try {
      const rootStat = fs.lstatSync(rootAbsolute);
      const candidateStat = fs.lstatSync(candidateAbsolute);
      if (rootStat.isSymbolicLink() || candidateStat.isSymbolicLink()) return false;
      const rootReal = fs.realpathSync(rootAbsolute);
      const candidateReal = fs.realpathSync(candidateAbsolute);
      return candidateReal === rootReal || candidateReal.startsWith(`${rootReal}${path.sep}`);
    } catch {
      return false;
    }
  }

  private assertApprovedArtifactFile(filePath: string): void {
    const root = this.artifactRoots().find((entry) => (
      this.isPathInsideRoot(filePath, entry.localPath)
    ));
    if (!root) {
      throw new Error('Artifact file is outside the approved export roots or uses a symlink');
    }
    const stat = fs.lstatSync(filePath);
    if (!stat.isFile()) throw new Error('Artifact path is not a regular file');
  }
}
