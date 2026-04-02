-- D1 建表脚本
-- 运行方式: npx wrangler d1 execute ai-literacy-db --remote --file=init-db.sql

-- 汉字表
CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character TEXT NOT NULL UNIQUE,
  pinyin TEXT NOT NULL DEFAULT '',
  meaning TEXT NOT NULL DEFAULT '',
  story TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  strokes INTEGER NOT NULL DEFAULT 5,
  level INTEGER NOT NULL DEFAULT 1,
  topic_group TEXT NOT NULL DEFAULT '',
  origin TEXT NOT NULL DEFAULT ''
);

-- 用户进度表
CREATE TABLE IF NOT EXISTS user_progress (
  userId TEXT PRIMARY KEY,
  totalLearned INTEGER NOT NULL DEFAULT 0,
  mastered INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  lastStudyDate TEXT NOT NULL DEFAULT '',
  dueReview INTEGER NOT NULL DEFAULT 0
);

-- 每日统计表
CREATE TABLE IF NOT EXISTS daily_stats (
  userId TEXT NOT NULL,
  date TEXT NOT NULL,
  newCount INTEGER NOT NULL DEFAULT 0,
  reviewCount INTEGER NOT NULL DEFAULT 0,
  correctCount INTEGER NOT NULL DEFAULT 0,
  totalAttempts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (userId, date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_characters_level ON characters(level);
CREATE INDEX IF NOT EXISTS idx_characters_topic ON characters(topic_group);
CREATE INDEX IF NOT EXISTS idx_characters_pinyin ON characters(pinyin);
