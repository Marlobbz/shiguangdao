# 拾光岛 · Prompt 日志

> 记录"使用工具 — 我的 Prompt — AI 返回结果 — 我做的人工改动"四项,只记真实发生的内容。
> 「灯塔任务」模块复用自知序,其 Prompt 日志见 `docs/zhixu-module/prompt-log.md`。

## 条目 1

- **使用工具**:ZCode(GLM 模型)
- **我的 Prompt**:"现在我们进行一个微小的转变,可能涉及到整个项目的重构,我们将项目改为拾光岛……请输出:1. 产品需求与功能优先级;2. 页面路由及页面间跳转关系;3. 数据库表结构、字段、关系和索引(涉及前端建设调用 kill-ai-slop.skill);4. 访客、站长和私人日记的权限矩阵;5. 前后端架构及关键 API 设计;6. 七天开发顺序和每天的验收标准;7. 可能导致项目无法按时交付的技术风险;8. 本阶段需要我确认的关键决策。请明确区分必须实现、可选实现和暂不实现的功能。不要直接生成全部代码。"
- **AI 返回结果**:环境检查(Node 24.18 / npm 11.16 / git 2.54 未建仓 / 无拾光岛目录);调用 kill-ai-slop 技能并吸收其设计原则;输出完整阶段1设计文档存至 `docs/phase1-design.md` —— 产品定义"个人记忆小岛"(时间线日记 + 贝壳留言 + 私人日记,标注为待确认假设)、四张表结构与索引、权限矩阵(私人日记对访客 404 不泄露存在性)、Express+EJS+SQLite 架构、七天计划每日验收、六项风险与七项待确认决策。
- **我做的人工改动**:(由参赛学生填写)

## 条目 2

- **使用工具**:ZCode(GLM 模型);npm;git;GitHub CLI
- **我的 Prompt**:"复用知序,仅单站长,先本地方案,公网服务器我后会配置,版本管理使用git,同时上传github"
- **AI 返回结果**:确认决策并回写设计文档;执行 D1 项目搭建 —— `package.json`(express/ejs/better-sqlite3 三依赖,无构建)、`.gitignore`、`db/schema.sql` + `db/index.js`(WAL + 幂等建表)、`server.js`(Express 5 入口 + 404/500)、`routes/web.js`(时间线,真实 SQL 查询 + 按月分组)、EJS 模板(partials/timeline/error)、`public/css/base.css`(岛屿主题:暖沙纸面 + 深海蓝绿单主色,设计决策注释在文件头)、知序模块原样复用至 `public/planner/` 并挂载 `/planner/`、README、本项目双日志 + 知序模块档案归档 `docs/zhixu-module/`;验收通过后 git init 提交并创建 GitHub 仓库推送。
- **我做的人工改动**:(由参赛学生填写)

## 条目 3

- **使用工具**:ZCode(GLM 模型);npm test;curl;ZCode 内置浏览器(截图)
- **我的 Prompt**:"继续"(执行 D2:时间线 + 详情页)
- **AI 返回结果**:见 `docs/dev-log.md` 第 2 轮 —— 日记数据服务层(`services/diary.js`)、详情路由与视图(私人日记对访客 404 且不泄露存在性)、`scripts/seed.js` / `reset.js`、7 项服务层单元测试(全部通过)、curl 与截图验收。
- **我做的人工改动**:(由参赛学生填写)
