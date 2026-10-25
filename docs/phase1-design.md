# 拾光岛 · 阶段1 设计文档

- 版本:v0.1-design(2026-10-25,同日确认)
- 状态:**已确认** ✓(2026-10-25)
- 定位:站长的个人记忆小岛 —— 用时间线记录日记与心情,访客可登岛浏览、留下贝壳留言;私人日记仅站长可见
- 技术栈:Node.js 24 + Express 5 + EJS 服务端渲染 + SQLite(better-sqlite3);零构建、最少依赖

## 已确认决策(2026-10-25)

1. **产品设定**:按本方案执行("个人记忆小岛")。
2. **复用知序**:知序应用原样复用为「灯塔任务」模块,位于 `public/planner/`,挂载 `/planner/`,功能与存储(localStorage)独立;其开发档案归档于 `docs/zhixu-module/`。
3. **账号体系**:仅单站长,访客不注册。
4. **照片上传**:P1(纯文本日记保底)。
5. **部署**:先本地运行;公网服务器由参赛学生后续自行配置(README 已预留部署章节:PORT/SESSION_SECRET 环境变量、data/ 备份、反代与进程守护)。
6. **版本管理**:git 仓库(本目录)+ GitHub 远程(Marlobbz/shiguangdao),提交打 `v0.x` 标签。

---

## 1. 产品需求与功能优先级

### 必须(P0,七天内交付并演示)
| 编号 | 功能 | 说明 |
|---|---|---|
| P0-1 | 站长登录 | 单账号;密码 scrypt 哈希;session 持久化(重启不失效);错误提示 |
| P0-2 | 日记 CRUD | 标题/正文/心情(岛屿主题枚举:晴·雨·风·星·雾)/发生日期/公开-私人;服务端校验;删除需确认 |
| P0-3 | 时间线首页 | 公开日记按发生日期倒序、按月份分组;空状态 |
| P0-4 | 日记详情 | 公开任何人可看;私人非站长不可见(404,不泄露存在性) |
| P0-5 | 贝壳留言板 | 访客免注册留言(昵称+内容);站长可删除 |
| P0-6 | SQLite 持久化 | 单文件数据库;幂等建表;刷新/重启数据保留 |
| P0-7 | 权限控制 | 所有写路由服务端强制鉴权(见 §4) |
| P0-8 | 基础体验 | 404/500 错误页、表单错误回显、移动端可用(375px 无横向溢出)、控制台零报错 |

