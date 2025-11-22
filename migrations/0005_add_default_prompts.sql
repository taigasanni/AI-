-- ===================================
-- マイグレーション: デフォルトプロンプトの追加
-- 作成日: 2024-01-15
-- 説明: 全ユーザーにデフォルトのoutlineとarticle_draftプロンプトを追加
-- ===================================

-- 既存の全ユーザーに対してデフォルトプロンプトを作成

-- Outline生成用デフォルトプロンプト
INSERT INTO prompts (user_id, type, name, body, params, is_active)
SELECT 
  id,
  'outline',
  'デフォルト記事構成プロンプト',
  'キーワード「{{keyword}}」に関する記事の構成案を作成してください。

要件:
- 記事の文字数: {{max_chars}}文字程度
- トーン: {{tone}}
- SEOを意識した見出し構成
- 読者にとって価値のある内容

以下のJSON形式で出力してください:
{
  "title": "記事タイトル",
  "sections": [
    {
      "heading": "見出し1",
      "points": ["ポイント1", "ポイント2"]
    }
  ]
}',
  '{"max_chars": 3000, "tone": "professional"}',
  1
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM prompts 
  WHERE prompts.user_id = users.id 
  AND prompts.type = 'outline' 
  AND prompts.is_active = 1
);

-- Article Draft生成用デフォルトプロンプト
INSERT INTO prompts (user_id, type, name, body, params, is_active)
SELECT 
  id,
  'article_draft',
  'デフォルト記事執筆プロンプト',
  'キーワード「{{keyword}}」に関する記事を執筆してください。

記事構成:
{{outline}}

要件:
- 記事の文字数: {{max_chars}}文字程度
- トーン: {{tone}}
- SEOを意識しつつ自然な文章
- Markdown形式で出力
- 見出しは ## や ### を使用

記事内容:',
  '{"max_chars": 3000, "tone": "professional"}',
  1
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM prompts 
  WHERE prompts.user_id = users.id 
  AND prompts.type = 'article_draft' 
  AND prompts.is_active = 1
);
