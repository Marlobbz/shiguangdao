-- 拾光岛 · 数据库结构(SQLite,全部幂等,启动时执行)

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,          -- scrypt$salt$hash(node:crypto)
  display_name  TEXT    NOT NULL,
  created_at    TEXT    NOT NULL           -- ISO 8601
);

CREATE TABLE IF NOT EXISTS diaries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,            -- 1-100 字
  content     TEXT    NOT NULL,            -- 1-20000 字
  mood        TEXT    NOT NULL DEFAULT 'sunny',  -- sunny|rainy|windy|starry|foggy
  entry_date  TEXT    NOT NULL,            -- YYYY-MM-DD,日记的发生日(可早于创建)
  is_private  INTEGER NOT NULL DEFAULT 0,  -- 0 公开 / 1 私人(仅站长可见)
  photo_path  TEXT,                        -- P1 预留:/uploads/xxx
  created_at  TEXT    NOT NULL,
  updated_at  TEXT    NOT NULL
);

-- 时间线主查询:公开日记按发生日期倒序
CREATE INDEX IF NOT EXISTS idx_diaries_public_date ON diaries(is_private, entry_date DESC);

CREATE TABLE IF NOT EXISTS guestbook (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname   TEXT    NOT NULL,             -- 1-20 字
  content    TEXT    NOT NULL,             -- 1-500 字
  created_at TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_guestbook_created ON guestbook(created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT    PRIMARY KEY,          -- 128bit 随机 hex
  user_id    INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT    NOT NULL              -- 7 天
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
