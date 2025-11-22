import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Env } from './types'

// API Routes
import auth from './routes/api/auth'
import projects from './routes/api/projects'
import keywords from './routes/api/keywords'
import articles from './routes/api/articles'
import generate from './routes/api/generate'
import settings from './routes/api/settings'

const app = new Hono<{ Bindings: Env }>()

// CORS設定
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// 静的ファイル配信
app.use('/static/*', serveStatic({ root: './public' }))

// APIルート
app.route('/api/auth', auth)
app.route('/api/projects', projects)
app.route('/api/keywords', keywords)
app.route('/api/articles', articles)
app.route('/api/generate', generate)
app.route('/api/settings', settings)

// ヘルスチェック
app.get('/api/health', (c) => {
  return c.json({
    success: true,
    message: 'AI Blog CMS API is running',
    timestamp: new Date().toISOString()
  })
})

// ルートページ - 管理画面
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI自動ブログ投稿CMS</title>
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
                    <p class="text-gray-600 mt-2">AI自動ブログ投稿システム</p>
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
                    <a href="#" onclick="showDashboard()" class="sidebar-link active flex items-center px-4 py-3 text-gray-700 rounded-lg mb-2">
                        <i class="fas fa-home w-6"></i>
                        <span>ダッシュボード</span>
                    </a>
                    <a href="#" onclick="showProjects()" class="sidebar-link flex items-center px-4 py-3 text-gray-700 rounded-lg mb-2">
                        <i class="fas fa-folder w-6"></i>
                        <span>プロジェクト</span>
                    </a>
                    <a href="#" onclick="showKeywords()" class="sidebar-link flex items-center px-4 py-3 text-gray-700 rounded-lg mb-2">
                        <i class="fas fa-key w-6"></i>
                        <span>キーワード</span>
                    </a>
                    <a href="#" onclick="showArticles()" class="sidebar-link flex items-center px-4 py-3 text-gray-700 rounded-lg mb-2">
                        <i class="fas fa-file-alt w-6"></i>
                        <span>記事管理</span>
                    </a>
                    <a href="#" onclick="showGenerate()" class="sidebar-link flex items-center px-4 py-3 text-gray-700 rounded-lg mb-2">
                        <i class="fas fa-magic w-6"></i>
                        <span>AI記事生成</span>
                    </a>
                    <div class="border-t my-4"></div>
                    <a href="#" onclick="showSettings()" class="sidebar-link flex items-center px-4 py-3 text-gray-700 rounded-lg mb-2">
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
            <main class="flex-1 p-8 overflow-auto">
                <div id="content-area">
                    <h1 class="text-3xl font-bold text-gray-800 mb-6">ダッシュボード</h1>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="bg-white p-6 rounded-lg shadow">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-600 text-sm">プロジェクト数</p>
                                    <p class="text-3xl font-bold text-blue-600" id="project-count">0</p>
                                </div>
                                <i class="fas fa-folder text-4xl text-blue-200"></i>
                            </div>
                        </div>
                        <div class="bg-white p-6 rounded-lg shadow">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-600 text-sm">総記事数</p>
                                    <p class="text-3xl font-bold text-green-600" id="article-count">0</p>
                                </div>
                                <i class="fas fa-file-alt text-4xl text-green-200"></i>
                            </div>
                        </div>
                        <div class="bg-white p-6 rounded-lg shadow">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-gray-600 text-sm">キーワード数</p>
                                    <p class="text-3xl font-bold text-purple-600" id="keyword-count">0</p>
                                </div>
                                <i class="fas fa-key text-4xl text-purple-200"></i>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-8 bg-white p-6 rounded-lg shadow">
                        <h2 class="text-xl font-bold text-gray-800 mb-4">クイックスタート</h2>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button onclick="showProjects()" class="flex items-center p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition">
                                <i class="fas fa-plus-circle text-3xl text-blue-600 mr-4"></i>
                                <div class="text-left">
                                    <p class="font-bold text-gray-800">新規プロジェクト作成</p>
                                    <p class="text-sm text-gray-600">サイト・メディアを追加</p>
                                </div>
                            </button>
                            <button onclick="showGenerate()" class="flex items-center p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition">
                                <i class="fas fa-magic text-3xl text-green-600 mr-4"></i>
                                <div class="text-left">
                                    <p class="font-bold text-gray-800">AI記事生成</p>
                                    <p class="text-sm text-gray-600">キーワードから記事を生成</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
