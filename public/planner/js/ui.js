/* 知序 · UI 基础设施与渲染 */
(function (global) {
  'use strict';

  var document = global.document;

  /* ---------- DOM 工具 ---------- */

  /* 创建元素。attrs 支持 class / text / html(仅限代码内静态 SVG) /
     on*(事件) / data-* / aria-* 等标准属性。用户数据一律走 textContent。 */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'on' && v && typeof v === 'object') {
          for (var evt in v) node.addEventListener(evt, v[evt]);
        }
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    if (children) {
      for (var i = 0; i < children.length; i++) {
        if (children[i]) node.appendChild(children[i]);
      }
    }
    return node;
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* ---------- 静态 SVG 图标(stroke 继承文字颜色) ---------- */

  var ICONS = {
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M13.5 6.5l3 3"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6.5 7l1 12a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1l1-12"/><path d="M10 11v6M14 11v6"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    alert: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5"/><path d="M12 17.4v.1"/></svg>',
    overdue: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9.5V13l2.5 2"/><path d="M5.5 3.5 3 6M18.5 3.5 21 6"/></svg>',
    today: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 10h17"/><path d="M8 3v4M16 3v4"/><circle cx="12" cy="15.5" r="1.6"/></svg>',
    soon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2.5"/></svg>',
    normal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 10h17"/><path d="M8 3v4M16 3v4"/></svg>',
    download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11"/><path d="m7 10.5 5 5 5-5"/><path d="M4 20h16"/></svg>',
    upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4"/><path d="m7 8.5 5-5 5 5"/><path d="M4 20h16"/></svg>'
  };

  var STATUS_ICONS = {
    overdue: ICONS.overdue,
    today: ICONS.today,
    soon: ICONS.soon,
    normal: ICONS.normal,
    done: ICONS.check
  };

  /* ---------- 模态框(焦点管理) ---------- */

  var lastTrigger = null;

  function openModal(modal, focusEl) {
    lastTrigger = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('has-modal');
    var target = focusEl || modal.querySelector('input, select, textarea');
    if (!target) target = modal.querySelector('button');
    if (target) target.focus();
  }

  function closeModal(modal) {
    modal.hidden = true;
    if (!document.querySelector('.modal:not([hidden])')) {
      document.body.classList.remove('has-modal');
    }
    if (lastTrigger && document.contains(lastTrigger) && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
    }
    lastTrigger = null;
  }

  /* Tab 在弹窗内循环 */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var modal = document.querySelector('.modal:not([hidden])');
    if (!modal) return;
    var focusables = $all(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
      modal
    ).filter(function (n) { return n.offsetParent !== null; });
    if (!focusables.length) return;
    var first = focusables[0];
    var last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* Esc 关闭最上层弹窗 */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var modal = document.querySelector('.modal:not([hidden])');
    if (modal) closeModal(modal);
  });

  /* ---------- 通用确认弹窗 ---------- */

  var confirmCb = null;

  function confirmDialog(opts) {
    $('#confirm-title').textContent = opts.title;
    $('#confirm-message').textContent = opts.message;
    var okBtn = $('#confirm-ok');
    okBtn.textContent = opts.confirmText || '确定';
    okBtn.className = opts.danger ? 'btn btn--danger' : 'btn btn--primary';
    $('#confirm-cancel').textContent = opts.cancelText || '取消';
    confirmCb = opts.onConfirm || null;
    openModal($('#modal-confirm'), opts.danger ? $('#confirm-cancel') : okBtn);
  }

  $('#confirm-ok').addEventListener('click', function () {
    var cb = confirmCb;
    confirmCb = null;
    closeModal($('#modal-confirm'));
    if (cb) cb();
  });

  $('#confirm-cancel').addEventListener('click', function () {
    confirmCb = null;
    closeModal($('#modal-confirm'));
  });

  /* ---------- 轻提示 ---------- */

  var TOAST_ICONS = { success: ICONS.check, error: ICONS.alert, warning: ICONS.alert, info: ICONS.check };

  function toast(msg, type) {
    type = type || 'info';
    var region = $('#toast-region');
    var item = el('div', { class: 'toast toast--' + type }, [
      el('span', { class: 'toast__icon', html: TOAST_ICONS[type] || ICONS.info, 'aria-hidden': 'true' }),
      el('span', { text: msg })
    ]);
    region.appendChild(item);
    while (region.children.length > 4) region.removeChild(region.firstChild);
    setTimeout(function () { item.classList.add('toast--out'); }, 3000);
    setTimeout(function () {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, 3400);
  }

  /* ---------- 表单错误 ---------- */

  function setFieldError(input, errEl, msg) {
    errEl.textContent = msg || '';
    if (msg) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function showFieldErrors(map, errors) {
    for (var k in map) {
      setFieldError(map[k][0], map[k][1], errors[k] || '');
    }
  }

  function clearFieldErrors(form) {
    $all('.field__error', form).forEach(function (p) { p.textContent = ''; });
    $all('[aria-invalid]', form).forEach(function (n) { n.removeAttribute('aria-invalid'); });
  }

  /* ---------- 任务条目渲染 ---------- */

  function chipIcon(iconName) {
    return el('span', { class: 'chip__icon', html: STATUS_ICONS[iconName] || '', 'aria-hidden': 'true' });
  }

  function categoryChip(t) {
    return el('span', { class: 'chip', text: Domain.CATEGORY_LABELS[t.category] });
  }

  function priorityChip(t) {
    return el('span', { class: 'chip chip--p-' + t.priority, text: Domain.PRIORITY_LABELS[t.priority] });
  }

  function dueChip(t, today) {
    var status = Domain.getDueStatus(t, today);
    var parts;
    if (t.done) {
      parts = [chipIcon(status), el('span', { text: '已完成' })];
    } else {
      var diff = Domain.daysUntil(t.dueDate, today);
      var rel;
      if (diff < 0) rel = '已逾期 ' + (-diff) + ' 天';
      else if (diff === 0) rel = '今天截止';
      else if (diff === 1) rel = '明天截止';
      else rel = '剩 ' + diff + ' 天';
      parts = [
        chipIcon(status),
        el('span', { text: Domain.formatDateCN(t.dueDate, today) + ' · ' + rel })
      ];
    }
    return el('span', { class: 'chip chip--due chip--due-' + status }, parts);
  }

  function taskItem(t, today) {
    var check = el('input', {
      type: 'checkbox',
      class: 'task-check',
      'data-action': 'toggle'
    });
    check.checked = t.done;
    check.setAttribute('aria-label', '将「' + t.title + '」标记为' + (t.done ? '未完成' : '已完成'));

    var main = el('div', { class: 'task-main' }, [
      el('div', { class: 'task-title-row' }, [
        el('span', { class: 'task-title', text: t.title }),
        priorityChip(t)
      ]),
      t.note ? el('p', { class: 'task-note', text: t.note, title: t.note }) : null,
      el('div', { class: 'task-meta' }, [
        categoryChip(t),
        dueChip(t, today),
        el('span', { class: 'chip', text: '预计 ' + t.estimateHours + 'h' })
      ])
    ]);

    var actions = el('div', { class: 'task-actions' }, [
      el('button', {
        type: 'button', class: 'btn-icon', 'data-action': 'edit',
        'aria-label': '编辑「' + t.title + '」', html: ICONS.edit
      }),
      el('button', {
        type: 'button', class: 'btn-icon btn-icon--danger', 'data-action': 'delete',
        'aria-label': '删除「' + t.title + '」', html: ICONS.trash
      })
    ]);

    return el('li', {
      class: 'task-item' + (t.done ? ' task-item--done' : ''),
      'data-id': t.id
    }, [check, main, actions]);
  }

  function renderTaskList(tasks, today) {
    var list = $('#task-list');
    list.textContent = '';
    var frag = document.createDocumentFragment();
    for (var i = 0; i < tasks.length; i++) {
      frag.appendChild(taskItem(tasks[i], today));
    }
    list.appendChild(frag);
  }

  /* 列表空态:无任何任务 → 引导新增;有任务但筛不出 → 提示清除筛选 */
  function renderListState(totalCount, visibleCount) {
    var noTasks = $('#empty-no-tasks');
    var noResults = $('#empty-no-results');
    var action = document.querySelector('#task-empty .empty-state__action');
    var showEmpty = totalCount === 0 || visibleCount === 0;
    $('#task-empty').hidden = !showEmpty;
    if (noTasks) noTasks.hidden = totalCount !== 0;
    if (noResults) noResults.hidden = !(totalCount > 0 && visibleCount === 0);
    if (action) action.hidden = !(totalCount === 0);
    var countEl = $('#filter-count');
    if (countEl) {
      countEl.textContent = totalCount === 0 ? '' : ('共 ' + visibleCount + ' 项' + (visibleCount !== totalCount ? '(已筛选,全部 ' + totalCount + ' 项)' : ''));
    }
  }

  /* ---------- 顶部横幅(存储状态) ---------- */

  function renderBanner(kind, payload) {
    var region = $('#banner-region');
    if (!region) return;
    var b;
    if (kind === 'memory') {
      b = el('div', { class: 'banner banner--warning', role: 'alert' }, [
        el('span', { html: ICONS.alert, 'aria-hidden': 'true' }),
        el('div', { class: 'banner__body' }, [
          el('p', { class: 'banner__title', text: '浏览器存储不可用' }),
          el('p', { class: 'banner__text', text: payload })
        ])
      ]);
    } else if (kind === 'corrupted') {
      b = el('div', { class: 'banner banner--danger', role: 'alert' }, [
        el('span', { html: ICONS.alert, 'aria-hidden': 'true' }),
        el('div', { class: 'banner__body' }, [
          el('p', { class: 'banner__title', text: '本地数据损坏' }),
          el('p', { class: 'banner__text', text: payload.message }),
          el('div', { class: 'banner__actions' }, [
            el('button', {
              type: 'button', class: 'btn', text: '导出原始内容留证',
              on: { click: payload.onExportRaw }
            }),
            el('button', {
              type: 'button', class: 'btn btn--danger', text: '清空损坏数据并重新开始',
              on: { click: payload.onReset }
            })
          ])
        ])
      ]);
    } else if (kind === 'partial') {
      b = el('div', { class: 'banner banner--warning', role: 'status' }, [
        el('span', { html: ICONS.alert, 'aria-hidden': 'true' }),
        el('div', { class: 'banner__body' }, [
          el('p', { class: 'banner__text', text: payload.message }),
          el('div', { class: 'banner__actions' }, [
            el('button', {
              type: 'button', class: 'btn', text: '知道了',
              on: { click: function () { b.remove(); } }
            })
          ])
        ])
      ]);
    }
    if (b) region.appendChild(b);
  }

  /* ---------- 仪表盘统计条 ---------- */

  function renderStats(stats) {
    var set = function (id, val) { $(id).textContent = val; };
    set('#stat-total', String(stats.total));
    set('#stat-done', String(stats.done));
    set('#stat-todo', String(stats.todo));
    var overdueEl = $('#stat-overdue');
    overdueEl.textContent = String(stats.overdue);
    overdueEl.classList.toggle('is-nonzero', stats.overdue > 0);
    set('#stat-rate', stats.rate === null ? '—' : stats.rate + '%');
  }

  /* ---------- 学习计划渲染 ---------- */

  function renderPlan(result, params, today) {
    var out = $('#plan-output');
    out.textContent = '';

    if (result.error) {
      out.appendChild(el('p', { class: 'plan-error', role: 'alert', text: result.error }));
      return;
    }

    var D = Domain;

    /* 没有任何待完成任务(全部已完成,且没有周期外任务) */
    if (result.summary.scheduledCount === 0 && result.summary.totalNeed === 0 && result.excluded === 0) {
      out.appendChild(el('div', { class: 'plan-empty', text: '当前没有待完成的任务,去任务页添加一个吧。' }));
      return;
    }

    /* 汇总 */
    out.appendChild(el('div', { class: 'plan-summary' }, [
      el('span', { html: '需 <strong>' + result.summary.totalNeed + 'h</strong> / 容量 <strong>' + result.summary.totalCapacity + 'h</strong>(' + params.days + ' 天 × ' + params.dailyHours + 'h/天)' }),
      el('span', {
        class: result.summary.feasible ? 'chip chip--due-done' : 'chip chip--due-today',
        text: result.summary.feasible ? '全部任务可安排' : '部分任务无法按时完成'
      })
    ]));

    if (result.excluded > 0) {
      out.appendChild(el('p', {
        class: 'plan-note',
        text: '另有 ' + result.excluded + ' 项未完成任务的截止日期在计划周期之后,未纳入本次安排。'
      }));
    }

    /* 时间不足警告 */
    if (result.warnings.length > 0) {
      out.appendChild(el('div', { class: 'plan-warning', role: 'alert' }, [
        el('strong', { text: '有 ' + result.warnings.length + ' 项任务在计划周期内无法完成:' }),
        el('ul', {}, result.warnings.map(function (w) {
          return el('li', { text: w.message });
        }))
      ]));
    }

    /* 按日安排 */
    for (var d = 0; d < result.days.length; d++) {
      var day = result.days[d];
      var remaining = Math.round((day.capacity - day.used) * 100) / 100;
      var head = el('div', { class: 'plan-day__head' }, [
        el('span', { class: 'plan-day__date', text: D.formatDateCN(day.date, today) + ' ' + D.weekdayOf(day.date) }),
        el('span', { class: 'plan-day__load', text: '已安排 ' + day.used + 'h / ' + day.capacity + 'h' }),
        remaining < 0.01
          ? el('span', { class: 'plan-day__full', text: '当天已排满' })
          : el('span', { class: 'plan-day__load', text: '余 ' + remaining + 'h' })
      ]);

      var body = el('div', { class: 'plan-day__body' });
      if (day.blocks.length === 0) {
        body.appendChild(el('div', { class: 'plan-block plan-block--empty', text: '无安排' }));
      } else {
        for (var b = 0; b < day.blocks.length; b++) {
          var blk = day.blocks[b];
          body.appendChild(el('div', { class: 'plan-block' }, [
            el('span', { class: 'plan-block__hours', text: blk.hours + 'h' }),
            el('span', { text: blk.title })
          ]));
        }
      }
      out.appendChild(el('div', { class: 'plan-day' }, [head, body]));
    }

    /* 排序理由 */
    if (result.scheduled.length > 0) {
      out.appendChild(el('div', { class: 'plan-reasons' }, [
        el('h3', { text: '为什么这样安排?' }),
        el('ul', {}, result.scheduled.map(function (s) {
          return el('li', { text: '「' + s.title + '」:' + s.reason });
        }))
      ]));
    }
  }

  global.UI = {
    el: el,
    $: $,
    $all: $all,
    ICONS: ICONS,
    STATUS_ICONS: STATUS_ICONS,
    openModal: openModal,
    closeModal: closeModal,
    confirmDialog: confirmDialog,
    toast: toast,
    setFieldError: setFieldError,
    showFieldErrors: showFieldErrors,
    clearFieldErrors: clearFieldErrors,
    renderTaskList: renderTaskList,
    renderListState: renderListState,
    renderBanner: renderBanner,
    renderStats: renderStats,
    renderPlan: renderPlan
  };
})(typeof window !== 'undefined' ? window : globalThis);
