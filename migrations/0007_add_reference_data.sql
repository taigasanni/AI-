-- ===================================
-- マイグレーション: 参照データテーブル追加
-- ===================================

-- 参照データテーブル (過去記事やテキストデータの保存)
CREATE TABLE IF NOT EXISTS reference_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT, -- 'article', 'snippet', 'template', 'other'
  tags TEXT, -- カンマ区切りのタグ
  description TEXT,
  source_url TEXT, -- 元記事のURLなど
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_reference_data_user_id ON reference_data(user_id);
CREATE INDEX IF NOT EXISTS idx_reference_data_category ON reference_data(category);
CREATE INDEX IF NOT EXISTS idx_reference_data_created_at ON reference_data(created_at);
