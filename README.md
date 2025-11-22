# AI Blog CMS v2.1 - シンプル統合版

## 📋 プロジェクト概要

**AI Blog CMS**は、AIを活用したブログコンテンツ制作を効率化するシステムです。OpenAIまたはAnthropic (Claude) のAPIを使用して、キーワードから記事執筆までの流れを統合的にサポートします。

### ✨ 主な特徴

- **シンプル設計** - プロジェクト管理を廃止し、ユーザー単位で直接管理
- **統合フロー** - キーワード → アウトライン → 記事執筆 → リライトを1画面で完結
- **マルチAI対応** - OpenAI (GPT-4o-mini) と Anthropic (Claude 3.5 Sonnet) をサポート
- **柔軟なAPI設定** - ユーザーごとに自分のAPIキーを設定可能

## 🚀 公開URL

### 開発環境
- **メイン画面**: https://3000-ieespo9mst740vnh5irb2-5c13a017.sandbox.novita.ai
- **API Health Check**: https://3000-ieespo9mst740vnh5irb2-5c13a017.sandbox.novita.ai/api/health

## 💻 技術スタック

- **Backend**: Hono (Cloudflare Workers)
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Vanilla JavaScript + TailwindCSS + Font Awesome
- **AI**: OpenAI GPT-4o-mini / Anthropic Claude 3.5 Sonnet
- **Authentication**: JWT (Web Crypto API)
- **Deployment**: Cloudflare Pages
- **Process Manager**: PM2 (開発環境)

## 📊 データアーキテクチャ

### 主要テーブル (v2.1)

1. **users** - ユーザー情報 (email, password_hash, role)
2. **keywords** - キーワード (user_id, keyword, search_intent)
3. **articles** - 記事 (user_id, title, content, status)
4. **prompts** - プロンプト定義 (user_id, type, body, params)
5. **api_settings** - AIプロバイダーAPIキー (user_id, provider, api_key)
6. **images** - 画像マスタ (url, alt_text)
7. **decoration_rules** - 装飾ルール (rule_type, target_texts)

**v2.0からの変更点**: `project_id`を削除し、全て`user_id`ベースに簡素化

## 🎯 主要機能

### ✅ 実装済み機能

#### 1. 認証システム
- ユーザー登録（自動デフォルトプロンプト作成）
- ログイン/ログアウト
- JWT認証

#### 2. コンテンツ作成（統合フロー）
- **ステップ1**: キーワード入力 + パラメータ設定
- **ステップ2**: AIアウトライン生成
- **ステップ3**: AI記事執筆
- **ステップ4**: AIリライト（オプション）
- **進捗バー**: 現在のステップを視覚的に表示
- **戻る機能**: 各ステップに戻って修正可能

#### 3. AI統合
- **マルチプロバイダー対応**:
  - OpenAI (GPT-4o-mini)
  - Anthropic (Claude 3.5 Sonnet)
- **自動フォールバック**: OpenAI → Anthropic → 環境変数
- **統一インターフェース**: プロバイダーを意識せず利用可能

#### 4. 記事管理
- 記事一覧表示
- ステータス別表示（下書き/レビュー中/公開済み）
- 記事削除