### 可选(P1,时间允许)
- 照片上传(单图,≤5MB,仅 image/*,随机文件名;**日记先保证纯文本可交付**)
- 关于小岛页(站长自述)
- 留言频率限制(同 IP 每分钟 ≤5 条)、登录失败延迟
- 简单搜索(LIKE 标题/正文)
- 真实访问计数(不做假数据)

### 暂不(P2,明确不做)
- 访客注册/多用户、评论回复与点赞、富文本编辑器、Markdown、RSS、音乐/天气挂件、复杂岛屿动画、部署公网(除非另行确认)

## 2. 页面路由及跳转关系

服务端渲染(EJS)为主,少量原生 JS 增强(确认弹层、字符计数);无前端框架、无构建。

| 路由 | 方法 | 权限 | 说明 |
|---|---|---|---|
| `/` | GET | 公开 | 时间线(岛屿首页) |
| `/diary/new` | GET / POST | 站长 | 新建;GET 未登录→302 `/login?next=…` |
| `/diary/:id` | GET | 公开/站长 | 详情;私人日记对访客 404 |
| `/diary/:id/edit` | GET / POST | 站长 | 编辑 |
| `/diary/:id/delete` | POST | 站长 | 删除(表单提交,前端确认弹层) |
| `/login` `/logout` | GET/POST / POST | — | 登录/退出 |
| `/guestbook` | GET / POST | 公开 | 留言板;POST 免注册 |
| `/guestbook/:id/delete` | POST | 站长 | 删留言 |
| `/about` | GET | 公开 | 关于小岛(P1) |
| `*` | — | — | 404 页;未捕获异常 → 500 页 |

跳转:时间线 ⇄ 详情;新建/编辑成功→详情;删除成功→时间线;登录成功→`next` 或 `/`;导航栏常驻:灯塔(首页)/贝壳(留言)/关于/登录 或 (写日记·退出)。

## 3. 数据库表结构(SQLite,单文件 data/shiguangdao.db)

**users(站长,单行)**
| 字段 | 类型 | 约束 |
|---|---|---|
| id | INTEGER | PK AUTOINCREMENT |
| username | TEXT | NOT NULL UNIQUE |
| password_hash | TEXT | NOT NULL(`scrypt$salt$hash`,node:crypto) |
| display_name | TEXT | NOT NULL |
| created_at | TEXT | NOT NULL ISO8601 |

**diaries(日记)**
| 字段 | 类型 | 约束 |
|---|---|---|
| id | INTEGER | PK |
| title | TEXT | NOT NULL,1–100 字 |
| content | TEXT | NOT NULL,1–20000 字 |
| mood | TEXT | NOT NULL DEFAULT 'sunny'(sunny/rainy/windy/starry/foggy) |
| entry_date | TEXT | NOT NULL YYYY-MM-DD(发生日,可早于创建) |
| is_private | INTEGER | NOT NULL DEFAULT 0(0/1) |
| photo_path | TEXT | NULL(P1 预留,`/uploads/...`) |
| created_at / updated_at | TEXT | NOT NULL ISO8601 |

**guestbook(贝壳留言)**
| 字段 | 类型 | 约束 |
|---|---|---|
| id | INTEGER | PK |
| nickname | TEXT | NOT NULL,1–20 字 |
| content | TEXT | NOT NULL,1–500 字 |
| created_at | TEXT | NOT NULL |

**sessions(持久化会话)**
| 字段 | 类型 | 约束 |
|---|---|---|
| token | TEXT | PK(128bit 随机 hex) |
| user_id | INTEGER | NOT NULL REFERENCES users(id) |
| expires_at | TEXT | NOT NULL(7 天,过期清理) |

索引:
- `idx_diaries_public_date ON diaries(is_private, entry_date DESC)` — 时间线主查询
- `idx_guestbook_created ON guestbook(created_at DESC)`
- `idx_sessions_expires ON sessions(expires_at)` — 过期清理
- users.username 唯一索引

关系:users 1—N diaries(单站长系统,省略 author_id,文档声明);guestbook 独立;sessions → users。
迁移:`db/schema.sql` 全部 `CREATE TABLE IF NOT EXISTS`,启动时执行;首次启动若无站长账号则引导创建(或 CLI 脚本)。

## 4. 权限矩阵

| 操作 | 访客(未登录) | 站长(已登录) |
|---|---|---|
| 浏览时间线 / 公开日记详情 | ✓ | ✓ |
| 私人日记出现在时间线 | ✗(SQL 层排除,不渲染占位) | ✓(带"私人"标记) |
| 直接访问私人日记 URL | ✗(404,不泄露存在性) | ✓ |
| 新建 / 编辑 / 删除日记 | ✗(路由级 302 → /login) | ✓ |
| 留言(昵称+内容) | ✓ | ✓ |
| 删除任意留言 | ✗(404) | ✓ |
| 照片上传 | 随日记权限 | ✓ |
| 退出登录 | — | ✓ |

实施原则:权限全部在**服务端**判定(中间件 `requireAuth` + 渲染时身份裁剪);私人日记在列表 SQL 即排除;会话凭 HttpOnly + SameSite=Lax cookie;写操作均为 POST;错误响应不泄露账号信息(登录失败统一文案)。

## 5. 前后端架构及关键 API

```
浏览器(服务端渲染 HTML + 原生 JS 增强)
   ↕ HTTP(session cookie)
Express
 ├─ routes/web.js        路由 + requireAuth 中间件
 ├─ templates/*.ejs      视图(layout / timeline / diary / form / guestbook / login / 404 / 500)
 ├─ services/*.js        业务逻辑(diary/auth/guestbook)—— 纯函数层,可单测
 ├─ db/index.js          better-sqlite3 连接 + schema 执行
 └─ uploads/             照片静态服务(P1)
data/shiguangdao.db      SQLite 文件(.gitignore)
```

依赖仅 3 个:`express`、`ejs`、`better-sqlite3`(鉴权用 node:crypto,表单解析用内置 urlencoded)。无构建步骤;`npm start` 即运行。

关键 API(表单 POST 为主,保持无 JS 也可用,渐进增强):
- `POST /login {username, password}` → 成功 302(next 或 /)+ Set-Cookie sid;失败重渲染并提示(统一文案)
- `POST /logout` → 302 /
- `POST /diary {title, content, mood, entry_date, is_private[, photo]}` → 校验通过 302 `/diary/:id`;失败 422 重渲染表单并回显(保留输入)
- `POST /diary/:id/edit`、`POST /diary/:id/delete` 同上
- `POST /guestbook {nickname, content}` → 302 `/guestbook#latest`
- 上传(P1):multipart,≤5MB,MIME 白名单,文件名 `photo_<随机>.<ext>`

安全基线:EJS 默认转义防 XSS;SQL 全部参数化;上传不信任扩展名与 MIME;SameSite=Lax + 全 POST 写操作(不做 CSRF token,文档声明范围);密钥仅存环境变量/本地配置文件,不入库不入前端。

## 6. 七天开发顺序与每日验收

| 天 | 内容 | 当日验收标准 |
|---|---|---|
| D1 | 搭建:repo/目录、Express+EJS 骨架、SQLite schema、基础样式、.gitignore、README 骨架 | `npm start` 首页骨架可访问;db 文件生成且建表成功;控制台无错误;git 初始提交 |
| D2 | 时间线 + 详情:列表(公开、按月分组)、详情页、空状态、404 | 种子数据下时间线渲染正确;访客看不到私人日记;不存在 id → 404 |
| D3 | 鉴权:登录/退出、DB session、路由保护、首次创建站长账号 | 未登录写路由 302 到登录;密码错误有统一提示;重启服务会话仍有效 |
| D4 | 日记 CRUD:新建/编辑/删除、服务端校验与回显、确认弹层 | 全流程走通;空标题/超长正文 422 回显且保留输入;私人开关对访客生效 |
| D5 | 留言板:发留言、站长删除、排序与计数 | 访客免登录可留言;空昵称/超长内容被拒;站长删除即时生效 |
| D6 | 视觉与体验:岛屿主题视觉(单一主色+克制动效)、响应式、错误页、kill-ai-slop 扫描修复、(P1)照片上传 | 375px 无横向溢出;扫描报告显著问题清零;控制台零错误 |
| D7 | 测试交付:路由/服务单元测试、越权与注入走查、README、演示脚本、版本归档 | 全部 P0 演示通过;测试记录如实;提交包离线可运行 |

每阶段提交 git 并打版本标签(v0.x);每日产出测试记录。

## 7. 技术风险(可能导致延期)

1. **better-sqlite3 原生编译失败**(Node 24 较新)→ 兜底链:先试 `better-sqlite3` → 失败改用内置 `node:sqlite`(Node 24 自带)→ 再失败改 JSON 文件存储层(接口不变,仅 D1 验证,风险前置消化)。
2. **照片上传**(存储路径/大小/MIME/展示)是最大超时点 → 已定级 P1,纯文本日记为保底交付。
3. **范围蔓延**(岛屿插画、动画、音乐挂件)→ P0 冻结;装饰只用 CSS,禁装饰性动画。
4. **单账号安全范围有限**(无 CSRF token、无防爆破)→ 文档声明;P1 加失败延迟与留言限频。
5. **评审环境无 npm 网络** → D7 准备离线安装说明(锁定依赖版本 + `npm ci`;必要时附离线 node_modules 包)。
6. **演示数据与"真实记录"红线** → 种子数据仅开发用,交付包提供 `npm run seed` 与 `npm run reset` 分离,README 声明。

## 8. 待确认关键决策

1. **产品设定**:拾光岛是否即按本方案 = "个人记忆小岛:时间线日记 + 访客贝壳留言 + 私人日记"?若你已有原始创意/策划(如特定玩法),请提供,我遵循原案。
2. **与知序的关系**:按新项目新目录 `shiguangdao/` 处理(已建,未动任何现有文件)?还是需要复用/覆盖知序?
3. **技术栈**:Node + Express + EJS 服务端渲染 + SQLite(推荐,单人七天最稳)vs 前后端分离 SPA(React/Vue + JSON API)?
4. **照片上传**:定 P1(推荐,保底纯文本)还是必须 P0?
5. **账号体系**:仅单站长(推荐)vs 支持访客注册?
6. **部署**:比赛交付以"本地可运行 + 离线包"(推荐)为准,还是必须公网可访问(需选托管方案,影响 D7)?
7. **版本管理**:git init + 版本标签(推荐),还是沿用版本文件夹归档,或两者都要?
