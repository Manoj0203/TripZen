import { open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import * as schema from './schema';
import { runMigrations } from './migrations';

const DB_NAME = 'tripzen.db';

let rawDbInstance = null;
let drizzleDbInstance = null;

/**
 * Creates an adapter around the op-sqlite instance for Drizzle ORM.
 * op-sqlite v19 returns `{ rawRows: [...], columnNames: [...] }` from `executeRaw` / `executeRawAsync`,
 * whereas Drizzle's OPSQLiteSession expects `executeRawAsync` to resolve directly to an array of rows (`rawRows`).
 * This adapter unwraps `res.rawRows` so Drizzle's `rows.map()` works without throwing 'undefined is not a function'.
 */
function createDrizzleAdapter(client) {
  if (!client) return client;
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === 'executeRawAsync') {
        return async (query, params) => {
          const res = typeof target.executeRawAsync === 'function'
            ? await target.executeRawAsync(query, params)
            : (typeof target.executeRaw === 'function' ? await target.executeRaw(query, params) : []);
          return Array.isArray(res) ? res : (res?.rawRows ?? []);
        };
      }
      if (prop === 'executeAsync') {
        return async (query, params) => {
          return typeof target.executeAsync === 'function'
            ? target.executeAsync(query, params)
            : target.execute(query, params);
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

/**
 * Initialize SQLite database and run pending migrations.
 * Accepts an optional customDb for testing environments.
 *
 * @param {object} [customDb] Optional custom op-sqlite database instance
 * @returns {{ db: object, rawDb: object }}
 */
export function initDatabase(customDb) {
  if (customDb) {
    rawDbInstance = customDb;
    runMigrations(rawDbInstance);
    drizzleDbInstance = drizzle(createDrizzleAdapter(rawDbInstance), { schema });
    return { db: drizzleDbInstance, rawDb: rawDbInstance };
  }

  if (!rawDbInstance) {
    rawDbInstance = open({ name: DB_NAME });
    runMigrations(rawDbInstance);
    drizzleDbInstance = drizzle(createDrizzleAdapter(rawDbInstance), { schema });
  }

  return { db: drizzleDbInstance, rawDb: rawDbInstance };
}

/**
 * Returns the active Drizzle database instance.
 * Automatically initializes the database if not yet initialized.
 *
 * @returns {object} Drizzle ORM database instance
 */
export function getDb() {
  if (!drizzleDbInstance) {
    initDatabase();
  }
  return drizzleDbInstance;
}

/**
 * Returns the underlying raw op-sqlite instance.
 *
 * @returns {object} Raw op-sqlite database instance
 */
export function getRawDb() {
  if (!rawDbInstance) {
    initDatabase();
  }
  return rawDbInstance;
}
