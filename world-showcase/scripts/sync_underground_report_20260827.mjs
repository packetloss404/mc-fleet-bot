#!/usr/bin/env node
/**
 * Attempt the dated underground package only through the safe validator.
 * The checked-in 2026-08-27 directory is currently incomplete, so this entry
 * point intentionally fails before touching public/underground.
 */
import path from 'node:path';
import { syncUndergroundReport } from './sync_underground_report.mjs';

const siteRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(siteRoot, '..');

try {
  syncUndergroundReport({
    source: path.join(repoRoot, 'docs/redevelopment/2026-08-27-underground-navigation'),
    archiveRoot: null,
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(
    `Refusing incomplete 2026-08-27 underground publication; retained existing target: ${message}`,
  );
}
