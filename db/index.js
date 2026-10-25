/* 拾光岛 · 数据库连接与建表(幂等) */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'shiguangdao.db');

let db = null;

function initDb() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  return db;
}

function getDb() {
  if (!db) throw new Error('数据库尚未初始化:请先调用 initDb()');
  return db;
}

module.exports = { initDb, getDb };
