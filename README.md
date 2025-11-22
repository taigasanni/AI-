# AI自動ブログ投稿CMS

## プロジェクト概要

**AI自動ブログ投稿CMS**は、コンテンツ制作の流れ(キーワード選定 → 構成 → 執筆 → 装飾 → 内部リンク → 画像挿入 → 投稿)を、AIと独自CMSで半自動化するシステムです。

### 主な機能

- ✅ **JWT認証システム** - セキュアなユーザー認証
- ✅ **プロジェクト管理** - 複数サイト・メディアの一元管理
- ✅ **キーワード管理** - SEOキーワードの登録・管理
- ✅ **プロンプト管理** - AI生成用プロンプトのバージョン管理
- ✅ **記事管理** - ドラフト・レビュー・予約・公開のステータス管理
- ✅ **AI記事生成** - OpenAI GPT-4を使った構成・本文生成
- ⏳ **画像管理** - 画像データベースと自動挿入 (開発予定)
- ⏳ **装飾ルール** - 文字装飾の自動適用 (開発予定)
- ⏳ **内部リンク生成** - 関連記事の自動リンク挿入 (開発予定)

## 公開URL

### 開発環境
- **メイン画面**: https://3000-ieespo9mst740vnh5irb2-5c13a017.sandbox.novita.ai
- **API Health Check**: https://3000-ieespo9mst740vnh5irb2-5c13a017.sandbox.novita.ai/api/health

## 技術スタック

- **Backend**: Hono (Cloudflare Workers)
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Vanilla JavaScript + TailwindCSS
- **AI**: OpenAI GPT-4o-mini
- **Authentication**: JWT (Web Crypto API)
- **Deployment**: Cloudflare Pages

## データアーキテクチャ

### 主要テーブル

1. **users** - ユーザー情報 (email, password_hash, role)
2. **projects** - プロジェクト (name, domain, publish_method)
3. **prompts** - プロンプト定義 (type, version, body, params)
4. **keywords** - キーワード (keyword, search_intent, notes)
5. **articles** - 記事 (title, content, status, meta_description)
6. **article_keywords** - 記事とキーワードの紐づけ
7. **images** - 画像マスタ (url, alt_text, categories, tags)
8. **decoration_rules** - 装飾ルール (rule_type, target_texts, wrapper)

## APIエンドポイント

### 認証 (/api/auth)
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `GET /api/auth/me` - 現在のユーザー情報取得
- `POST /api/auth/logout` - ログアウト

### プロジェクト (/api/projects)
- `GET /api/projects` - プロジェクト一覧
- `GET /api/projects/:id` - プロジェクト詳細
- `POST /api/projects` - プロジェクト作成
- `PUT /api/projects/:id` - プロジェクト更新
- `DELETE /api/projects/:id` - プロジェクト削除

### キーワード (/api/keywords)
- `GET /api/keywords?projectId=X` - キーワード一覧
- `POST /api/keywords` - キーワード作成
- `DELETE /api/keywords/:id` - キーワード削除

### 記事 (/api/articles)
- `GET /api/articles?projectId=X` - 記事一覧
- `GET /api/articles/:id` - 記事詳細
- `POST /api/articles` - 記事作成
- `PUT /api/articles/:id` - 記事更新
- `DELETE /api/articles/:id` - 記事削除

### AI生成 (/api/generate)
- `POST /api/generate/outline` - 記事構成生成
- `POST /api/generate/article` - 記事本文生成

## 使い方

### 1. ユーザー登録・ログイン

1. メイン画面にアクセス
2. 「新規登録」をクリック
3. 名前・メールアドレス・パスワードを入力して登録
4. ログイン後、ダッシュボードが表示されます

### 2. プロジェクト作成

1. サイドバーから「プロジェクト」を選択
2. 「新規作成」ボタンをクリック
3. モーダルで以下を入力:
   - プロジェクト名 (必須)
   - 説明
   - ドメイン
   - 公開方法 (内部CMS / WordPress / 手動コピー)
4. 「作成」ボタンをクリック

### 3. キーワード登録

1. サイドバーから「キーワード」を選択
2. 「キーワード追加」ボタンをクリック
3. モーダルで以下を入力:
   - キーワード (必須)
   - 検索意図
   - メモ
4. 「追加」ボタンをクリック

### 4. AI記事生成

1. サイドバーから「AI記事生成」を選択
2. **構成生成**:
   - キーワードを入力
   - 文字数目安とトーンを設定
   - 「構成を生成」ボタンをクリック
3. **本文生成**:
   - 生成された構成をコピー
   - 「本文を生成」ボタンをクリック
   - 生成された記事を「記事として保存」

### 5. 記事作成

