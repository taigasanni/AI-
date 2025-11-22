-- ===================================
-- API設定テーブル
-- ===================================

-- APIキー設定テーブル
CREATE TABLE IF NOT EXISTS api_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('openai', 'anthropic')),
  api_key TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, provider)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_api_settings_user_id ON api_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_api_settings_provider ON api_settings(provider, is_active);
