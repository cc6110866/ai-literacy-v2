# D1 数据库结构（2026-04-02 确认）

> ⚠️ 以此文件为准，所有开发严格参照此结构。

## 数据库信息

- **数据库名**: ai-literacy-db
- **数据库 ID**: 59129a24-c6b2-4065-b9f8-9b424964fbf4
- **Account ID**: 1d0ee2a89d99b4fd70eca87e7fbc8f6a
- **Cloudflare 绑定变量名**: DB
- **外键约束**: Progress.characterId → Character.id
- **总字数**: 1,862 个汉字

---

## 建表 SQL

```sql
-- Character 表（23 列）
CREATE TABLE Character (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character TEXT NOT NULL,
  pinyin TEXT NOT NULL,
  tone INTEGER NOT NULL,
  radical TEXT NOT NULL,
  strokes INTEGER NOT NULL,
  level INTEGER NOT NULL,
  frequency INTEGER NOT NULL,
  meaning TEXT,
  origin TEXT,
  story TEXT,
  examples TEXT,
  audioUrl TEXT,
  imageUrl TEXT,
  strokeGif TEXT,
  difficulty INTEGER DEFAULT 5,
  relatedChars TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  pos TEXT,
  category TEXT,
  topic_group TEXT DEFAULT '通用'
);

-- Progress 表（11 列）
CREATE TABLE Progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  characterId INTEGER NOT NULL,
  status TEXT DEFAULT 'new',
  practiceCount INTEGER DEFAULT 0,
  correctCount INTEGER DEFAULT 0,
  lastPractice TEXT DEFAULT (datetime('now')),
  nextReview TEXT,
  reviewCount INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (characterId) REFERENCES Character(id)
);

-- DailyRecord 表（10 列）
CREATE TABLE DailyRecord (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL,
  date TEXT NOT NULL,
  charactersLearned TEXT,
  charactersReviewed TEXT,
  newCount INTEGER DEFAULT 0,
  reviewCount INTEGER DEFAULT 0,
  correctRate REAL DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);
```

---

## 列说明

### Character 表

| 列名 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INTEGER | PK, AUTO | - | 主键 |
| character | TEXT | NOT NULL | - | 汉字 |
| pinyin | TEXT | NOT NULL | - | 拼音 |
| tone | INTEGER | NOT NULL | - | 声调 |
| radical | TEXT | NOT NULL | - | 部首 |
| strokes | INTEGER | NOT NULL | - | 笔画数 |
| level | INTEGER | NOT NULL | - | 级别 1-4 |
| frequency | INTEGER | NOT NULL | - | 频率 |
| meaning | TEXT | | - | 释义 |
| origin | TEXT | | - | 字源 |
| story | TEXT | | - | 故事 |
| examples | TEXT | | - | 例句 |
| audioUrl | TEXT | | - | 音频 URL |
| imageUrl | TEXT | | - | 图片 URL |
| strokeGif | TEXT | | - | 笔画 GIF |
| difficulty | INTEGER | | 5 | 难度 |
| relatedChars | TEXT | | - | 关联字 |
| createdAt | TEXT | | datetime('now') | 创建时间 |
| updatedAt | TEXT | | datetime('now') | 更新时间 |
| pos | TEXT | | - | 词性 |
| category | TEXT | | - | 分类 |
| topic_group | TEXT | | '通用' | 主题组 |

### Progress 表

| 列名 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INTEGER | PK, AUTO | - | 主键 |
| userId | TEXT | NOT NULL | - | 用户 ID |
| characterId | INTEGER | NOT NULL | - | 字符 ID（外键→Character.id） |
| status | TEXT | | 'new' | 状态：new/learning/mastered |
| practiceCount | INTEGER | | 0 | 练习次数 |
| correctCount | INTEGER | | 0 | 正确次数 |
| lastPractice | TEXT | | datetime('now') | 最后练习时间 |
| nextReview | TEXT | | - | 下次复习时间（ISO 格式） |
| reviewCount | INTEGER | | 0 | 复习次数 |
| createdAt | TEXT | | datetime('now') | 创建时间 |
| updatedAt | TEXT | | datetime('now') | 更新时间 |

### DailyRecord 表

| 列名 | 类型 | 约束 | 默认值 | 说明 |
|------|------|------|--------|------|
| id | INTEGER | PK, AUTO | - | 主键 |
| userId | TEXT | NOT NULL | - | 用户 ID |
| date | TEXT | NOT NULL | - | 日期（YYYY-MM-DD） |
| charactersLearned | TEXT | | - | 新学字符 ID（逗号分隔） |
| charactersReviewed | TEXT | | - | 复习字符 ID（逗号分隔） |
| newCount | INTEGER | | 0 | 新学数量 |
| reviewCount | INTEGER | | 0 | 复习数量 |
| correctRate | REAL | | 0 | 正确率 |
| createdAt | TEXT | | datetime('now') | 创建时间 |
| updatedAt | TEXT | | datetime('now') | 更新时间 |
