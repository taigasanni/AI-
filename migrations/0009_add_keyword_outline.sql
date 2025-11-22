-- ===================================
-- マイグレーション: keyword と outline カラムの追加
-- ===================================

-- articlesテーブルにkeywordとoutlineカラムを追加
ALTER TABLE articles ADD COLUMN keyword TEXT;
ALTER TABLE articles ADD COLUMN outline TEXT; -- JSON形式で保存
