/* 知序 · 领域逻辑(纯函数,不依赖 DOM 与存储,可在 Node 中单元测试) */
(function (global) {
  'use strict';

  var CATEGORY_LABELS = { course: '课程', homework: '作业', exam: '考试', project: '项目' };
  var PRIORITY_LABELS = { high: '高优先级', medium: '中优先级', low: '低优先级' };
  var PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 };
  var WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /* 本地时区的"今天",全项目唯一的取当天入口 */
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /* 校验 YYYY-MM-DD 格式且为真实存在的日历日期 */
  function isValidDateStr(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var p = s.split('-');
    var y = +p[0], m = +p[1], d = +p[2];
    if (y < 1 || m < 1 || m > 12 || d < 1 || d > 31) return false;
    var dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }

  /* 按本地时区解析日期字符串(避免 new Date('YYYY-MM-DD') 被当作 UTC) */
  function parseLocalDate(s) {
    var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  /* 自然日差:未来为正,逾期为负;用本地日期构造并取整,规避夏令时偏差 */
  function daysUntil(dueDate, today) {
    return Math.round((parseLocalDate(dueDate) - parseLocalDate(today)) / 86400000);
  }

  function addDays(dateStr, n) {
    var d = parseLocalDate(dateStr);
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function weekdayOf(dateStr) {
    return WEEKDAY_LABELS[parseLocalDate(dateStr).getDay()];
  }

  /* 同年显示 10-30,跨年显示完整日期 */
  function formatDateCN(dateStr, today) {
    if (dateStr.slice(0, 4) === today.slice(0, 4)) return dateStr.slice(5);
    return dateStr;
  }

  /* 截止状态:done 优先;逾期 / 今日 / 1–3 天内 / 普通 */
  function getDueStatus(task, today) {
    if (task.done) return 'done';
    var diff = daysUntil(task.dueDate, today);
    if (diff < 0) return 'overdue';
    if (diff === 0) return 'today';
    if (diff <= 3) return 'soon';
    return 'normal';
  }

  function remainingText(task, today) {
    if (task.done) return '已完成';
    var diff = daysUntil(task.dueDate, today);
    if (diff < 0) return '已逾期 ' + (-diff) + ' 天';
    if (diff === 0) return '今天截止';
    if (diff === 1) return '明天截止';
    return '剩 ' + diff + ' 天';
  }

  /* 组合筛选:状态 × 分类 × 关键词(标题+备注,不区分大小写),条件为 AND */
  function filterTasks(tasks, filters, today) {
    var status = (filters && filters.status) || 'all';
    var category = (filters && filters.category) || 'all';
    var kw = ((filters && filters.keyword) || '').trim().toLowerCase();
    var out = [];
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (category !== 'all' && t.category !== category) continue;
      if (status !== 'all') {
        if (status === 'todo') { if (t.done) continue; }
        else if (status === 'done') { if (!t.done) continue; }
        else if (getDueStatus(t, today) !== status) continue;
      }
      if (kw) {
        var hay = (t.title + '\n' + (t.note || '')).toLowerCase();
        if (hay.indexOf(kw) === -1) continue;
      }
      out.push(t);
    }
    return out;
  }

  /* 仪表盘统计;total 为 0 时完成率返回 null(展示为 —) */
  function computeStats(tasks, today) {
    var total = tasks.length, done = 0, overdue = 0;
    for (var i = 0; i < total; i++) {
      var t = tasks[i];
      if (t.done) done++;
      else if (getDueStatus(t, today) === 'overdue') overdue++;
    }
    return {
      total: total,
      done: done,
      todo: total - done,
      overdue: overdue,
      rate: total === 0 ? null : Math.round((done / total) * 100)
    };
  }

  /* 排序:未完成在前 → 截止日近在前 → 优先级高在前 → 创建时间早在前 */
  function sortTasks(tasks, today) {
    return tasks.slice().sort(function (a, b) {
      if (a.done !== b.done) return a.done ? 1 : -1;
      var da = daysUntil(a.dueDate, today), db = daysUntil(b.dueDate, today);
      if (da !== db) return da - db;
      var wa = PRIORITY_WEIGHT[a.priority], wb = PRIORITY_WEIGHT[b.priority];
      if (wa !== wb) return wb - wa;
      if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
      return 0;
    });
  }

  function makeId() {
    return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  global.Domain = {
    CATEGORY_LABELS: CATEGORY_LABELS,
    PRIORITY_LABELS: PRIORITY_LABELS,
    PRIORITY_WEIGHT: PRIORITY_WEIGHT,
    WEEKDAY_LABELS: WEEKDAY_LABELS,
    todayStr: todayStr,
    isValidDateStr: isValidDateStr,
    parseLocalDate: parseLocalDate,
    daysUntil: daysUntil,
    addDays: addDays,
    weekdayOf: weekdayOf,
    formatDateCN: formatDateCN,
    getDueStatus: getDueStatus,
    remainingText: remainingText,
    filterTasks: filterTasks,
    computeStats: computeStats,
    sortTasks: sortTasks,
    makeId: makeId
  };
})(typeof window !== 'undefined' ? window : globalThis);
