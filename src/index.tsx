import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Env } from './types'

// API Routes
import auth from './routes/api/auth'
import articles from './routes/api/articles'
import keywords from './routes/api/keywords'
import generate from './routes/api/generate'
import settings from './routes/api/settings'
import prompts from './routes/api/prompts'

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
app.route('/api/articles', articles)
app.route('/api/keywords', keywords)
app.route('/api/generate', generate)
app.route('/api/settings', settings)
app.route('/api/prompts', prompts)

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
        <style>
          .sidebar-link:hover {
            background-color: rgba(59, 130, 246, 0.1);
          }
          .sidebar-link.active {
            background-color: rgba(59, 130, 246, 0.2);
            border-left: 4px solid #3B82F6;
          }
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
                    <div class="text-center mt-4">
                        <a href="#" onclick="showRegister()" class="text-blue-600 hover:underline text-sm">新規登録はこちら</a>
                    </div>
                </div>

                <div id="register-form" class="hidden">
                    <div class="mb-4">
                        <label class="block text-gray-700 text-sm font-bold mb-2">名前</label>
                        <input type="text" id="register-name" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="山田太郎">
                    </div>
                    <div class="mb-4">
                        <label class="block text-gray-700 text-sm font-bold mb-2">メールアドレス</label>
                        <input type="email" id="register-email" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="email@example.com">
                    </div>
                    <div class="mb-6">
                        <label class="block text-gray-700 text-sm font-bold mb-2">パスワード (8文字以上)</label>
                        <input type="password" id="register-password" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="パスワード">
                    </div>
                    <button onclick="handleRegister()" class="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition duration-200">
                        <i class="fas fa-user-plus mr-2"></i>新規登録
                    </button>
                    <div class="text-center mt-4">
                        <a href="#" onclick="showLogin()" class="text-blue-600 hover:underline text-sm">ログインはこちら</a>
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
                    <a href="#" onclick="showInternalLinks()" data-page="links" class="sidebar-link flex items-center px-4 py-3 text-gray-700 rounded-lg mb-2">
                        <i class="fas fa-link w-6"></i>
                        <span>内部リンク管理</span>
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
        <script src="/static/app-v2.js"></script>
    </body>
    </html>
  `)
})

export default app
