#!/usr/bin/env node
/** Compatibility entry point for the validated 2026-08-27 coordinate publication. */
import { syncCoordinateDirectory } from './sync_coordinate_directory.mjs';

syncCoordinateDirectory();
