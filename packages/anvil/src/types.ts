export interface BlockBounds {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export interface SnapshotMember {
  filename: string;
  bytes: number;
  modifiedAt: string;
  sha256: string;
  regionX: number;
  regionZ: number;
  declaredChunks: number;
}

export interface SnapshotSummary {
  directory: string;
  algorithm: string;
  sha256: string;
  regionFileCount: number;
  declaredChunkCount: number;
  bytes: number;
  regionBounds: {
    minRegionX: number;
    maxRegionX: number;
    minRegionZ: number;
    maxRegionZ: number;
  } | null;
  members: SnapshotMember[];
}

export interface BlockCount {
  block: string;
  count: number;
}

export interface BlockCensus {
  snapshotSha256: string;
  bounds: BlockBounds | null;
  chunksVisited: number;
  chunksDecoded: number;
  sectionsDecoded: number;
  blocksCounted: number;
  uniqueBlockStates: number;
  complete: boolean;
  errors: Array<{
    region: string;
    chunkX: number;
    chunkZ: number;
    message: string;
  }>;
  blocks: BlockCount[];
}
