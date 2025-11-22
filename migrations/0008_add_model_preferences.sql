-- ===================================
-- マイグレーション: AIモデル選択設定
-- ===================================

-- AIモデル設定テーブル
CREATE TABLE IF NOT EXISTS model_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL, -- 'openai', 'anthropic'
  model_name TEXT NOT NULL, -- 'gpt-4o-mini', 'claude-3-5-sonnet-20241022', etc.
  use_case TEXT NOT NULL, -- 'outline', 'article', 'rewrite', 'seo', 'assist'
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, use_case)
);

-- デフォルトのモデル設定を追加
INSERT OR IGNORE INTO model_preferences (user_id, provider, model_name, use_case, is_active)
SELECT id, 'anthropic', 'claude-3-haiku-20240307', 'outline', 1 FROM users;

INSERT OR IGNORE INTO model_preferences (user_id, provider, model_name, use_case, is_active)
SELECT id, 'anthropic', 'claude-3-haiku-20240307', 'article', 1 FROM users;

INSERT OR IGNORE INTO model_preferences (user_id, provider, model_name, use_case, is_active)
SELECT id, 'anthropic', 'claude-3-haiku-20240307', 'rewrite', 1 FROM users;

INSERT OR IGNORE INTO model_preferences (user_id, provider, model_name, use_case, is_active)
SELECT id, 'anthropic', 'claude-3-haiku-20240307', 'seo', 1 FROM users;

INSERT OR IGNORE INTO model_preferences (user_id, provider, model_name, use_case, is_active)
SELECT id, 'anthropic', 'claude-3-haiku-20240307', 'assist', 1 FROM users;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_model_preferences_user_id ON model_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_model_preferences_use_case ON model_preferences(use_case);
