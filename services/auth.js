/* 拾光岛 · 鉴权服务(users / sessions 表的唯一读写入口)
 * 会话为 DB 持久化的 opaque token(192bit 随机),重启不失效,无需签名密钥。 */
'use strict';

const crypto = require('node:crypto');
const { getDb } = require('../db');
const { hashPassword, verifyPassword } = require('../lib/passwords');

const SESSION_TTL_MS = 7 * 24 * 3600 * 1000; // 7 天

function hasOwner() {
  return getDb().prepare('SELECT COUNT(*) AS c FROM users').get().c > 0;
}

function createUser({ username, displayName, password }) {
  const info = getDb()
    .prepare('INSERT INTO users (username, password_hash, display_name, created_at) VALUES (?, ?, ?, ?)')
    .run(username, hashPassword(password), displayName, new Date().toISOString());
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
}

function findByUsername(username) {
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username) || null;
}

/* 登录校验。用户不存在时也执行一次哈希比较,抹平响应时间差;
   失败文案统一由路由层给出,不区分"用户不存在/密码错误"。 */
const DUMMY_HASH = hashPassword('timing-equalizer');

function verifyLogin(username, password) {
  const user = findByUsername(String(username || ''));
  const stored = user ? user.password_hash : DUMMY_HASH;
  const ok = verifyPassword(String(password || ''), stored);
  return ok && user ? user : null;
}

function createSession(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  getDb().prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
  return { token, expiresAt };
}

function deleteSession(token) {
  getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

/* 由 token 取登录用户;过期会话顺手清除 */
function getSessionUser(token) {
  if (!token) return null;
  const row = getDb()
    .prepare('SELECT u.id, u.username, u.display_name, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?')
    .get(token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    deleteSession(token);
    return null;
  }
  return { id: row.id, username: row.username, displayName: row.display_name };
}

function purgeExpiredSessions() {
  getDb().prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString());
}

module.exports = {
  SESSION_TTL_MS,
  hasOwner,
  createUser,
  findByUsername,
  verifyLogin,
  createSession,
  deleteSession,
  getSessionUser,
  purgeExpiredSessions
};
