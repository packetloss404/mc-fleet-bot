export interface DatabaseObjectSchema {
  name: string;
  type: 'table' | 'view';
  sql: string | null;
}

export interface DatabaseCatalog {
  filename: string;
  bytes: number;
  sha256: string;
  quickCheck: string[];
  tableCounts: Record<string, number>;
  schema: DatabaseObjectSchema[];
}

export interface WorldFeatureExport {
  database: string;
  table: 'world_features';
  limit: number;
  total: number;
  truncated: boolean;
  columns: string[];
  records: Array<Record<string, unknown>>;
}
