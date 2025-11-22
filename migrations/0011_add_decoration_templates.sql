-- ===================================
-- マイグレーション: 装飾テンプレートの追加
-- 説明: Markdown装飾ルールをテンプレート化
-- ===================================

-- 装飾テンプレートテーブル
CREATE TABLE IF NOT EXISTS decoration_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  template_content TEXT NOT NULL, -- Markdown装飾のルール
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- デフォルト装飾テンプレートを全ユーザーに追加
INSERT INTO decoration_templates (user_id, name, description, template_content, is_active)
SELECT 
  id,
  '標準装飾テンプレート',
  '箇条書き、マーカー、ボックスを使った分かりやすい記事装飾',
  '# Markdown装飾ルール

## 1. 箇条書き（リスト）
重要なポイントを列挙する際は箇条書きを使用：

### 通常の箇条書き
```
- ポイント1
- ポイント2
- ポイント3
```

### 番号付きリスト
```
1. 手順1
2. 手順2
3. 手順3
```

## 2. 重要な文章のマーカー（強調）
重要な部分は**太字**で強調：
```
これは**重要なポイント**です。
```

## 3. ボックス（引用）
注意点や補足情報はボックスで囲む：
```
> 💡 **ポイント**
> ここに重要な補足情報を記載します。
```

```
> ⚠️ **注意**
> 注意すべき内容を記載します。
```

```
> ✅ **メリット**
> メリットや利点を記載します。
```

## 4. 表（テーブル）
比較や整理には表を使用：
```
| 項目 | 内容 | 備考 |
|------|------|------|
| 項目1 | 説明1 | 補足1 |
| 項目2 | 説明2 | 補足2 |
```

## 5. コードブロック
技術的な内容やコマンドはコードブロックで：
```
npm install package-name
```

## 6. 見出しレベル
- ## H2: メインセクション
- ### H3: サブセクション
- #### H4: 詳細項目

## 装飾の使用方針
1. **箇条書き**: 3つ以上のポイントを列挙する場合は必ず使用
2. **太字**: 1段落に1-2箇所、キーワードや重要フレーズに使用
3. **ボックス**: 各セクションに1-2個、補足情報や注意点に使用
4. **表**: 比較や選択肢が3つ以上ある場合に使用
5. **適度な装飾**: 過度な装飾は避け、読みやすさを優先',
  1
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM decoration_templates 
  WHERE decoration_templates.user_id = users.id 
  AND decoration_templates.is_active = 1
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_decoration_templates_user_id ON decoration_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_decoration_templates_active ON decoration_templates(is_active);
