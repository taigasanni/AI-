-- ===================================
-- マイグレーション: SEO項目の追加
-- ===================================

-- articlesテーブルにSEO関連カラムを追加 (meta_descriptionは既存)
ALTER TABLE articles ADD COLUMN seo_title TEXT;
ALTER TABLE articles ADD COLUMN target_keywords TEXT;

-- 既存の記事にデフォルト値を設定
UPDATE articles 
SET seo_title = title,
    target_keywords = ''
WHERE seo_title IS NULL;
