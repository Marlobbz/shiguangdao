/* 拾光岛 · 页面路由(D2:时间线 + 日记详情) */
'use strict';

const express = require('express');
const diaryService = require('../services/diary');
const { MOODS } = require('./moods');
const { formatDateLong } = require('../lib/date');

const router = express.Router();

/* 统一的 404 渲染(与全局 404 同一页面,不给探测者额外信息) */
function notFound(res) {
  res.status(404).render('error', {
    title: '404 · 拾光岛',
    code: '404',
    heading: '这片海域没有岛屿',
    message: '你要找的页面漂走了。回时间线继续游览吧。'
  });
}

/* 时间线(灯塔首页):公开日记按发生日期倒序,按月分组 */
router.get('/', (req, res) => {
  const rows = diaryService.listPublic(100);
  res.render('timeline', { title: '拾光岛 · 时光时间线', groups: diaryService.groupByMonth(rows) });
});

/* 日记详情:公开任何人可看;私人日记对未登录访客与"不存在"同样返回 404,不泄露存在性。
   D3 上线会话后,站长本人可查看私人日记。 */
router.get('/diary/:id', (req, res, next) => {
  const id = Number(req.params.id);
  let diary = null;
  try {
    diary = diaryService.getById(id);
  } catch (err) {
    return next(err);
  }
  if (!diary || diary.is_private) return notFound(res);

  res.render('diary', {
    title: `${diary.title} · 拾光岛`,
    diary,
    dateLabel: formatDateLong(diary.entry_date),
    mood: MOODS[diary.mood] || MOODS.sunny
  });
});

module.exports = router;
