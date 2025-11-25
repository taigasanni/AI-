import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Env } from './types'

// API Routes
import auth from './routes/api/auth'
import users from './routes/api/users'
import articles from './routes/api/articles'
import keywords from './routes/api/keywords'
import generate from './routes/api/generate'
import settings from './routes/api/settings'
import prompts from './routes/api/prompts'
import reference from './routes/api/reference'
import models from './routes/api/models'
import decoration from './routes/api/decoration'
import blog from './routes/api/blog'
import publicArticlesApi from './routes/api/public-articles'
import internalLinksApi from './routes/api/internal-links'
import imageLibraryApi from './routes/api/image-library'
import supervisors from './routes/api/supervisors'

// Public Routes
import publicRoutes from './routes/public'

const app = new Hono<{ Bindings: Env }>()

// CORS設定
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// 静的ファイル配信
app.use('/static/*', serveStatic({ root: './public' }))

// Public Routes (認証不要)
app.route('/', publicRoutes)

// APIルート
app.route('/api/auth', auth)
app.route('/api/users', users)
app.route('/api/articles', articles)
app.route('/api/keywords', keywords)
app.route('/api/generate', generate)
app.route('/api/settings', settings)
app.route('/api/prompts', prompts)
app.route('/api/reference', reference)
app.route('/api/models', models)
app.route('/api/decoration-template', decoration)
app.route('/api/blog', blog)
app.route('/api/public/articles', publicArticlesApi)
app.route('/api/internal-links', internalLinksApi)
app.route('/api/image-library', imageLibraryApi)
app.route('/api/supervisors', supervisors)

// ヘルスチェック
app.get('/api/health', (c) => {
  return c.json({
    success: true,
    message: 'AI Blog CMS API is running',
    timestamp: new Date().toISOString()
  })
})

