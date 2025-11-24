-- 監修者テーブル
CREATE TABLE IF NOT EXISTS supervisors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  title TEXT,                          -- 肩書き（例: 医師、弁護士、税理士など）
  description TEXT,                    -- 監修者の説明・経歴
  avatar_url TEXT,                     -- プロフィール画像URL
  website_url TEXT,                    -- ウェブサイトURL
  twitter_url TEXT,                    -- TwitterのURL
  linkedin_url TEXT,                   -- LinkedInのURL
  is_active INTEGER DEFAULT 1,         -- 有効/無効フラグ
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 記事と監修者の関連付けテーブル
CREATE TABLE IF NOT EXISTS article_supervisors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL,
  supervisor_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY (supervisor_id) REFERENCES supervisors(id) ON DELETE CASCADE,
  UNIQUE(article_id, supervisor_id)    -- 同じ記事に同じ監修者を複数回追加できないように
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_supervisors_user_id ON supervisors(user_id);
CREATE INDEX IF NOT EXISTS idx_article_supervisors_article_id ON article_supervisors(article_id);
CREATE INDEX IF NOT EXISTS idx_article_supervisors_supervisor_id ON article_supervisors(supervisor_id);
