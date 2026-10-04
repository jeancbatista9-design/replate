import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
export function openDatabase(path = process.env.DB_PATH || resolve('data/replate.sqlite')) {
  if (path !== ':memory:') mkdirSync(resolve(path, '..'), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS households(id TEXT PRIMARY KEY, name TEXT NOT NULL, invite TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, household TEXT NOT NULL REFERENCES households(id), name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS items(id TEXT PRIMARY KEY, household TEXT NOT NULL REFERENCES households(id), name TEXT NOT NULL, category TEXT NOT NULL, storage TEXT NOT NULL, quantity REAL NOT NULL, unit TEXT NOT NULL, price REAL NOT NULL, expiry TEXT NOT NULL, allergens TEXT NOT NULL, status TEXT NOT NULL, updated TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS profile_goals(profile TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,goal TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY, household TEXT NOT NULL REFERENCES households(id), name TEXT NOT NULL, allergies TEXT NOT NULL, diet TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS shopping(id TEXT PRIMARY KEY, household TEXT NOT NULL REFERENCES households(id), name TEXT NOT NULL, quantity REAL NOT NULL, checked INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS plans(household TEXT NOT NULL REFERENCES households(id), day TEXT NOT NULL, recipe TEXT NOT NULL, PRIMARY KEY(household,day));
    CREATE TABLE IF NOT EXISTS products(code TEXT PRIMARY KEY, data TEXT NOT NULL, fetched INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS subscriptions(household TEXT PRIMARY KEY REFERENCES households(id), plan TEXT NOT NULL DEFAULT 'free', cycle TEXT NOT NULL DEFAULT 'monthly', updated TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS saved_scans(household TEXT NOT NULL REFERENCES households(id), code TEXT NOT NULL, data TEXT NOT NULL, saved TEXT NOT NULL, PRIMARY KEY(household,code));
    CREATE TABLE IF NOT EXISTS user_handles(username TEXT PRIMARY KEY COLLATE NOCASE, user TEXT UNIQUE NOT NULL REFERENCES users(id));
  `);
  return db;
}
