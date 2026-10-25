/* 知序 · 数据持久化(localStorage)
   职责:存储可用性探测、任务字段校验、读写。
   备份导出 / 导入校验在 v0.5 版本加入。 */
(function (global) {
  'use strict';

  var TASKS_KEY = 'zhixu.tasks.v1';
  var SETTINGS_KEY = 'zhixu.settings.v1';
  var CATEGORIES = ['course', 'homework', 'exam', 'project'];
  var PRIORITIES = ['high', 'medium', 'low'];

  var DEFAULT_SETTINGS = { planDays: 7, dailyHours: 3 };

  function round2(x) { return Math.round(x * 100) / 100; }

  /* 探测 localStorage 是否真的可用(隐私模式等场景会抛错或静默失败) */
  function isStorageAvailable() {
    try {
      var s = global.localStorage;
      if (!s) return false;
      var k = '__zhixu_probe__';
      s.setItem(k, '1');
      var ok = s.getItem(k) === '1';
      s.removeItem(k);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function validIso(s) {
    return typeof s === 'string' && s.length > 0 && s.length <= 40 && !/\s/.test(s);
  }

  /* 校验并规范化单条任务。
     - 无 base(新增/导入):缺失的 id / createdAt 自动生成;
     - 有 base(编辑):沿用 base 的 id 与 createdAt。
     致命字段(标题/分类/截止日期)缺失或非法时返回 null。
     校验规则(加载与导入共用):
     - title 必填,1–100 字符;category / dueDate 必填且合法;
     - priority 缺省为 medium,出现但非法则拒绝该条;
     - estimateHours 缺省为 1,出现但不在 0.5–99 或不是 0.5 的整数倍则拒绝;
     - note 缺省为空,超 500 字符拒绝;done 缺省为 false,非布尔拒绝。 */
  function validateTask(raw, base) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

    var title = typeof raw.title === 'string' ? raw.title.trim() : '';
    if (!title || title.length > 100) return null;

    if (CATEGORIES.indexOf(raw.category) === -1) return null;
    if (!global.Domain.isValidDateStr(raw.dueDate)) return null;

    var priority = raw.priority === undefined || raw.priority === null ? 'medium' : raw.priority;
    if (PRIORITIES.indexOf(priority) === -1) return null;

    var est;
    if (raw.estimateHours === undefined || raw.estimateHours === null || raw.estimateHours === '') {
      est = 1;
    } else {
      est = round2(Number(raw.estimateHours));
      if (!isFinite(est)) return null;
      if (est < 0.5 || est > 99) return null;
      if (Math.abs(est * 2 - Math.round(est * 2)) > 1e-9) return null;
    }

    var note = raw.note === undefined || raw.note === null ? '' : raw.note;
    if (typeof note !== 'string' || note.length > 500) return null;

    var done;
    if (raw.done === undefined || raw.done === null) {
      done = !!(base && base.done);
    } else {
      if (typeof raw.done !== 'boolean') return null;
      done = raw.done;
    }

    var id = base ? base.id
      : (typeof raw.id === 'string' && raw.id && raw.id.length <= 64 ? raw.id : global.Domain.makeId());
    var createdAt = base ? base.createdAt
      : (validIso(raw.createdAt) ? raw.createdAt : new Date().toISOString());
    var updatedAt = validIso(raw.updatedAt) ? raw.updatedAt : createdAt;

    return {
      id: id,
      title: title,
      category: raw.category,
      dueDate: raw.dueDate,
      priority: priority,
      estimateHours: est,
      note: note,
      done: done,
      createdAt: createdAt,
      updatedAt: updatedAt
    };
  }

  /* 读取任务列表。
     返回 { tasks, mode: 'storage'|'memory', warning?, corrupted? }
     数据整体损坏时不清空原内容,由 UI 提供恢复入口。 */
  function loadTasks() {
    if (!isStorageAvailable()) {
      return {
        tasks: [],
        mode: 'memory',
        warning: '浏览器本地存储不可用(常见于隐私浏览模式),本次数据只保存在当前页面,关闭后将丢失。'
      };
    }

    var raw = null;
    try { raw = global.localStorage.getItem(TASKS_KEY); } catch (e) { raw = null; }
    if (raw === null || raw === '') return { tasks: [], mode: 'storage' };

    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return {
        tasks: [],
        mode: 'storage',
        corrupted: true,
        warning: '本地保存的数据已损坏(无法解析),已以空数据启动。你可以在下方清空损坏数据后重新开始,或先到"数据"页导出原始内容留证。'
      };
    }

    if (!Array.isArray(parsed)) {
      return {
        tasks: [],
        mode: 'storage',
        corrupted: true,
        warning: '本地保存的数据格式异常(不是任务列表),已以空数据启动。你可以在下方清空损坏数据后重新开始。'
      };
    }

    var tasks = [];
    var skipped = 0;
    for (var i = 0; i < parsed.length; i++) {
      var t = validateTask(parsed[i]);
      if (t) tasks.push(t); else skipped++;
    }
    return {
      tasks: tasks,
      mode: 'storage',
      warning: skipped > 0 ? '有 ' + skipped + ' 条本地数据不符合任务格式,启动时已被忽略。' : null
    };
  }

  function saveTasks(tasks) {
    try {
      global.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearTasks() {
    try {
      global.localStorage.removeItem(TASKS_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  function getRawTasks() {
    try { return global.localStorage.getItem(TASKS_KEY); } catch (e) { return null; }
  }

  /* 数据损坏时导出原始内容留证(纯文本) */
  function exportRaw() {
    var raw = getRawTasks();
    var blob = new Blob([raw === null ? '' : raw], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'zhixu-corrupted-data.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  /* 计划偏好:读取时逐字段校验,非法回退默认值 */
  function loadSettings() {
    var out = { planDays: DEFAULT_SETTINGS.planDays, dailyHours: DEFAULT_SETTINGS.dailyHours };
    try {
      var raw = global.localStorage.getItem(SETTINGS_KEY);
      if (!raw) return out;
      var s = JSON.parse(raw);
      if (s && typeof s === 'object') {
        if (Number.isInteger(s.planDays) && s.planDays >= 1 && s.planDays <= 60) out.planDays = s.planDays;
        var h = Number(s.dailyHours);
        if (isFinite(h) && h >= 0.5 && h <= 16) out.dailyHours = h;
      }
    } catch (e) { /* 设置损坏时静默回退默认值 */ }
    return out;
  }

  function saveSettings(settings) {
    try {
      global.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------- 备份:导出 / 导入校验 / 合并 ---------- */

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  /* 组装备份载荷(纯函数,便于单元测试) */
  function buildBackupPayload(tasks) {
    return {
      meta: {
        app: 'zhixu',
        version: 1,
        exportedAt: new Date().toISOString(),
        count: tasks.length
      },
      tasks: tasks
    };
  }

  /* 导出 JSON 备份文件;返回文件名 */
  function exportBackup(tasks) {
    var payload = buildBackupPayload(tasks);
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var d = new Date();
    var name = 'zhixu-backup-' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) +
      '-' + pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds()) + '.json';
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    return name;
  }

  /* 导入前校验。接受两种格式:
     1) 知序导出格式 { meta: { app: 'zhixu', ... }, tasks: [...] }
     2) 纯任务数组 [...](宽容兼容)
     meta 存在但 app 不是 zhixu 时拒绝。逐条校验,非法条目跳过并计数。 */
  function parseImport(text) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { ok: false, error: '文件内容不是合法的 JSON。' };
    }

    var tasksArr = null;
    var meta = null;
    if (Array.isArray(data)) {
      tasksArr = data;
    } else if (data && typeof data === 'object' && Array.isArray(data.tasks)) {
      if (data.meta && typeof data.meta === 'object') meta = data.meta;
      if (meta && meta.app && meta.app !== 'zhixu') {
        return { ok: false, error: '这不是「知序」导出的备份文件(识别到 app: ' + String(meta.app) + ')。' };
      }
      tasksArr = data.tasks;
    }
    if (!tasksArr) {
      return { ok: false, error: '文件中没有找到任务列表(需要 tasks 数组或任务数组)。' };
    }
    if (tasksArr.length === 0) {
      return { ok: false, error: '文件中的任务列表为空,没有可导入的内容。' };
    }

    var tasks = [];
    var skipped = 0;
    for (var i = 0; i < tasksArr.length; i++) {
      var t = validateTask(tasksArr[i]);
      if (t) tasks.push(t); else skipped++;
    }
    if (tasks.length === 0) {
      return { ok: false, error: '文件中的 ' + tasksArr.length + ' 条数据全部不符合任务格式。' };
    }
    return { ok: true, tasks: tasks, skipped: skipped };
  }

  /* 合并导入:按 id 去重;id 冲突时保留 updatedAt 较新的版本。
     返回 { tasks, added, replaced } */
  function mergeImport(current, incoming) {
    var map = {};
    var order = [];
    for (var i = 0; i < current.length; i++) {
      map[current[i].id] = current[i];
      order.push(current[i].id);
    }
    var added = 0;
    var replaced = 0;
    for (var j = 0; j < incoming.length; j++) {
      var t = incoming[j];
      if (!map[t.id]) {
        map[t.id] = t;
        order.push(t.id);
        added++;
      } else if (String(t.updatedAt || '') > String(map[t.id].updatedAt || '')) {
        map[t.id] = t;
        replaced++;
      }
    }
    var tasks = [];
    for (var k = 0; k < order.length; k++) tasks.push(map[order[k]]);
    return { tasks: tasks, added: added, replaced: replaced };
  }

  global.Storage = {
    TASKS_KEY: TASKS_KEY,
    SETTINGS_KEY: SETTINGS_KEY,
    isStorageAvailable: isStorageAvailable,
    validateTask: validateTask,
    loadTasks: loadTasks,
    saveTasks: saveTasks,
    clearTasks: clearTasks,
    getRawTasks: getRawTasks,
    exportRaw: exportRaw,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    buildBackupPayload: buildBackupPayload,
    exportBackup: exportBackup,
    parseImport: parseImport,
    mergeImport: mergeImport
  };
})(typeof window !== 'undefined' ? window : globalThis);
