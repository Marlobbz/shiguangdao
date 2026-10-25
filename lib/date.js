/* 拾光岛 · 日期工具(服务端;内部统一使用本地时区 YYYY-MM-DD) */
'use strict';

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function pad2(n) { return n < 10 ? '0' + n : String(n); }

/* 本地时区的"今天",服务端唯一入口 */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/* 'YYYY-MM-DD' → '2026 年 10 月 25 日 · 周六' */
function formatDateLong(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const weekday = WEEKDAY_LABELS[new Date(y, m - 1, d).getDay()];
  return `${y} 年 ${m} 月 ${d} 日 · ${weekday}`;
}

module.exports = { todayStr, formatDateLong, WEEKDAY_LABELS };
