-- ===================================
-- スキーマ簡略化 - プロジェクト概念を削除
-- ===================================

-- 新しい簡略化されたテーブルを作成

-- キーワードテーブル (プロジェクトID削除)
CREATE TABLE IF NOT EXISTS keywords_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  keyword TEXT NOT NULL,
  search_intent TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 記事テーブル (プロジェクトID削除)
CREATE TABLE IF NOT EXISTS articles_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'review', 'scheduled', 'published')),
  content TEXT,
  meta_description TEXT,
  og_image_url TEXT,
  prompt_type TEXT,
  prompt_version TEXT,
  scheduled_at DATETIME,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- プロンプトテーブル (プロジェクトID削除)
CREATE TABLE IF NOT EXISTS prompts_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('outline', 'article_draft', 'rewrite', 'internal_links', 'image_mapping')),
  version TEXT NOT NULL DEFAULT 'v1',
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  params TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 画像テーブル (プロジェクトID削除)
CREATE TABLE IF NOT EXISTS images_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  title TEXT,
  categories TEXT,
  tags TEXT,
  aspect_ratio TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 装飾ルールテーブル (プロジェクトID削除)
CREATE TABLE IF NOT EXISTS decoration_rules_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK(rule_type IN ('keyword', 'pattern', 'block')),
  target_texts TEXT,
  wrapper_before TEXT,
  wrapper_after TEXT,
  priority INTEGER DEFAULT 0,
  is_enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 既存データを移行
INSERT INTO keywords_new (id, user_id, keyword, search_intent, notes, created_at, updated_at)
SELECT k.id, p.user_id, k.keyword, k.search_intent, k.notes, k.created_at, k.updated_at
FROM keywords k
JOIN projects p ON k.project_id = p.id;

INSERT INTO articles_new (id, user_id, title, slug, status, content, meta_description, og_image_url, prompt_type, prompt_version, scheduled_at, published_at, created_at, updated_at)
SELECT a.id, p.user_id, a.title, a.slug, a.status, a.content, a.meta_description, a.og_image_url, a.prompt_type, a.prompt_version, a.scheduled_at, a.published_at, a.created_at, a.updated_at
FROM articles a
JOIN projects p ON a.project_id = p.id;

INSERT INTO prompts_new (id, user_id, type, version, name, body, params, is_active, created_at, updated_at)
SELECT pr.id, p.user_id, pr.type, pr.version, pr.name, pr.body, pr.params, pr.is_active, pr.created_at, pr.updated_at
FROM prompts pr
JOIN projects p ON pr.project_id = p.id;

-- 古いテーブルを削除して新しいテーブルにリネーム
DROP TABLE IF EXISTS keywords;
ALTER TABLE keywords_new RENAME TO keywords;

DROP TABLE IF EXISTS articles;
ALTER TABLE articles_new RENAME TO articles;

DROP TABLE IF EXISTS prompts;
ALTER TABLE prompts_new RENAME TO prompts;

DROP TABLE IF EXISTS images;
ALTER TABLE images_new RENAME TO images;

DROP TABLE IF EXISTS decoration_rules;
ALTER TABLE decoration_rules_new RENAME TO decoration_rules;

-- プロジェクトテーブルは削除
DROP TABLE IF EXISTS projects;

-- インデックスを再作成
CREATE INDEX IF NOT EXISTS idx_keywords_user_id ON keywords(user_id);
CREATE INDEX IF NOT EXISTS idx_articles_user_id ON articles(user_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_scheduled ON articles(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_type ON prompts(type, is_active);
CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
CREATE INDEX IF NOT EXISTS idx_decoration_rules_user_id ON decoration_rules(user_id);
