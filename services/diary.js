/* 拾光岛 · 日记数据服务(唯一的 diaries 读写入口,便于单测与后续复用) */
'use strict';

const { getDb } = require('../db');

/* 公开日记列表(时间线用):按发生日期倒序,私人不出现 */
function listPublic(limit = 100) {
  return getDb()
    .prepare('SELECT * FROM diaries WHERE is_private = 0 ORDER BY entry_date DESC, id DESC LIMIT ?')
    .all(limit);
}

/* 全部日记(仅站长视角):含私人,排序一致 */
function listAll(limit = 100) {
  return getDb()
    .prepare('SELECT * FROM diaries ORDER BY entry_date DESC, id DESC LIMIT ?')
    .all(limit);
}

/* 按 id 取单篇(任意可见性);不存在返回 null。
   可见性由路由层结合当前身份判定——本函数不做权限判断。 */
function getById(id) {
  if (!Number.isInteger(id) || id <= 0) return null;
  return getDb().prepare('SELECT * FROM diaries WHERE id = ?').get(id) || null;
}

/* 时间线按月分组:'2026-10-25' → { key:'2026-10', label:'2026 年 10 月', items:[...] } */
function groupByMonth(rows) {
  const groups = [];
  let current = null;
  for (const row of rows) {
    const key = row.entry_date.slice(0, 7);
    if (!current || current.key !== key) {
      const [y, m] = key.split('-');
      current = { key, label: `${y} 年 ${Number(m)} 月`, items: [] };
      groups.push(current);
    }
    current.items.push(row);
  }
  return groups;
}

module.exports = { listPublic, listAll, getById, groupByMonth };