1. サイドバーから「記事管理」を選択
2. 「記事作成」ボタンをクリック
3. モーダルで以下を入力:
   - タイトル (必須)
   - スラッグ (URL用、任意)
   - 本文 (Markdown形式)
   - メタディスクリプション
   - ステータス (下書き / レビュー中 / 予約投稿 / 公開済み)
4. 「作成」ボタンをクリック

### 6. 記事管理

1. サイドバーから「記事管理」を選択
2. 記事一覧から:
   - **目のアイコン**: 記事詳細表示
   - **ゴミ箱アイコン**: 記事削除
3. 記事詳細モーダルで内容を確認
4. ステータス別にカラー表示

## ローカル開発

### 環境変数設定

`.dev.vars` ファイルを作成:

```bash
OPENAI_API_KEY=your_openai_api_key_here
JWT_SECRET=your_jwt_secret_key_here
```

### データベースマイグレーション

```bash
# ローカルD1データベースにマイグレーション適用
npm run db:migrate:local

# データベース確認
npm run db:console:local
```

### サーバー起動

```bash
# ビルド
npm run build

# 開発サーバー起動 (PM2)
pm2 start ecosystem.config.cjs

# ログ確認
pm2 logs --nostream

# サーバー停止
pm2 delete ai-blog-cms
```

### ポートクリーンアップ

```bash
npm run clean-port
```

## デプロイ

### Cloudflare Pagesへのデプロイ

```bash
# ビルド
npm run build

# デプロイ
npm run deploy
```

### 環境変数設定 (本番環境)

```bash
# OpenAI APIキー設定
npx wrangler pages secret put OPENAI_API_KEY --project-name ai-blog-cms

# JWT秘密鍵設定
npx wrangler pages secret put JWT_SECRET --project-name ai-blog-cms
```

## 新機能: モーダルUI (v1.0)

### ✨ 実装済みのモーダル機能

#### 1. プロジェクト作成モーダル
- プロジェクト名、説明、ドメイン、公開方法を入力
- リアルタイムバリデーション
- 作成後、自動的にプロジェクト一覧に反映

#### 2. キーワード追加モーダル
- キーワード、検索意図、メモを入力
- プロジェクト選択状態で利用可能
- 追加後、自動的にキーワード一覧に反映

#### 3. 記事作成モーダル
- タイトル、スラッグ、本文(Markdown)、メタディスクリプション、ステータスを入力
- 大きめのモーダルで快適な入力体験
- 作成後、自動的に記事一覧に反映

#### 4. 記事詳細モーダル
- 記事の全情報を表示
- Markdown本文のプレビュー
- ステータスに応じたカラー表示
- 編集ボタン (将来実装予定)

### 💡 モーダルの使い方

- **開く**: 各画面の「新規作成」「追加」ボタンをクリック
- **閉じる**: 
  - 右上の「×」ボタン
  - 背景の暗い部分をクリック
  - 「キャンセル」ボタン
- **送信**: 必須項目を入力して「作成」「追加」ボタン

## 開発ステータス

### ✅ 完了 (v1.0)

- ✅ JWT認証システム (登録/ログイン/ログアウト)
- ✅ プロジェクト管理 (CRUD + モーダルUI)
- ✅ キーワード管理 (CRUD + モーダルUI)
- ✅ プロンプト管理 (CRUD、バージョン管理)
- ✅ 記事管理 (CRUD + モーダルUI + 詳細表示)
- ✅ AI記事生成 (構成生成/本文生成)
- ✅ フロントエンド管理画面 (認証/ダッシュボード/各管理画面)
- ✅ モーダルベースのUI (プロジェクト/キーワード/記事作成)
- ✅ フォーム検証とエラーハンドリング

### ⏳ 今後の開発予定

- 記事編集機能 (モーダルUI)
- 画像管理API (CRUD)
- 装飾ルール管理API (CRUD、適用処理)
- Markdownプレビュー機能
- 内部リンク生成機能 (簡易版)

### 📋 今後の拡張予定

- WordPress REST API連携
- スケジュール自動投稿
- リビジョン管理と復元
- サーチコンソール連携
- 画像の自動マッピング
- 複数ユーザーでのコラボレーション機能

## トラブルシューティング

### ポート3000が使用中

```bash
npm run clean-port
# または
fuser -k 3000/tcp
```

### データベースリセット

```bash
rm -rf .wrangler/state/v3/d1
npm run db:migrate:local
```

### PM2でサーバーが起動しない

```bash
pm2 delete all
npm run build
pm2 start ecosystem.config.cjs
```

## ライセンス

MIT License

## 作成者

武宮太雅

## 最終更新日

2025-11-22
