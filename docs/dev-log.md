# 拾光岛 · 开发日志(版本迭代记录)

> 每轮记录:使用工具、我的 Prompt、AI 返回结果、我做的人工修改。只记真实发生的内容。
> 「灯塔任务」模块(public/planner/)复用自知序项目,其完整开发档案见 `docs/zhixu-module/`。

## 第 1 轮 · 2026-10-25 · 阶段1 设计 + D1 项目搭建(v0.1)

- **使用工具**:ZCode(GLM);Node v24.18.0 / npm 11.16.0;Git 2.54;GitHub CLI(账号 Marlobbz)。
- **我的 Prompt**:①"项目改为拾光岛,输出阶段1的 8 项设计,涉及前端建设调用 kill-ai-slop";②决策确认:"复用知序,仅单站长,先本地方案,公网服务器我后会配置,版本管理使用 git,同时上传 github"。
- **AI 返回结果**:阶段1设计文档(`docs/phase1-design.md`:需求优先级、路由、数据库表结构与索引、访客/站长/私人日记权限矩阵、架构与 API、七天计划与每日验收、风险、决策点);D1 完成项目搭建 —— Express 5 + EJS + better-sqlite3 12 骨架、四张表幂等建表(users/diaries/guestbook/sessions + 3 个索引)、时间线首页(真实查询 + 按月分组 + 空状态)、404/500 错误页、岛屿主题基础样式(设计决策注释在 base.css 头部)、知序模块整体复用至 `public/planner/` 并挂载于 `/planner/`、README 与双日志。
- **环境实测**:npm install 成功(better-sqlite3 在 Node 24 直接可用,无需编译兜底);`npm start` 启动后 `/`、`/planner/`、404 兜底均返回正确内容;`data/shiguangdao.db` 自动创建且五张表齐全;控制台无报错。
- **我做的人工修改**:(由参赛学生填写)
- **版本**:git 提交 + 标签 v0.1,推送到 GitHub(Marlobbz/shiguangdao)。

## 第 2 轮 · 2026-10-25 · D2 时间线 + 详情页(v0.2)

- **使用工具**:ZCode(GLM);npm test;curl 验收;ZCode 内置浏览器截图。
- **我的 Prompt**:"继续"(执行 D2)。
- **AI 返回结果**:新增 `services/diary.js`(listPublic/getById/groupByMonth,diaries 唯一读写入口)、`lib/date.js`、详情路由与 `views/diary.ejs`、`public/css/base.css` 详情样式、`scripts/seed.js`(6 篇演示日记,相对今天生成,跨月分组,1 篇私人)、`scripts/reset.js`、`tests/services.test.js`(7 项,临时库不碰开发数据);`db/index.js` 支持 `SGD_DB` 环境变量覆盖路径;README 更新。
- **实测**:`npm test` 7/7 通过;种子后时间线正确渲染 10 月/9 月两组、私人日记标题未出现在页面(其发生日 10-24 在列表中正确空缺);公开详情 200 且换行保留;私人详情、不存在 id、非法 id(`abc`)均返回同一 404 页,不泄露存在性;截图人工审阅时间线与详情页视觉正常;服务器日志无报错。
- **我做的人工修改**:(由参赛学生填写)
- **版本**:v0.2(已推送 GitHub)。

## 七天计划对照

| 天 | 计划 | 状态 |
|---|---|---|
| D1 | 项目搭建 | ✅ v0.1 |
| D2 | 时间线 + 详情(含私人日记排除) | ✅ v0.2 |
| D3 | 鉴权(登录/会话/路由保护) | 待开始 |
| D4 | 日记 CRUD | 待开始 |
| D5 | 贝壳留言板 | 待开始 |
| D6 | 视觉与体验(kill-ai-slop 扫描、响应式) | 待开始 |
| D7 | 测试交付 | 待开始 |
