-- ===================================
-- AI自動ブログ投稿CMS - 初期スキーマ
-- ===================================

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'editor' CHECK(role IN ('admin', 'editor', 'viewer')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- プロジェクト(サイト)テーブル
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  domain TEXT,
  publish_method TEXT DEFAULT 'internal' CHECK(publish_method IN ('internal', 'wordpress', 'manual')),
  wp_endpoint TEXT,
  wp_username TEXT,
  wp_app_password TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- プロンプトテーブル
CREATE TABLE IF NOT EXISTS prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('outline', 'article_draft', 'internal_links', 'image_mapping')),
  version TEXT NOT NULL DEFAULT 'v1',
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  params TEXT, -- JSON形式: {"max_chars": 3000, "tone": "professional"}
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- キーワードテーブル
CREATE TABLE IF NOT EXISTS keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  keyword TEXT NOT NULL,
  search_intent TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 記事テーブル
CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'review', 'scheduled', 'published')),
  content TEXT, -- Markdown or HTML
  meta_description TEXT,
  og_image_url TEXT,
  prompt_type TEXT, -- 使用したプロンプトのtype
  prompt_version TEXT, -- 使用したプロンプトのversion
  scheduled_at DATETIME,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 記事キーワード紐づけテーブル
CREATE TABLE IF NOT EXISTS article_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  keyword_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE,
  UNIQUE(article_id, keyword_id)
);

-- 画像テーブル
CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  title TEXT,
  categories TEXT, -- JSON形式: ["tech", "business"]
  tags TEXT, -- JSON形式: ["ai", "automation"]
  aspect_ratio TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 記事画像紐づけテーブル
CREATE TABLE IF NOT EXISTS article_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  image_id INTEGER NOT NULL,
  position INTEGER NOT NULL, -- H2の位置など
  section_title TEXT, -- どのH2に紐づくか
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
);

-- 内部リンクテーブル
CREATE TABLE IF NOT EXISTS internal_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_article_id INTEGER NOT NULL,
  to_article_id INTEGER NOT NULL,
  anchor_text TEXT NOT NULL,
  position INTEGER, -- リンクの位置
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (to_article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- リンク挿入ログテーブル
CREATE TABLE IF NOT EXISTS link_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'add', 'remove', 'update'
  link_data TEXT, -- JSON形式
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

-- 装飾ルールテーブル
CREATE TABLE IF NOT EXISTS decoration_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK(rule_type IN ('keyword', 'pattern', 'block')),
  target_texts TEXT, -- JSON形式: ["重要", "注意"]
  wrapper_before TEXT, -- <strong class="important">
  wrapper_after TEXT, -- </strong>
  priority INTEGER DEFAULT 0,
  is_enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- 記事リビジョンテーブル (将来拡張用)
CREATE TABLE IF NOT EXISTS article_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  changed_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_project_id ON prompts(project_id);
CREATE INDEX IF NOT EXISTS idx_prompts_type ON prompts(type, is_active);
CREATE INDEX IF NOT EXISTS idx_keywords_project_id ON keywords(project_id);
CREATE INDEX IF NOT EXISTS idx_articles_project_id ON articles(project_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_scheduled ON articles(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_article_keywords_article_id ON article_keywords(article_id);
CREATE INDEX IF NOT EXISTS idx_article_keywords_keyword_id ON article_keywords(keyword_id);
CREATE INDEX IF NOT EXISTS idx_images_project_id ON images(project_id);
CREATE INDEX IF NOT EXISTS idx_article_images_article_id ON article_images(article_id);
CREATE INDEX IF NOT EXISTS idx_internal_links_from ON internal_links(from_article_id);
CREATE INDEX IF NOT EXISTS idx_internal_links_to ON internal_links(to_article_id);
CREATE INDEX IF NOT EXISTS idx_decoration_rules_project_id ON decoration_rules(project_id);
