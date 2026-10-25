/* 拾光岛 · 页面路由(D1:时间线骨架) */
'use strict';

const express = require('express');
const { getDb } = require('../db');
const { MOODS } = require('./moods');

const router = express.Router();

/* 时间线(灯塔首页):公开日记按发生日期倒序,按月分组 */
router.get('/', (req, res) => {
  const rows = getDb()
    .prepare('SELECT * FROM diaries WHERE is_private = 0 ORDER BY entry_date DESC LIMIT 100')
    .all();
  res.render('timeline', { title: '拾光岛 · 时光时间线', groups: groupByMonth(rows) });
});

/* 按月分组:'2026-10-25' → { key:'2026-10', label:'2026 年 10 月', items:[...] } */
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

module.exports = router;
