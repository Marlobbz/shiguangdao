/* 知序 · 学习计划生成
   算法:按"可行性窗口末端"的 EDF(最早截止优先)贪心 + 0.5h 粒度跨日拆分。
   - 每个任务的可用窗口:第 1 天 至 其截止日对应的日期;已逾期任务的窗口为整个周期
     (截止日已过,可在任意一天补),但排序靠窗口末端决定谁先用容量。
   - 因此"今天截止"的任务最先占用第 1 天容量,避免被逾期任务挤占;
     逾期任务利用剩余容量尽早补上。
   - 每条安排附带可解释的理由;容量不足时给出明确警告,绝不静默丢弃。
   纯函数,不依赖 DOM 与存储,可在 Node 中单元测试。 */
(function (global) {
  'use strict';

  var EPS = 0.001;

  function round2(x) { return Math.round(x * 100) / 100; }

  /* tasks: Task[];opts: { startDate, days, dailyHours };today: 'YYYY-MM-DD'
     返回 { error } 或:
     {
       days:      [{ date, capacity, used, blocks: [{ taskId, title, hours }] }],
       scheduled: [{ taskId, title, startDay, endDay, hours, reason }],
       warnings:  [{ taskId, title, type: 'overdue'|'infeasible', need, message }],
       excluded:  未纳入计划的周期外任务数,
       summary:   { totalNeed, totalCapacity, feasible, scheduledCount }
     } */
  function generatePlan(tasks, opts, today) {
    var D = global.Domain;
    var days = opts.days;
    var dailyHours = round2(Number(opts.dailyHours));
    var startDate = opts.startDate || today;

    if (!Number.isInteger(days) || days < 1 || days > 60) {
      return { error: '计划周期需为 1–60 的整数天。' };
    }
    if (!isFinite(dailyHours) || dailyHours < 0.5 || dailyHours > 16) {
      return { error: '每日可用时间需在 0.5–16 小时之间。' };
    }

    var dayList = [];
    for (var d = 0; d < days; d++) {
      dayList.push({
        date: D.addDays(startDate, d),
        capacity: dailyHours,
        used: 0,
        blocks: []
      });
    }

    /* 1. 候选任务:未完成且截止日在计划周期内(或已逾期);
          截止在周期之后的任务不纳入,单独计数并如实说明。 */
    var candidates = [];
    var excluded = 0;
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      if (t.done) continue;
      var diff = D.daysUntil(t.dueDate, today);
      if (diff >= days) { excluded++; continue; }

      /* 可行性窗口末端:截止日(含)之前;已逾期任务窗口为整个周期 */
      var windowEnd = -1;
      for (var di = 0; di < dayList.length; di++) {
        if (dayList[di].date <= t.dueDate) windowEnd = di;
        else break;
      }
      if (windowEnd < 0) windowEnd = days - 1;

      candidates.push({ task: t, dueDiff: diff, windowEnd: windowEnd });
    }

    /* 2. 排序(决定谁先用容量):
          窗口末端早的在前 → 逾期的在前 → 优先级高的在前 → 耗时大的在前 → 创建早的在前 */
    candidates.sort(function (a, b) {
      if (a.windowEnd !== b.windowEnd) return a.windowEnd - b.windowEnd;
      if (a.dueDiff !== b.dueDiff) return a.dueDiff - b.dueDiff;
      var wa = D.PRIORITY_WEIGHT[a.task.priority], wb = D.PRIORITY_WEIGHT[b.task.priority];
      if (wa !== wb) return wb - wa;
      if (a.task.estimateHours !== b.task.estimateHours) return b.task.estimateHours - a.task.estimateHours;
      return a.task.createdAt < b.task.createdAt ? -1 : 1;
    });

    var scheduled = [];
    var warnings = [];
    var totalNeed = 0;

    /* 3. 依次装填:从第 1 天起按 0.5h 粒度填入窗口内的剩余容量,任务可跨日拆分 */
    for (var c = 0; c < candidates.length; c++) {
      var cand = candidates[c];
      var task = cand.task;
      totalNeed += task.estimateHours;

      var need = task.estimateHours;
      var firstIdx = -1;
      var lastFillIdx = -1;
      for (var di2 = 0; di2 <= cand.windowEnd && need > EPS; di2++) {
        var day = dayList[di2];
        var free = round2(day.capacity - day.used);
        if (free < EPS) continue;
        var take = Math.min(free, need);
        day.blocks.push({ taskId: task.id, title: task.title, hours: take });
        day.used = round2(day.used + take);
        need = round2(need - take);
        if (firstIdx < 0) firstIdx = di2;
        lastFillIdx = di2;
      }

      var scheduledHours = round2(task.estimateHours - Math.max(need, 0));

      /* 4. 容量不足:明确警告,列出缺口,不静默丢弃 */
      if (need > EPS) {
        warnings.push({
          taskId: task.id,
          title: task.title,
          type: cand.dueDiff < 0 ? 'overdue' : 'infeasible',
          need: need,
          message: '「' + task.title + '」预计 ' + task.estimateHours + 'h,截止前只能安排 ' +
            scheduledHours + 'h,还缺 ' + need + 'h' +
            (cand.dueDiff < 0
              ? '(该任务已逾期,建议尽快补上,或考虑调整截止日期)。'
              : '。可以尝试增加每日可用时间、延长计划周期,或拆分该任务。')
        });
      }

      /* 5. 生成可解释的理由 */
      if (firstIdx >= 0) {
        var reason;
        if (cand.dueDiff < 0) {
          reason = '已逾期 ' + (-cand.dueDiff) + ' 天,利用剩余容量尽早补上';
        } else if (cand.dueDiff === 0) {
          reason = '今天截止,优先占用今天的可用时间';
        } else {
          reason = '截止 ' + D.formatDateCN(task.dueDate, today) + '(' + D.remainingText(task, today) + ')' +
            ',' + D.PRIORITY_LABELS[task.priority] + ',须在第 ' + (cand.windowEnd + 1) + ' 天前完成';
        }
        var span = lastFillIdx - firstIdx + 1;
        var arrange = span === 1
          ? '安排在第 ' + (firstIdx + 1) + ' 天'
          : '安排在第 ' + (firstIdx + 1) + '–' + (lastFillIdx + 1) + ' 天,每天约 ' + round2(scheduledHours / span) + 'h';
        if (need > EPS) {
          arrange += ';因时间不足,尚有 ' + need + 'h 未排入';
        }
        reason += ',共 ' + scheduledHours + 'h → ' + arrange;

        scheduled.push({
          taskId: task.id,
          title: task.title,
          startDay: firstIdx,
          endDay: lastFillIdx,
          hours: scheduledHours,
          reason: reason
        });
      }
    }

    return {
      days: dayList,
      scheduled: scheduled,
      warnings: warnings,
      excluded: excluded,
      summary: {
        totalNeed: round2(totalNeed),
        totalCapacity: round2(days * dailyHours),
        feasible: warnings.length === 0,
        scheduledCount: scheduled.length
      }
    };
  }

  global.Planner = { generatePlan: generatePlan };
})(typeof window !== 'undefined' ? window : globalThis);
