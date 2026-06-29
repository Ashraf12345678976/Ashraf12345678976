import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db;

/**
 * Open (or create) the SQLite database and apply the schema. Idempotent:
 * the schema uses CREATE TABLE IF NOT EXISTS so it is safe on every boot.
 */
export function initDb() {
  if (db) return db;

  fs.mkdirSync(config.paths.data, { recursive: true });
  fs.mkdirSync(config.paths.media, { recursive: true });

  db = new Database(config.paths.db);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  return db;
}

export function getDb() {
  if (!db) return initDb();
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = undefined;
  }
}