#### 5. 設定画面
- **OpenAI APIキー設定**
  - キー形式: `sk-...`
  - リンク: [OpenAI API Keys](https://platform.openai.com/api-keys)
- **Anthropic APIキー設定**
  - キー形式: `sk-ant-...`
  - リンク: [Anthropic Console](https://console.anthropic.com/settings/keys)
- ユーザー情報表示

#### 6. 内部リンク管理（プレースホルダー）
- 将来実装予定の機能

### ⏳ 開発予定機能

- 記事編集機能
- 画像管理と自動挿入
- 内部リンク自動生成
- WordPress REST API連携
- スケジュール自動投稿

## 📖 使い方

### 1. ログイン

デフォルト管理者アカウント:
- **Email**: `admin@example.com`
- **Password**: `admin123`

または、新規登録から自分のアカウントを作成できます。

### 2. AI APIキーの設定（必須）

サイドバーから「**設定**」をクリック

#### オプションA: OpenAI APIキー
1. [OpenAI API Keys](https://platform.openai.com/api-keys) にアクセス
2. 新しいAPIキーを作成（`sk-...`）
3. 設定画面の「OpenAI APIキー」欄に貼り付け
4. 「OpenAI APIキーを保存」をクリック

#### オプションB: Anthropic (Claude) APIキー
1. [Anthropic Console](https://console.anthropic.com/settings/keys) にアクセス
2. 新しいAPIキーを作成（`sk-ant-...`）
3. 設定画面の「Anthropic APIキー」欄に貼り付け
4. 「Anthropic APIキーを保存」をクリック

**注意**: どちらか一方でOKです。両方設定した場合、OpenAIが優先的に使用されます。

### 3. コンテンツ作成

1. サイドバーから「**コンテンツ作成**」をクリック

2. **キーワード入力**:
   - キーワード: 例「AIブログ作成ツール」
   - 文字数目安: 3000文字（調整可能）
   - トーン: professional（調整可能）
   - 「アウトライン生成」をクリック

3. **アウトライン確認**:
   - 生成されたJSON形式のアウトラインを確認
   - 必要に応じて手動編集
   - 「記事執筆」をクリック

4. **記事編集**:
   - 生成された記事を確認
   - テキストエリアで自由に編集
   - 文字数カウント表示
   - 「リライト」で再生成（オプション）
   - 「記事を保存」で完成

5. **保存**:
   - タイトル入力
   - ステータス選択（下書き/レビュー中/公開済み）
   - 「保存」をクリック

### 4. 記事管理

1. サイドバーから「**記事一覧**」をクリック
2. 保存した記事の一覧が表示されます
3. ゴミ箱アイコンで記事を削除できます

## 🛠️ ローカル開発

### 環境変数設定

`.dev.vars` ファイルを作成:

```bash
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
JWT_SECRET=your_jwt_secret_key_here
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

### データベースマイグレーション

```bash
# ローカルD1データベースにマイグレーション適用
npm run db:migrate:local

# データベースコンソール（ローカル）
npm run db:console:local
```

### サーバー起動

```bash
# 依存関係インストール
npm install

# ビルド
npm run build

# 開発サーバー起動 (PM2)
pm2 start ecosystem.config.cjs

# ログ確認
pm2 logs ai-blog-cms --nostream

# サーバー再起動
pm2 restart ai-blog-cms

# サーバー停止
pm2 delete ai-blog-cms
```

### 便利なnpmスクリプト

```bash
# ポートクリーンアップ
npm run clean-port

# ヘルスチェック
npm run test

# データベースリセット（ローカル）
npm run db:reset
```

## 🚢 デプロイ

### Cloudflare Pagesへのデプロイ

1. **Cloudflare APIキーの設定**:
```bash
# setup_cloudflare_api_key ツールを使用
# または Deploy タブで設定
```

2. **プロジェクト作成**:
```bash
npx wrangler pages project create ai-blog-cms \
  --production-branch main \
  --compatibility-date 2024-01-01
```

3. **デプロイ**:
```bash
npm run build
npm run deploy
# または
npm run deploy:prod
```

4. **環境変数設定（本番環境）**:
```bash
# OpenAI APIキー
npx wrangler pages secret put OPENAI_API_KEY --project-name ai-blog-cms

# Anthropic APIキー
npx wrangler pages secret put ANTHROPIC_API_KEY --project-name ai-blog-cms

# JWT秘密鍵
npx wrangler pages secret put JWT_SECRET --project-name ai-blog-cms

# 管理者認証情報
npx wrangler pages secret put ADMIN_EMAIL --project-name ai-blog-cms
npx wrangler pages secret put ADMIN_PASSWORD --project-name ai-blog-cms
```

5. **D1データベースマイグレーション（本番）**:
```bash
npm run db:migrate:prod
```

## 🔧 トラブルシューティング

### タイムアウトエラー

**問題**: "応答時間が長すぎます" エラー

**原因と対策**:
1. **APIキーが未設定** → 設定画面でAPIキーを設定
2. **APIキーが無効** → OpenAI/Anthropicコンソールで確認
3. **クォータ超過** → アカウント残高を確認
4. **ネットワーク遅延** → 再試行してください

### ポート3000が使用中

```bash
npm run clean-port
# または
fuser -k 3000/tcp
```

### データベースリセット

```bash
npm run db:reset
```

### PM2でサーバーが起動しない

```bash
pm2 delete all
npm run build
pm2 start ecosystem.config.cjs
pm2 logs --nostream
```

### "Project ID and keyword are required" エラー

このエラーはv2.1で修正されました。最新版を使用してください。

## 📚 APIエンドポイント

### 認証 (/api/auth)
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `GET /api/auth/me` - 現在のユーザー情報
- `POST /api/auth/logout` - ログアウト

### キーワード (/api/keywords)
- `GET /api/keywords` - キーワード一覧
- `POST /api/keywords` - キーワード作成
- `DELETE /api/keywords/:id` - キーワード削除

### 記事 (/api/articles)
- `GET /api/articles` - 記事一覧
- `GET /api/articles/:id` - 記事詳細
- `POST /api/articles` - 記事作成
- `PUT /api/articles/:id` - 記事更新
- `DELETE /api/articles/:id` - 記事削除

### AI生成 (/api/generate)
- `POST /api/generate/outline` - 記事構成生成
- `POST /api/generate/article` - 記事本文生成
- `POST /api/generate/rewrite` - 記事リライト

### 設定 (/api/settings)
- `GET /api/settings/api-keys` - APIキー一覧
- `POST /api/settings/api-keys` - APIキー保存

## 📝 更新履歴

### v2.1 (2025-11-22)
- ✅ マルチAIプロバイダー対応（OpenAI + Anthropic）
- ✅ 統一AIインターフェース実装
- ✅ エラーハンドリング強化
- ✅ 設定画面改善（両AIサポート）

### v2.0 (2025-11-22)
- ✅ プロジェクト概念を削除、シンプル化
- ✅ 統合コンテンツ作成フロー実装
- ✅ ユーザー単位の管理に変更
- ✅ デフォルトプロンプト自動作成
- ✅ 設定画面・記事一覧・内部リンク管理追加

### v1.0
- ✅ 初版リリース
- ✅ JWT認証システム
- ✅ プロジェクト管理（削除予定）
- ✅ AI記事生成基本機能

## 📄 ライセンス

MIT License

## 👤 作成者

武宮太雅

## 📅 最終更新日

2025-11-22
