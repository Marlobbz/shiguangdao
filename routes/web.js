/* 拾光岛 · 页面路由(D2:时间线 + 日记详情) */
'use strict';

const express = require('express');
const diaryService = require('../services/diary');
const authService = require('../services/auth');
const { MOODS } = require('./moods');
const { formatDateLong } = require('../lib/date');
const { sessionCookie, clearSessionCookie } = require('../lib/cookies');

const router = express.Router();

/* 回跳地址只接受站内相对路径,防开放重定向 */
function safeNext(v) {
  const s = typeof v === 'string' ? v : '';
  return s.startsWith('/') && !s.startsWith('//') ? s : '/';
}

/* 统一的 404 渲染(与全局 404 同一页面,不给探测者额外信息) */
function notFound(res) {
  res.status(404).render('error', {
    title: '404 · 拾光岛',
    code: '404',
    heading: '这片海域没有岛屿',
    message: '你要找的页面漂走了。回时间线继续游览吧。'
  });
}

/* 时间线(灯塔首页):访客只见公开日记;站长额外看到私人日记并带标记 */
router.get('/', (req, res) => {
  const rows = req.user ? diaryService.listAll(100) : diaryService.listPublic(100);
  res.render('timeline', {
    title: '拾光岛 · 时光时间线',
    groups: diaryService.groupByMonth(rows),
    isOwner: !!req.user
  });
});

/* 日记详情:公开任何人可看;私人日记仅站长可见,
   对其他所有人返回与"不存在"相同的 404,不泄露存在性。 */
router.get('/diary/:id', (req, res, next) => {
  const id = Number(req.params.id);
  let diary = null;
  try {
    diary = diaryService.getById(id);
  } catch (err) {
    return next(err);
  }
  if (!diary || (diary.is_private && !req.user)) return notFound(res);

  res.render('diary', {
    title: `${diary.title} · 拾光岛`,
    diary,
    dateLabel: formatDateLong(diary.entry_date),
    mood: MOODS[diary.mood] || MOODS.sunny
  });
});

/* ---------- 鉴权 ---------- */

/* 首次使用:还没有任何账号时引导创建站长;创建入口随后永久关闭 */
router.get('/setup', (req, res) => {
  if (authService.hasOwner()) return res.redirect('/login');
  res.render('setup', {
    title: '创建站长 · 拾光岛',
    errors: {},
    values: { username: '', displayName: '' }
  });
});

router.post('/setup', (req, res) => {
  if (authService.hasOwner()) return res.redirect('/login');

  const username = String(req.body.username || '').trim();
  const displayName = String(req.body.displayName || '').trim();
  const password = String(req.body.password || '');
  const confirm = String(req.body.confirm || '');

  const errors = {};
  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) errors.username = '用户名需为 3–30 位字母、数字或下划线。';
  if (!displayName || displayName.length > 20) errors.displayName = '展示名需为 1–20 字。';
  if (password.length < 8 || password.length > 72) errors.password = '密码需为 8–72 位。';
  else if (password !== confirm) errors.confirm = '两次输入的密码不一致。';

  if (Object.keys(errors).length > 0) {
    return res.status(422).render('setup', {
      title: '创建站长 · 拾光岛',
      errors,
      values: { username, displayName }
    });
  }

  const user = authService.createUser({ username, displayName, password });
  const session = authService.createSession(user.id);
  res.setHeader('Set-Cookie', sessionCookie(session.token, authService.SESSION_TTL_MS / 1000));
  res.redirect('/');
});

router.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('login', {
    title: '登录 · 拾光岛',
    error: null,
    values: { username: '' },
    next: safeNext(req.query.next)
  });
});

router.post('/login', (req, res) => {
  const nextUrl = safeNext(req.body.next);
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  const user = authService.verifyLogin(username, password);
  if (!user) {
    /* 统一文案,不区分"用户不存在"与"密码错误" */
    return res.status(401).render('login', {
      title: '登录 · 拾光岛',
      error: '用户名或密码不正确。',
      values: { username },
      next: nextUrl
    });
  }

  const session = authService.createSession(user.id);
  authService.purgeExpiredSessions();
  res.setHeader('Set-Cookie', sessionCookie(session.token, authService.SESSION_TTL_MS / 1000));
  res.redirect(nextUrl);
});

router.post('/logout', (req, res) => {
  if (req.sessionToken) authService.deleteSession(req.sessionToken);
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.redirect('/');
});

module.exports = router;
