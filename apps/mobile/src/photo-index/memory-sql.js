const { DatabaseSync } = require('node:sqlite');

/** SQLite em memória para o teste do índice. O app usa o expo-sqlite. */
function memorySql() {
  const db = new DatabaseSync(':memory:');
  return {
    async exec(source) {
      db.exec(source);
    },
    async run(source, params) {
      db.prepare(source).run(...params);
    },
    async get(source, params) {
      return db.prepare(source).get(...params) ?? null;
    },
    async all(source, params) {
      return db.prepare(source).all(...params);
    },
    async transaction(task) {
      db.exec('BEGIN');
      try {
        const result = await task();
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

module.exports = { memorySql };
