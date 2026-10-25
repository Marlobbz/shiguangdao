/* 拾光岛 · 写入演示数据(仅供开发与演示;演示前应向观众说明这不是真实记录)
 * 运行:npm run seed(会先清空日记与留言,再写入)
 * 日期全部相对"今天"生成,保证时间线分组与详情页随真实日期变化。 */
'use strict';

const { initDb, getDb } = require('../db');
const { todayStr } = require('../lib/date');

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const p = x => (x < 10 ? '0' + x : String(x));
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

initDb();

require('./reset'); // 先清空,保证种子可重复执行

const now = new Date().toISOString();

/* 发生日跨两个月,验证时间线分组;-1 天的为私人日记 */
const diaries = [
  {
    title: '开始经营这座小岛',
    content: '今天把小岛的骨架搭好了。\n接下来的计划:\n- 时间线\n- 贝壳留言\n- 灯塔任务\n慢慢来,不着急。',
    mood: 'sunny', entry_date: daysAgo(0), is_private: 0
  },
  {
    title: '线性代数期中结束',
    content: '考完出来,感觉第 3 章的行列式变换还是不熟。\n在灯塔任务里记一笔,下周复盘。',
    mood: 'windy', entry_date: daysAgo(2), is_private: 0
  },
  {
    title: '给妈妈打了电话',
    content: '聊了四十分钟,她说家里的桂花开了。\n忽然很想回去看看。',
    mood: 'sunny', entry_date: daysAgo(4), is_private: 0
  },
  {
    title: '只写给自己的一段话',
    content: '这一条是私人日记,用来测试权限:没有登录的访客不应该看到它。',
    mood: 'starry', entry_date: daysAgo(1), is_private: 1
  },
  {
    title: '下雨,泡了一天图书馆',
    content: '把操作系统实验报告写完了。\n雨声很吵,但效率意外地高。',
    mood: 'rainy', entry_date: daysAgo(9), is_private: 0
  },
  {
    title: '九月末的雾',
    content: '早八的路上全是雾,灯塔都看不清。\n捡了一片好看的落叶夹进书里。',
    mood: 'foggy', entry_date: daysAgo(35), is_private: 0
  }
];

const insert = getDb().prepare(`
  INSERT INTO diaries (title, content, mood, entry_date, is_private, photo_path, created_at, updated_at)
  VALUES (@title, @content, @mood, @entry_date, @is_private, NULL, @now, @now)
`);

getDb().transaction(() => {
  for (const d of diaries) insert.run({ ...d, now });
})();

const n = getDb().prepare('SELECT COUNT(*) AS c FROM diaries').get().c;
console.log(`已写入 ${n} 篇演示日记(含 ${diaries.filter(d => d.is_private).length} 篇私人日记),基准日:${todayStr()}。`);
console.log('提醒:这是演示数据,不是站长的真实记录。');
