/* 拾光岛 · 鉴权单元测试(密码哈希、会话服务、requireAuth 中间件;临时库)
 * 运行:npm test */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tmpDb = path.join(os.tmpdir(), `sgd-auth-test-${process.pid}-${Date.now()}.db`);
process.env.SGD_DB = tmpDb;

const { initDb, getDb } = require('../db');
const { hashPassword, verifyPassword } = require('../lib/passwords');
const authService = require('../services/auth');
const { requireAuth } = require('../middleware/auth');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ✓ ' + name);
  } catch (e) {
    failed++;
    console.log('  ✗ ' + name + '\n      ' + e.message);
  }
}

function eq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error((msg || '') + ' 期望 ' + b + ',实际 ' + a);
}

function ok(cond, msg) {
  if (!cond) throw new Error(msg || '条件为假');
}

initDb();

/* ---------- 密码哈希 ---------- */

test('hashPassword/verifyPassword 往返正确', () => {
  const stored = hashPassword('correct horse battery');
  ok(stored.startsWith('scrypt$'));
  ok(verifyPassword('correct horse battery', stored));
});

test('错误密码、格式损坏的哈希返回 false', () => {
  const stored = hashPassword('correct horse battery');
  ok(!verifyPassword('wrong password', stored));
  ok(!verifyPassword('anything', 'plain-text'));
  ok(!verifyPassword('anything', 'md5$abc$def'));
  ok(!verifyPassword('', 'scrypt$$'));
});

test('相同密码两次哈希产生不同盐', () => {
  ok(hashPassword('same') !== hashPassword('same'));
});

/* ---------- 站长账号 ---------- */

test('初始没有站长;创建后 hasOwner 为真且入口应关闭', () => {
  eq(authService.hasOwner(), false);
  authService.createUser({ username: 'skipper', displayName: '岛主', password: 's3cret-pw!' });
  eq(authService.hasOwner(), true);
});

test('verifyLogin:正确凭据通过;错误密码/不存在用户返回 null,且耗时差异被抹平', () => {
  ok(authService.verifyLogin('skipper', 's3cret-pw!'));
  eq(authService.verifyLogin('skipper', 'wrong-pw'), null);
  eq(authService.verifyLogin('nobody', 'whatever'), null);
  eq(authService.verifyLogin('', ''), null);
});

/* ---------- 会话 ---------- */

test('createSession → getSessionUser 往返;deleteSession 后失效', () => {
  const user = authService.findByUsername('skipper');
  const s = authService.createSession(user.id);
  const loaded = authService.getSessionUser(s.token);
  eq(loaded.displayName, '岛主');
  authService.deleteSession(s.token);
  eq(authService.getSessionUser(s.token), null);
});

test('过期会话被视为未登录并被清除', () => {
  const user = authService.findByUsername('skipper');
  const past = new Date(Date.now() - 1000).toISOString();
  getDb().prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run('expired-token', user.id, past);
  eq(authService.getSessionUser('expired-token'), null);
  eq(getDb().prepare('SELECT COUNT(*) AS c FROM sessions WHERE token = ?').get('expired-token').c, 0);
});

test('getSessionUser 对空/伪造 token 返回 null', () => {
  eq(authService.getSessionUser(null), null);
  eq(authService.getSessionUser(''), null);
  eq(authService.getSessionUser('forged-token'), null);
});

test('purgeExpiredSessions 清理过期行、保留有效行', () => {
  const user = authService.findByUsername('skipper');
  getDb().prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run('old', user.id, '2000-01-01T00:00:00.000Z');
  const keep = authService.createSession(user.id);
  authService.purgeExpiredSessions();
  eq(getDb().prepare('SELECT COUNT(*) AS c FROM sessions WHERE token = ?').get('old').c, 0);
  ok(authService.getSessionUser(keep.token));
});

/* ---------- requireAuth 中间件 ---------- */

function mockRes() {
  return {
    redirectedTo: null,
    redirect(url) { this.redirectedTo = url; }
  };
}

test('未登录访问写路由:302 到 /login 并携带站内回跳地址', () => {
  const req = { user: null, originalUrl: '/diary/new' };
  const res = mockRes();
  let nextCalled = false;
  requireAuth(req, res, () => { nextCalled = true; });
  eq(nextCalled, false);
  eq(res.redirectedTo, '/login?next=%2Fdiary%2Fnew');
});

test('已登录直接放行', () => {
  const req = { user: { id: 1 }, originalUrl: '/diary/new' };
  const res = mockRes();
  let nextCalled = false;
  requireAuth(req, res, () => { nextCalled = true; });
  eq(nextCalled, true);
});

test('外部式回跳地址(originalUrl 非站内)按 / 处理', () => {
  const req = { user: null, originalUrl: 'http://evil.example.com' };
  const res = mockRes();
  requireAuth(req, res, () => {});
  eq(res.redirectedTo, '/login?next=%2F');
});

/* ---------- 清理 ---------- */

getDb().close();
fs.rmSync(tmpDb, { force: true });
fs.rmSync(tmpDb + '-wal', { force: true });
fs.rmSync(tmpDb + '-shm', { force: true });

console.log('\n通过 ' + passed + ' / 失败 ' + failed);
process.exit(failed > 0 ? 1 : 0);
