import type { GalleryPhoto } from '@/gallery/gallery-photo';

import { indexPhoto, type IndexedPhoto, type PhotoRole } from './photo-role';

export type { IndexedPhoto, PhotoRole } from './photo-role';

export type SqlValue = string | number | null;

export type Sql = {
  exec(source: string): Promise<void>;
  run(source: string, params: SqlValue[]): Promise<void>;
  get<T>(source: string, params: SqlValue[]): Promise<T | null>;
  all<T>(source: string, params: SqlValue[]): Promise<T[]>;
  transaction<T>(task: () => Promise<T>): Promise<T>;
};

export type RoleCounts = Record<PhotoRole, number>;

export type PhotoIndex = {
  migrate(): Promise<void>;
  upsert(photos: IndexedPhoto[]): Promise<void>;
  counts(): Promise<RoleCounts>;
  list(role: PhotoRole): Promise<IndexedPhoto[]>;
  /** Devolve o corte da leitura incremental, ou `null` para reler a galeria inteira. */
  prepareSync(): Promise<number | null>;
  finishSync(): Promise<void>;
};

export type SyncReport = {
  upserted: number;
  /** `null` quando a passagem leu a galeria inteira. */
  createdAfter: number | null;
};

type PhotoRow = {
  asset_id: string;
  taken_at: number | null;
  latitude: number | null;
  longitude: number | null;
  kind: IndexedPhoto['kind'];
  role: PhotoRole;
};

type SyncRow = {
  status: 'idle' | 'running';
  cursor_taken_at: number | null;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS photos (
  asset_id TEXT PRIMARY KEY,
  taken_at INTEGER,
  latitude REAL,
  longitude REAL,
  kind TEXT NOT NULL,
  role TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS photos_role_taken_at ON photos (role, taken_at);

CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  status TEXT NOT NULL,
  cursor_taken_at INTEGER
);
`;

const UPSERT_PHOTO = `
INSERT INTO photos (asset_id, taken_at, latitude, longitude, kind, role)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(asset_id) DO UPDATE SET
  taken_at = excluded.taken_at,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  kind = excluded.kind,
  role = excluded.role
`;

const ROLES: PhotoRole[] = ['map', 'classify', 'screenshot'];

export function emptyRoleCounts(): RoleCounts {
  return { map: 0, classify: 0, screenshot: 0 };
}

export function createPhotoIndex(sql: Sql): PhotoIndex {
  return {
    migrate() {
      return sql.exec(SCHEMA);
    },

    async upsert(photos) {
      if (photos.length === 0) return;
      await sql.transaction(async () => {
        for (const photo of photos) {
          await sql.run(UPSERT_PHOTO, [
            photo.assetId,
            photo.takenAt,
            photo.latitude,
            photo.longitude,
            photo.kind,
            photo.role,
          ]);
        }
      });
    },

    async counts() {
      const rows = await sql.all<{ role: string; total: number }>(
        'SELECT role, COUNT(*) AS total FROM photos GROUP BY role',
        [],
      );
      const counts = emptyRoleCounts();
      for (const row of rows) {
        if (isRole(row.role)) counts[row.role] = row.total;
      }
      return counts;
    },

    async list(role) {
      const rows = await sql.all<PhotoRow>(
        `SELECT asset_id, taken_at, latitude, longitude, kind, role
         FROM photos
         WHERE role = ?
         ORDER BY taken_at IS NULL, taken_at DESC, asset_id ASC`,
        [role],
      );
      return rows.map(toIndexedPhoto);
    },

    async prepareSync() {
      const state = await sql.get<SyncRow>(
        'SELECT status, cursor_taken_at FROM sync_state WHERE id = 1',
        [],
      );
      await sql.run(
        `INSERT INTO sync_state (id, status, cursor_taken_at) VALUES (1, 'running', ?)
         ON CONFLICT(id) DO UPDATE SET status = 'running'`,
        [state?.cursor_taken_at ?? null],
      );
      return state?.status === 'idle' ? state.cursor_taken_at : null;
    },

    async finishSync() {
      const newest = await sql.get<{ taken_at: number | null }>(
        'SELECT MAX(taken_at) AS taken_at FROM photos',
        [],
      );
      await sql.run(
        `INSERT INTO sync_state (id, status, cursor_taken_at) VALUES (1, 'idle', ?)
         ON CONFLICT(id) DO UPDATE SET
           status = 'idle',
           cursor_taken_at = excluded.cursor_taken_at`,
        [newest?.taken_at ?? null],
      );
    },
  };
}

export type GalleryPageSource = (options: {
  createdAfter?: number;
}) => AsyncIterable<{ photos: GalleryPhoto[] }>;

/**
 * Grava as páginas da galeria. A leitura incremental usa o instante da foto
 * mais recente já gravada; no iOS o filtro da galeria é estrito (`>`).
 * Se a passagem anterior não terminou, relê a galeria inteira: a leitura vem
 * da mais nova para a mais antiga, e um corte no meio perderia o restante.
 */
export async function syncPhotoIndex(
  index: PhotoIndex,
  read: GalleryPageSource,
): Promise<SyncReport> {
  const createdAfter = await index.prepareSync();
  let upserted = 0;

  for await (const page of read(createdAfter === null ? {} : { createdAfter })) {
    if (page.photos.length === 0) continue;
    await index.upsert(page.photos.map(indexPhoto));
    upserted += page.photos.length;
  }

  await index.finishSync();
  return { upserted, createdAfter };
}

function toIndexedPhoto(row: PhotoRow): IndexedPhoto {
  return {
    assetId: row.asset_id,
    takenAt: row.taken_at,
    latitude: row.latitude,
    longitude: row.longitude,
    kind: row.kind,
    role: row.role,
  };
}

function isRole(role: string): role is PhotoRole {
  return ROLES.includes(role as PhotoRole);
}
