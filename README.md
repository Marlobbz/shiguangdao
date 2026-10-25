# 拾光岛

把时光拾进小岛 —— 站长的个人记忆小岛:时光时间线(公开/私人日记)、贝壳留言板,以及内嵌的「灯塔任务」学习任务规划模块(复用自知序,见 `public/planner/`)。

首届"智核杯"AI 创作大赛 · 赛道二(AI 网站创作)作品。

> 进度:v0.1(D1 项目搭建完成)。功能按七天计划逐步交付,见 `docs/phase1-design.md` §6。

## 运行(本地)

要求:Node.js ≥ 18(开发环境为 24),npm。

```bash
npm install     # 首次
npm start       # http://localhost:3000
```

无构建步骤。数据保存在本机 `data/shiguangdao.db`(SQLite,自动创建,已在 .gitignore 中排除)。

## 目录结构

```
shiguangdao/
├── server.js            服务入口(Express)
├── routes/web.js        页面路由(D1:时间线)
├── routes/moods.js      心情枚举(事实来源)
├── db/schema.sql        SQLite 表结构(幂等建表)
├── db/index.js          连接与初始化
├── views/               EJS 模板(partials + timeline + error)
├── public/
│   ├── css/base.css     岛屿主题基础样式
│   └── planner/         「灯塔任务」模块 = 知序 v1.0 原样复用(含独立说明)
└── docs/
    ├── phase1-design.md 阶段1设计(含已确认决策)
    ├── dev-log.md       开发日志(本项目)
    ├── prompt-log.md    Prompt 日志(本项目)
    └── zhixu-module/    被复用模块的开发档案(溯源用)
```

## 页面

- `/` 时光时间线:公开日记按发生日期倒序、按月分组(当前为空状态,日记功能在 D2-D4 交付)
- `/planner/` 灯塔任务:完整的学习任务规划工具(独立 localStorage 存储)

## 部署到公网(后续配置)

代码已按部署友好方式准备,届时需要:

1. 一台能跑 Node.js ≥ 18 的服务器;
2. 环境变量:`PORT`(默认 3000)、`SESSION_SECRET`(D3 上线会话后必需,用于签名 Cookie);
3. 持久化:确保 `data/` 目录在部署机上有写权限且有备份(数据库即文件,直接备份该目录即可);
4. 反向代理:Nginx/Caddy 反代到 `PORT`,由代理层终止 HTTPS;
5. 进程守护:pm2 或 systemd 任一。

## 开发约定

- 阶段与验收:见 `docs/phase1-design.md`;
- 过程记录:每轮开发更新 `docs/dev-log.md` 与 `docs/prompt-log.md`(工具 / Prompt / AI 返回 / 人工修改,只记真实发生的内容);
- 版本:git 提交 + `v0.x` 标签。
