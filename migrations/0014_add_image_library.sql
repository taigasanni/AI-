-- 画像ライブラリテーブル
CREATE TABLE IF NOT EXISTS image_library (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  image_name TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  mime_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 画像と見出しの紐付けテーブル
CREATE TABLE IF NOT EXISTS heading_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  heading_text TEXT NOT NULL,
  image_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (image_name) REFERENCES image_library(image_name) ON DELETE CASCADE,
  UNIQUE(heading_text)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_image_library_name ON image_library(image_name);
CREATE INDEX IF NOT EXISTS idx_image_library_user ON image_library(user_id);
CREATE INDEX IF NOT EXISTS idx_heading_images_heading ON heading_images(heading_text);
CREATE INDEX IF NOT EXISTS idx_heading_images_image ON heading_images(image_name);
