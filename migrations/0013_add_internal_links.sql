-- ===================================
-- 内部リンク管理テーブル
-- ===================================

-- 古い内部リンクテーブルを削除して新しい構造で再作成
DROP TABLE IF EXISTS internal_links;

-- 内部リンクテーブル
-- from_article_idの記事のfrom_headingからto_article_idの記事のto_headingへリンクする
CREATE TABLE internal_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,            -- ユーザーID（追加）
  from_article_id INTEGER NOT NULL,
  from_heading TEXT NOT NULL,          -- リンク元の見出しテキスト
  from_heading_id TEXT,                -- リンク元の見出しID（anchor用）
  to_article_id INTEGER NOT NULL,
  to_heading TEXT,                      -- リンク先の見出しテキスト（NULLの場合は記事トップ）
  to_heading_id TEXT,                   -- リンク先の見出しID（anchor用）
  link_text TEXT,                       -- リンクテキスト（カスタマイズ可能）
  position INTEGER DEFAULT 0,           -- 見出し内のリンク表示位置（複数リンクの順序管理）
  is_active INTEGER DEFAULT 1,          -- リンク有効/無効
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_internal_links_user ON internal_links(user_id);
CREATE INDEX IF NOT EXISTS idx_internal_links_from_article ON internal_links(from_article_id);
CREATE INDEX IF NOT EXISTS idx_internal_links_to_article ON internal_links(to_article_id);

-- 記事の見出しキャッシュテーブル
-- Markdownから抽出した見出しをキャッシュして高速アクセス
CREATE TABLE IF NOT EXISTS article_headings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  heading_level INTEGER NOT NULL,      -- 見出しレベル (1-6)
  heading_text TEXT NOT NULL,          -- 見出しテキスト
  heading_id TEXT NOT NULL,            -- 見出しID（anchor用、例: "introduction"）
  position INTEGER NOT NULL,           -- 記事内での出現順序
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_article_headings_article ON article_headings(article_id);
CREATE INDEX IF NOT EXISTS idx_article_headings_level ON article_headings(heading_level);
