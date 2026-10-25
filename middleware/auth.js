/* 拾光岛 · 鉴权中间件 */
'use strict';

const { getSessionUser } = require('../services/auth');
const { parseCookies } = require('../lib/cookies');

/* 每个请求解析会话,把登录用户挂到 req.user 与 res.locals.user(模板可用) */
function loadUser(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  req.sessionToken = cookies.sid || null;
  req.user = getSessionUser(req.sessionToken);
  res.locals.user = req.user;
  next();
}

/* 写路由保护:未登录 302 到登录页并携带回跳地址 */
function requireAuth(req, res, next) {
  if (req.user) return next();
  const target = encodeURIComponent(req.originalUrl && req.originalUrl.startsWith('/') ? req.originalUrl : '/');
  res.redirect(`/login?next=${target}`);
}

module.exports = { loadUser, requireAuth };