// 管理画面
app.get('/admin', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Blog CMS</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <!-- Quill.js リッチテキストエディター -->
        <link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet">
        <script src="https://cdn.quilljs.com/1.3.6/quill.js"></script>
        <!-- D3.js マインドマップ用 -->
        <script src="https://d3js.org/d3.v7.min.js"></script>
        <!-- Markdown Preview Styles -->
        <link href="/static/markdown-preview.css" rel="stylesheet">
        <style>
          .sidebar-link:hover {
            background-color: rgba(59, 130, 246, 0.1);
          }
          .sidebar-link.active {
            background-color: rgba(59, 130, 246, 0.2);
            border-left: 4px solid #3B82F6;
          }
          /* 記事プレビューのスタイル */
          .article-content h1 { font-size: 2.5rem; font-weight: bold; margin-top: 2rem; margin-bottom: 1rem; }
          .article-content h2 { font-size: 2rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.75rem; }
          .article-content h3 { font-size: 1.5rem; font-weight: bold; margin-top: 1.25rem; margin-bottom: 0.5rem; }
          .article-content p { margin-bottom: 1rem; line-height: 1.75; }
          .article-content ul, .article-content ol { margin-left: 2rem; margin-bottom: 1rem; }
          .article-content li { margin-bottom: 0.5rem; }
          .article-content a { color: #2563eb; text-decoration: underline; }
          .article-content strong { font-weight: bold; }
          .article-content em { font-style: italic; }
          .article-content code { background-color: #f3f4f6; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-family: monospace; }
          /* Quill.js エディター */
          .ql-container { min-height: 400px; font-size: 16px; }
          .ql-editor { min-height: 400px; }
          .ql-editor p { margin-bottom: 1em; }
          /* AIアシスタントポップアップ */
          .ai-assistant-popup { position: absolute; z-index: 1000; background: white; border: 2px solid #3b82f6; border-radius: 8px; padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        </style>
    </head>
    <body class="bg-gray-50">
        <!-- ログイン画面 -->
        <div id="login-screen" class="min-h-screen flex items-center justify-center px-4">
            <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
                <div class="text-center mb-8">
                    <i class="fas fa-robot text-5xl text-blue-600 mb-4"></i>
                    <h1 class="text-3xl font-bold text-gray-800">AI Blog CMS</h1>
                    <p class="text-gray-600 mt-2">シンプルなAIブログ管理システム</p>
                </div>
                
                <div id="login-form">
                    <div class="mb-4">
                        <label class="block text-gray-700 text-sm font-bold mb-2">メールアドレス</label>
                        <input type="email" id="login-email" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="email@example.com">
                    </div>
                    <div class="mb-6">
                        <label class="block text-gray-700 text-sm font-bold mb-2">パスワード</label>
                        <input type="password" id="login-password" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="パスワード">
                    </div>
                    <button onclick="handleLogin()" class="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition duration-200">
                        <i class="fas fa-sign-in-alt mr-2"></i>ログイン
                    </button>
                    <div class="text-center mt-4 text-sm text-gray-500">
                        <i class="fas fa-lock mr-1"></i>招待制システム - アクセス権限が必要です
                    </div>
                </div>

                <div id="message" class="mt-4 text-center text-sm"></div>
            </div>
        </div>

        <!-- メイン画面 (ログイン後に表示) -->
        <div id="main-screen" class="hidden min-h-screen flex">
            <!-- サイドバー -->
            <aside class="w-64 bg-white shadow-lg">
                <div class="p-6 border-b">
                    <h2 class="text-xl font-bold text-gray-800">
                        <i class="fas fa-robot text-blue-600 mr-2"></i>
                        AI Blog CMS
                    </h2>
                    <p class="text-sm text-gray-600 mt-1" id="user-info"></p>
                </div>
                <nav class="p-4">
                    <a href="#" onclick="showContentCreation()" data-page="content" class="sidebar-link active flex items-center px-4 py-3 text-gray-700 rounded-lg mb-2">
                        <i class="fas fa-edit w-6"></i>
                        <span>コンテンツ作成</span>
                    </a>
                    <a href="#" onclick="showArticleList()" data-page="articles" class="sidebar-link flex items-center px-4 py-3 text-gray-700 rounded-lg mb-2">
                        <i class="fas fa-file-alt w-6"></i>
                        <span>記事一覧</span>
                    </a>
                    <a href="#" onclick="showBlogList()" data-page="blog" class="sidebar-link flex items-center px-4 py-3 text-gray-700 rounded-lg mb-2">
                        <i class="fas fa-globe w-6"></i>
                        <span>ブログ</span>
                    </a>
                    <a href="#" onclick="event.preventDefault(); showInternalLinks(); return false;" data-page="links" class="sidebar-link flex items-center px-4 py-3 text-gray-700 rounded-lg mb-2">
                        <i class="fas fa-link w-6"></i>
                        <span>内部リンク管理</span>
                    </a>
                    <a href="#" onclick="event.preventDefault(); showImageLibrary(); return false;" data-page="images" class="sidebar-link flex items-center px-4 py-3 text-gray-700 rounded-lg mb-2">
                        <i class="fas fa-images w-6"></i>
                        <span>画像ライブラリ</span>
                    </a>

                    <a href="#" onclick="event.preventDefault(); showUserManagement(); return false;" data-page="users" class="sidebar-link flex items-center px-4 py-3 text-gray-700 rounded-lg mb-2">
                        <i class="fas fa-users w-6"></i>
                        <span>ユーザー管理</span>
                    </a>
                    <div class="border-t my-4"></div>
                    <a href="#" onclick="showSettings()" data-page="settings" class="sidebar-link flex items-center px-4 py-3 text-gray-700 rounded-lg mb-2">
                        <i class="fas fa-cog w-6"></i>
                        <span>設定</span>
                    </a>
                    <a href="#" onclick="handleLogout()" class="flex items-center px-4 py-3 text-red-600 rounded-lg hover:bg-red-50">
                        <i class="fas fa-sign-out-alt w-6"></i>
                        <span>ログアウト</span>
                    </a>
                </nav>
            </aside>

            <!-- メインコンテンツ -->
            <main class="flex-1 p-8 overflow-auto bg-gray-50">
                <div id="content-area"></div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app-v2.js?v=9"></script>
        <script src="/static/internal-links.js?v=9"></script>
        <script src="/static/image-library.js?v=6"></script>
        <script src="/static/user-management.js?v=6"></script>
    </body>
    </html>
  `)
})

export default app
