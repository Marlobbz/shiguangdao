/* 拾光岛 · 服务入口 */
'use strict';

const path = require('node:path');
const express = require('express');

const { initDb } = require('./db');
const webRoutes = require('./routes/web');
const { loadUser } = require('./middleware/auth');
const { MOODS } = require('./routes/moods');

const PORT = Number(process.env.PORT) || 3000;

function createApp() {
  initDb();

  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  /* 模板可用的全局量 */
  app.locals.MOODS = MOODS;

  app.use(express.urlencoded({ extended: false }));
  /* 静态资源不带 maxAge:浏览器经 ETag 协商缓存,改样式即时生效;公网可再按需加长缓存 */
  app.use(express.static(path.join(__dirname, 'public')));

  /* 会话与模板全局量 */
  app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
  });
  app.use(loadUser);

  app.use('/', webRoutes);

  /* 404 */
  app.use((req, res) => {
    res.status(404).render('error', {
      title: '404 · 拾光岛',
      code: '404',
      heading: '这片海域没有岛屿',
      message: '你要找的页面漂走了。回时间线继续游览吧。'
    });
  });

  /* 500 */
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[拾光岛] 未捕获异常:', err);
    if (res.headersSent) return next(err);
    res.status(500).render('error', {
      title: '500 · 拾光岛',
      code: '500',
      heading: '岛屿遇到了风暴',
      message: '服务器出了点问题,请稍后再试。'
    });
  });

  return app;
}

if (require.main === module) {
  createApp().listen(PORT, () => {
    console.log(`拾光岛已启航:http://localhost:${PORT}`);
  });
}

module.exports = { createApp, PORT };
