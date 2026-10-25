/* 知序 · 应用入口:状态管理与事件绑定 */
(function (global) {
  'use strict';

  var document = global.document;
  var D = global.Domain, S = global.Storage, U = global.UI;
  var $ = U.$, $all = U.$all;

  var state = {
    tasks: [],
    mode: 'storage',
    editingId: null,
    filters: { status: 'all', category: 'all', keyword: '' }
  };

  /* ---------- 持久化 ---------- */

  function persist() {
    if (state.mode !== 'storage') return;
    if (!S.saveTasks(state.tasks)) {
      U.toast('保存失败:浏览器存储不可用或已满,本次更改仅在当前页面生效。', 'error');
    }
  }

  function findTask(id) {
    for (var i = 0; i < state.tasks.length; i++) {
      if (state.tasks[i].id === id) return state.tasks[i];
    }
    return null;
  }

  /* ---------- 渲染 ---------- */

  function renderStats() {
    U.renderStats(D.computeStats(state.tasks, D.todayStr()));
  }

  function renderAll() {
    var today = D.todayStr();
    var visible = D.sortTasks(D.filterTasks(state.tasks, state.filters, today), today);
    U.renderTaskList(visible, today);
    U.renderListState(state.tasks.length, visible.length);
    renderStats();
  }

  /* ---------- 筛选 ---------- */

  function clearFilters() {
    state.filters = { status: 'all', category: 'all', keyword: '' };
    $('#filter-status').value = 'all';
    $('#filter-category').value = 'all';
    $('#filter-keyword').value = '';
    renderAll();
  }

  function syncClearButton() {
    var active = state.filters.status !== 'all' || state.filters.category !== 'all' || state.filters.keyword.trim() !== '';
    $('#btn-clear-filters').hidden = !active;
  }

  function bindFilterEvents() {
    $('#filter-status').addEventListener('change', function () {
      state.filters.status = this.value;
      syncClearButton();
      renderAll();
    });
    $('#filter-category').addEventListener('change', function () {
      state.filters.category = this.value;
      syncClearButton();
      renderAll();
    });
    var kwTimer = null;
    $('#filter-keyword').addEventListener('input', function () {
      clearTimeout(kwTimer);
      var value = this.value;
      kwTimer = setTimeout(function () {
        state.filters.keyword = value;
        syncClearButton();
        renderAll();
      }, 200);
    });
    $('#btn-clear-filters').addEventListener('click', clearFilters);
    var clearEmpty = $('#btn-clear-filters-empty');
    if (clearEmpty) clearEmpty.addEventListener('click', clearFilters);
  }

  /* ---------- 视图切换 ---------- */

  function switchView(name) {
    $all('.nav-btn').forEach(function (b) {
      var active = b.getAttribute('data-view') === name;
      b.classList.toggle('is-active', active);
      if (active) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    $all('.view').forEach(function (v) {
      v.hidden = v.id !== 'view-' + name;
    });
    if (name === 'data') renderDataStatus();
  }

  function bindNavEvents() {
    $all('.nav-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        switchView(b.getAttribute('data-view'));
      });
    });
  }

  /* ---------- 学习计划 ---------- */

  function handleGeneratePlan(e) {
    e.preventDefault();
    var days = parseInt($('#plan-days').value, 10);
    var hours = Number($('#plan-hours').value);
    var today = D.todayStr();

    var result = Planner.generatePlan(state.tasks, {
      startDate: today,
      days: days,
      dailyHours: hours
    }, today);

    if (!result.error) {
      S.saveSettings({ planDays: days, dailyHours: hours });
    }
    U.renderPlan(result, { days: days, dailyHours: hours }, today);
  }

  function bindPlanEvents() {
    $('#plan-form').addEventListener('submit', handleGeneratePlan);
    var settings = S.loadSettings();
    $('#plan-days').value = settings.planDays;
    $('#plan-hours').value = settings.dailyHours;
  }

  /* ---------- 数据管理 ---------- */

  function renderDataStatus() {
    var box = $('#storage-status');
    if (!box) return;
    box.textContent = '';
    var available = S.isStorageAvailable();
    var items = [
      ['存储状态', available ? '可用(localStorage)' : '不可用(当前为内存模式,数据关闭页面后丢失)'],
      ['当前任务数', String(state.tasks.length)],
      ['数据键名', S.TASKS_KEY]
    ];
    items.forEach(function (pair) {
      box.appendChild(U.el('dt', { text: pair[0] }));
      box.appendChild(U.el('dd', { text: pair[1] }));
    });
  }

  function handleExport() {
    if (state.tasks.length === 0) {
      U.confirmDialog({
        title: '导出空备份',
        message: '当前没有任务,导出的备份文件将不含任何任务。仍要导出吗?',
        confirmText: '仍要导出',
        onConfirm: doExport
      });
      return;
    }
    doExport();
  }

  function doExport() {
    var name = S.exportBackup(state.tasks);
    U.toast('已导出 ' + state.tasks.length + ' 项任务到 ' + name, 'success');
  }

  var importPending = null;

  function handleImportText(text) {
    var res = S.parseImport(text);
    if (!res.ok) {
      U.toast('导入失败:' + res.error, 'error');
      return;
    }
    importPending = res;
    $('#import-info').textContent =
      '该文件包含 ' + res.tasks.length + ' 项有效任务' +
      (res.skipped > 0 ? '(另有 ' + res.skipped + ' 项不合法数据将被跳过)' : '') +
      '。请选择导入方式:';
    U.openModal($('#modal-import'), $('#btn-import-merge'));
  }

  function runMergeImport() {
    if (!importPending) return;
    var r = S.mergeImport(state.tasks, importPending.tasks);
    state.tasks = r.tasks;
    persist();
    importPending = null;
    U.closeModal($('#modal-import'));
    renderAll();
    renderDataStatus();
    U.toast('合并导入完成:新增 ' + r.added + ' 项,更新 ' + r.replaced + ' 项', 'success');
  }

  function runOverwriteImport() {
    if (!importPending) return;
    var incoming = importPending.tasks;
    U.confirmDialog({
      title: '覆盖导入',
      message: '将清空当前全部 ' + state.tasks.length + ' 项任务,替换为备份中的 ' + incoming.length + ' 项。此操作不可恢复,确定继续吗?',
      confirmText: '清空并导入',
      danger: true,
      onConfirm: function () {
        state.tasks = incoming;
        persist();
        importPending = null;
        renderAll();
        renderDataStatus();
        U.toast('覆盖导入完成:当前共 ' + state.tasks.length + ' 项任务', 'success');
      }
    });
  }

  function handleImportFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      handleImportText(String(reader.result));
    };
    reader.onerror = function () {
      U.toast('读取文件失败,请重试。', 'error');
    };
    reader.readAsText(file);
  }

  function handleClearAll() {
    U.confirmDialog({
      title: '清空全部数据',
      message: '将删除本浏览器中保存的全部 ' + state.tasks.length + ' 项任务。此操作不可恢复,建议先导出备份。',
      confirmText: '清空全部数据',
      danger: true,
      onConfirm: function () {
        state.tasks = [];
        persist();
        renderAll();
        renderDataStatus();
        U.toast('已清空全部任务数据', 'success');
      }
    });
  }

  function bindDataEvents() {
    $('#btn-export').addEventListener('click', handleExport);
    $('#btn-import').addEventListener('click', function () {
      $('#import-file').click();
    });
    $('#import-file').addEventListener('change', function () {
      var file = this.files && this.files[0];
      this.value = '';
      handleImportFile(file);
    });
    $('#btn-import-merge').addEventListener('click', runMergeImport);
    $('#btn-import-overwrite').addEventListener('click', runOverwriteImport);
    $('#btn-clear-all').addEventListener('click', handleClearAll);
  }

  /* ---------- 任务表单 ---------- */

  function validateForm() {
    var errors = {};

    var title = $('#f-title').value.trim();
    if (!title) errors.title = '请填写任务标题';
    else if (title.length > 100) errors.title = '标题不能超过 100 字';

    var due = $('#f-due').value;
    if (!due) errors.due = '请选择截止日期';
    else if (!D.isValidDateStr(due)) errors.due = '截止日期格式不正确';

    var est = $('#f-estimate').value;
    if (est === '') {
      errors.estimate = '请填写预计耗时';
    } else {
      var n = Number(est);
      if (!isFinite(n) || n < 0.5 || n > 99) errors.estimate = '预计耗时需在 0.5–99 小时之间';
      else if (Math.abs(n * 2 - Math.round(n * 2)) > 1e-9) errors.estimate = '预计耗时需为 0.5 的整数倍';
    }
    return errors;
  }

  function handleTaskSubmit(e) {
    e.preventDefault();
    var errors = validateForm();
    U.showFieldErrors({
      title: [$('#f-title'), $('#err-title')],
      due: [$('#f-due'), $('#err-due')],
      estimate: [$('#f-estimate'), $('#err-estimate')]
    }, errors);

    if (Object.keys(errors).length) {
      var first = errors.title ? $('#f-title') : errors.due ? $('#f-due') : $('#f-estimate');
      first.focus();
      return;
    }

    var now = new Date().toISOString();
    var raw = {
      title: $('#f-title').value,
      category: $('#f-category').value,
      dueDate: $('#f-due').value,
      priority: $('#f-priority').value,
      estimateHours: Number($('#f-estimate').value),
      note: $('#f-note').value
    };

    if (state.editingId) {
      var existing = findTask(state.editingId);
      if (!existing) { U.closeModal($('#modal-task')); return; }
      var updated = S.validateTask(raw, existing);
      updated.updatedAt = now;
      state.tasks = state.tasks.map(function (t) {
        return t.id === existing.id ? updated : t;
      });
      U.toast('已保存修改', 'success');
    } else {
      var t = S.validateTask(raw);
      t.createdAt = now;
      t.updatedAt = now;
      state.tasks.push(t);
      U.toast('已添加「' + t.title + '」', 'success');
    }

    persist();
    U.closeModal($('#modal-task'));
    renderAll();
  }

  function openAddModal() {
    state.editingId = null;
    $('#task-modal-title').textContent = '新增任务';
    $('#task-form').reset();
    U.clearFieldErrors($('#task-form'));
    U.openModal($('#modal-task'), $('#f-title'));
  }

  function openEditModal(task) {
    state.editingId = task.id;
    $('#task-modal-title').textContent = '编辑任务';
    $('#f-title').value = task.title;
    $('#f-category').value = task.category;
    $('#f-due').value = task.dueDate;
    $('#f-priority').value = task.priority;
    $('#f-estimate').value = task.estimateHours;
    $('#f-note').value = task.note;
    U.clearFieldErrors($('#task-form'));
    U.openModal($('#modal-task'), $('#f-title'));
  }

  function handleDelete(task) {
    U.confirmDialog({
      title: '删除任务',
      message: '确定删除「' + task.title + '」吗?删除后不可恢复。',
      confirmText: '删除',
      danger: true,
      onConfirm: function () {
        state.tasks = state.tasks.filter(function (t) { return t.id !== task.id; });
        persist();
        renderAll();
        U.toast('已删除「' + task.title + '」', 'success');
      }
    });
  }

  /* ---------- 列表事件(事件委托) ---------- */

  function bindTaskListEvents() {
    var list = $('#task-list');

    list.addEventListener('change', function (e) {
      if (!e.target.classList.contains('task-check')) return;
      var itemEl = e.target.closest('.task-item');
      var task = itemEl && findTask(itemEl.getAttribute('data-id'));
      if (!task) return;
      task.done = e.target.checked;
      task.updatedAt = new Date().toISOString();
      persist();
      renderAll();
    });

    list.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-action]');
      if (!btn) return;
      var itemEl = e.target.closest('.task-item');
      var task = itemEl && findTask(itemEl.getAttribute('data-id'));
      if (!task) return;
      if (btn.getAttribute('data-action') === 'edit') openEditModal(task);
      else if (btn.getAttribute('data-action') === 'delete') handleDelete(task);
    });
  }

  /* ---------- 初始化 ---------- */

  function init() {
    var loaded = S.loadTasks();
    state.tasks = loaded.tasks;
    state.mode = loaded.mode;

    if (loaded.corrupted) {
      U.renderBanner('corrupted', {
        message: loaded.warning,
        onExportRaw: function () { S.exportRaw(); },
        onReset: function () {
          U.confirmDialog({
            title: '清空损坏数据',
            message: '将删除本地已损坏的数据并重新开始。此操作不可恢复,建议先导出原始内容留证。',
            confirmText: '清空并重新开始',
            danger: true,
            onConfirm: function () {
              S.clearTasks();
              global.location.reload();
            }
          });
        }
      });
    } else if (loaded.warning) {
      U.renderBanner('partial', { message: loaded.warning });
    }

    $('#btn-add').addEventListener('click', openAddModal);
    var addEmpty = $('#btn-add-empty');
    if (addEmpty) addEmpty.addEventListener('click', openAddModal);
    $('#task-form').addEventListener('submit', handleTaskSubmit);
    bindTaskListEvents();
    bindFilterEvents();
    bindNavEvents();
    bindPlanEvents();
    bindDataEvents();

    $all('.modal [data-close-modal]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        U.closeModal(btn.closest('.modal'));
      });
    });

    renderAll();
    syncClearButton();
  }

  document.addEventListener('DOMContentLoaded', init);
})(typeof window !== 'undefined' ? window : globalThis);
