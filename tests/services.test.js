/* 拾光岛 · 服务层单元测试(临时 SQLite 库,不碰开发数据)
 * 运行:npm test */
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/* 使用临时数据库,必须在 require db 模块之前设置 */
const tmpDb = path.join(os.tmpdir(), `sgd-test-${process.pid}-${Date.now()}.db`);
process.env.SGD_DB = tmpDb;

const { initDb, getDb } = require('../db');
const diaryService = require('../services/diary');
const { formatDateLong } = require('../lib/date');

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

initDb();

/* ---------- 造数据 ---------- */
const insert = getDb().prepare(`
  INSERT INTO diaries (title, content, mood, entry_date, is_private, photo_path, created_at, updated_at)
  VALUES (@title, @content, @mood, @entry_date, @is_private, NULL, @now, @now)
`);
const now = new Date().toISOString();
getDb().transaction(() => {
  insert.run({ title: '十月公开甲', content: 'c1', mood: 'sunny',  entry_date: '2026-10-25', is_private: 0, now });
  insert.run({ title: '十月私人',   content: 'c2', mood: 'starry', entry_date: '2026-10-24', is_private: 1, now });
  insert.run({ title: '十月公开乙', content: 'c3', mood: 'rainy',  entry_date: '2026-10-02', is_private: 0, now });
  insert.run({ title: '九月公开',   content: 'c4', mood: 'foggy',  entry_date: '2026-09-20', is_private: 0, now });
  insert.run({ title: '同日公开丙', content: 'c5', mood: 'windy',  entry_date: '2026-10-25', is_private: 0, now });
})();

/* ---------- listPublic ---------- */

test('listPublic 只含公开日记,按日期倒序、同日按 id 倒序', () => {
  const rows = diaryService.listPublic(100);
  eq(rows.map(r => r.title), ['同日公开丙', '十月公开甲', '十月公开乙', '九月公开']);
});

test('listPublic 的 limit 生效', () => {
  eq(diaryService.listPublic(2).length, 2);
});

/* ---------- getById ---------- */

test('getById 能取到任意可见性的单篇', () => {
  const rows = getDb().prepare('SELECT id, title FROM diaries ORDER BY id').all();
  const priv = rows.find(r => r.title === '十月私人');
  eq(diaryService.getById(priv.id).title, '十月私人');
});

test('getById 对不存在/非法 id 返回 null', () => {
  eq(diaryService.getById(99999), null);
  eq(diaryService.getById(0), null);
  eq(diaryService.getById(-1), null);
  eq(diaryService.getById('abc'), null);
  eq(diaryService.getById(), null);
});

/* ---------- groupByMonth ---------- */

test('groupByMonth 按月分组且保持输入顺序', () => {
  const rows = diaryService.listPublic(100);
  const groups = diaryService.groupByMonth(rows);
  eq(groups.map(g => g.label), ['2026 年 10 月', '2026 年 9 月']);
  eq(groups[0].items.length, 3);
  eq(groups[0].items[0].title, '同日公开丙');
  eq(groups[0].key, '2026-10');
});

test('groupByMonth 空输入返回空数组', () => {
  eq(diaryService.groupByMonth([]), []);
});

/* ---------- formatDateLong ---------- */

test('formatDateLong 输出中文长日期与星期', () => {
  eq(formatDateLong('2026-10-25'), '2026 年 10 月 25 日 · 周日');
  eq(formatDateLong('2024-02-29'), '2024 年 2 月 29 日 · 周四'); // 闰日
});

/* ---------- 清理与汇总 ---------- */

getDb().close();
fs.rmSync(tmpDb, { force: true });
fs.rmSync(tmpDb + '-wal', { force: true });
fs.rmSync(tmpDb + '-shm', { force: true });

console.log('\n通过 ' + passed + ' / 失败 ' + failed);
process.exit(failed > 0 ? 1 : 0);
