/* 拾光岛 · 清空演示数据(保留站长账号与会话)
 * 运行:npm run reset */
'use strict';

const { initDb, getDb } = require('../db');

initDb();
getDb().transaction(() => {
  getDb().prepare('DELETE FROM diaries').run();
  getDb().prepare('DELETE FROM guestbook').run();
})();
console.log('已清空日记与留言(站长账号保留)。');
