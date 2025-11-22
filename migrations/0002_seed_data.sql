-- ===================================
-- AI自動ブログ投稿CMS - 初期データ
-- ===================================

-- テストユーザー (パスワード: password123 のハッシュ)
-- 実際の実装ではbcryptなどでハッシュ化すること
INSERT OR IGNORE INTO users (id, email, password_hash, name, role) VALUES 
  (1, 'admin@example.com', '$2a$10$example_hash_to_replace', 'Admin User', 'admin'),
  (2, 'editor@example.com', '$2a$10$example_hash_to_replace', 'Editor User', 'editor');

-- サンプルプロジェクト
INSERT OR IGNORE INTO projects (id, user_id, name, description, domain, publish_method) VALUES 
  (1, 1, 'テックブログ', 'AI・テクノロジー関連のブログメディア', 'tech-blog.example.com', 'internal'),
  (2, 1, 'ビジネスメディア', 'ビジネス・マーケティング情報サイト', 'business.example.com', 'internal');

-- デフォルトプロンプト: 構成生成
INSERT OR IGNORE INTO prompts (project_id, type, version, name, body, params, is_active) VALUES 
  (1, 'outline', 'v1', '標準構成生成プロンプト', 
   'あなたはSEOに精通したコンテンツプランナーです。
以下のキーワードについて、読者の検索意図を満たす記事構成を作成してください。

キーワード: {{keyword}}
文字数目安: {{max_chars}}文字
トーン: {{tone}}

以下のJSON形式で出力してください:
{
  "title": "記事タイトル",
  "meta_description": "メタディスクリプション(120文字以内)",
  "outline": [
    {"level": "h2", "text": "見出しテキスト"},
    {"level": "h3", "text": "小見出しテキスト"}
  ]
}',
   '{"max_chars": 3000, "tone": "professional"}',
   1
  );

-- デフォルトプロンプト: 本文生成
INSERT OR IGNORE INTO prompts (project_id, type, version, name, body, params, is_active) VALUES 
  (1, 'article_draft', 'v1', '標準本文生成プロンプト', 
   'あなたはプロのWebライターです。
以下の構成に基づいて、詳細な記事本文を執筆してください。

キーワード: {{keyword}}
構成: {{outline}}
文字数: {{max_chars}}文字程度
トーン: {{tone}}

要件:
- 各見出しに対して十分な情報量を提供
- 読者に価値ある具体例や実践的なアドバイスを含める
- SEOを意識しつつ、自然で読みやすい文章
- Markdown形式で出力

出力形式:
# 記事タイトル

## 導入
...

## 見出し1
...
',
   '{"max_chars": 3000, "tone": "professional"}',
   1
  );

-- デフォルトプロンプト: 内部リンク生成
INSERT OR IGNORE INTO prompts (project_id, type, version, name, body, params, is_active) VALUES 
  (1, 'internal_links', 'v1', '内部リンク挿入プロンプト', 
   'あなたはSEO専門家です。
以下の記事本文に、関連する内部リンクを自然に挿入してください。

現在の記事:
{{current_article}}

リンク候補:
{{link_candidates}}

要件:
- 最大{{max_links}}個まで
- 自然な文脈でリンクを挿入
- 同じURLへの重複リンクは避ける
- アンカーテキストは具体的に

出力形式:
{
  "modified_content": "リンク入りのMarkdown本文",
  "inserted_links": [
    {"article_id": 123, "anchor_text": "アンカーテキスト", "position": 1}
  ]
}',
   '{"max_links": 3}',
   1
  );

-- サンプルキーワード
INSERT OR IGNORE INTO keywords (project_id, keyword, search_intent, notes) VALUES 
  (1, 'AI ブログ 自動化', '情報収集型 - AIでブログ運営を効率化したい人', 'MVP開発のテストキーワード'),
  (1, 'コンテンツマーケティング ツール', '比較検討型 - ツール選定中', ''),
  (1, 'SEO対策 内部リンク', 'ノウハウ型 - 内部リンクの効果的な使い方', '');

-- サンプル装飾ルール
INSERT OR IGNORE INTO decoration_rules (project_id, name, rule_type, target_texts, wrapper_before, wrapper_after, priority, is_enabled) VALUES 
  (1, '重要語句強調', 'keyword', '["重要", "必須", "注意"]', '<strong class="font-bold text-red-600">', '</strong>', 10, 1),
  (1, 'コードインライン', 'pattern', '["```"]', '<code class="bg-gray-100 px-2 py-1 rounded">', '</code>', 5, 1),
  (1, '注意ボックス', 'block', '["[box type=\"caution\"]", "[/box]"]', '<div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-4">', '</div>', 20, 1);
