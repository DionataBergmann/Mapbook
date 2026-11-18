import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { createPhotoIndex, type PhotoIndex, type Sql } from './photo-index';

function sqliteSql(db: SQLiteDatabase): Sql {
  return {
    exec: (source) => db.execAsync(source),
    run: async (source, params) => {
      await db.runAsync(source, params);
    },
    get: (source, params) => db.getFirstAsync(source, params),
    all: (source, params) => db.getAllAsync(source, params),
    transaction: async (task) => {
      let result!: Awaited<ReturnType<typeof task>>;
      await db.withTransactionAsync(async () => {
        result = await task();
      });
      return result;
    },
  };
}

export async function openPhotoIndex(): Promise<PhotoIndex> {
  const db = await openDatabaseAsync('mapbook.db');
  const index = createPhotoIndex(sqliteSql(db));
  await index.migrate();
  return index;
}
