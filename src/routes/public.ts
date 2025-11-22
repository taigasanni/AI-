// ===================================
// 公開ページルート（認証不要）
// ===================================

import { Hono } from 'hono';
import type { Env } from '../types';

const publicRoutes = new Hono<{ Bindings: Env }>();

/**
 * GET / - トップページ（管理画面へリダイレクト）
 */
publicRoutes.get('/', (c) => {
  return c.redirect('/admin');
});

/**
 * GET /blog/:id - 記事公開ページ（IDまたはslug）
 */
publicRoutes.get('/blog/:id', async (c) => {
  try {
    const idOrSlug = c.req.param('id');

    // IDまたはslugで公開済みの記事を取得
    const article = await c.env.DB.prepare(
      `SELECT a.*, u.name as author_name 
       FROM articles a 
       JOIN users u ON a.user_id = u.id 
       WHERE (a.id = ? OR a.slug = ?) AND a.status = 'published'`
    ).bind(idOrSlug, idOrSlug).first();

    if (!article) {
      return c.html(`
        <!DOCTYPE html>
        <html lang="ja">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>記事が見つかりません - AI Blog CMS</title>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-50">
            <div class="min-h-screen flex items-center justify-center px-4">
                <div class="max-w-md w-full text-center">
                    <i class="fas fa-exclamation-triangle text-6xl text-yellow-500 mb-4"></i>
                    <h1 class="text-2xl font-bold text-gray-800 mb-2">記事が見つかりません</h1>
                    <p class="text-gray-600">指定された記事は存在しないか、まだ公開されていません。</p>
                </div>
            </div>
        </body>
        </html>
      `, 404);
    }

    return c.html(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${article.title} - AI Blog CMS</title>
          ${article.meta_description ? `<meta name="description" content="${article.meta_description}">` : ''}
          ${article.og_image_url ? `<meta property="og:image" content="${article.og_image_url}">` : ''}
          <meta property="og:title" content="${article.title}">
          <meta property="og:type" content="article">
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
          <link href="/static/markdown-preview.css" rel="stylesheet">
          <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
          <style>
            .article-content {
              line-height: 1.8;
            }
            .article-content h1 {
              font-size: 2em;
              font-weight: bold;
              margin-top: 1em;
              margin-bottom: 0.5em;
            }
            .article-content h2 {
              font-size: 1.5em;
              font-weight: bold;
              margin-top: 1em;
              margin-bottom: 0.5em;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 0.3em;
            }
            .article-content h3 {
              font-size: 1.25em;
              font-weight: bold;
              margin-top: 0.8em;
              margin-bottom: 0.4em;
            }
            .article-content p {
              margin-bottom: 1em;
            }
            .article-content ul, .article-content ol {
              margin-left: 2em;
              margin-bottom: 1em;
            }
            .article-content li {
              margin-bottom: 0.5em;
            }
            .article-content code {
              background-color: #f3f4f6;
              padding: 0.2em 0.4em;
              border-radius: 3px;
              font-family: monospace;
            }
            .article-content pre {
              background-color: #f3f4f6;
              padding: 1em;
              border-radius: 6px;
              overflow-x: auto;
              margin-bottom: 1em;
            }
            .article-content blockquote {
              border-left: 4px solid #3b82f6;
              padding-left: 1em;
              margin-left: 0;
              margin-bottom: 1em;
              color: #4b5563;
            }
            .article-content a {
              color: #3b82f6;
              text-decoration: underline;
            }
            .article-content img {
              max-width: 100%;
              height: auto;
              margin: 1em 0;
            }
          </style>
      </head>
      <body class="bg-gray-50">
          <!-- ヘッダー -->
          <header class="bg-white shadow">
              <div class="max-w-4xl mx-auto px-4 py-6">
                  <div class="flex items-center justify-between">
                      <h1 class="text-2xl font-bold text-gray-800">
                          <i class="fas fa-newspaper mr-2 text-blue-600"></i>
                          AI Blog CMS
                      </h1>
                      <a href="/" class="text-blue-600 hover:text-blue-800">
                          <i class="fas fa-home mr-1"></i>ホーム
                      </a>
                  </div>
              </div>
          </header>

          <!-- 記事コンテンツ -->
          <main class="max-w-4xl mx-auto px-4 py-8">
              <article class="bg-white rounded-lg shadow-lg p-8">
                  <!-- 記事ヘッダー -->
                  <header class="mb-8 pb-6 border-b">
                      <h1 class="text-4xl font-bold text-gray-900 mb-4">${article.title}</h1>
                      <div class="flex items-center text-sm text-gray-600">
                          <i class="fas fa-user mr-2"></i>
                          <span class="mr-4">${article.author_name}</span>
                          <i class="fas fa-calendar mr-2"></i>
                          <span>${new Date(article.created_at).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}</span>
                      </div>
                  </header>

                  <!-- 記事本文 -->
                  <div id="article-body" class="article-content text-gray-800">
                      <!-- Markdown will be rendered here -->
                  </div>
              </article>

              <!-- シェアボタン -->
              <div class="mt-8 text-center">
                  <div class="inline-flex gap-4">
                      <button onclick="shareTwitter()" class="bg-blue-400 text-white px-6 py-3 rounded-lg hover:bg-blue-500">
                          <i class="fab fa-twitter mr-2"></i>Twitterでシェア
                      </button>
                      <button onclick="shareFacebook()" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700">
                          <i class="fab fa-facebook mr-2"></i>Facebookでシェア
                      </button>
                      <button onclick="copyUrl()" class="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700">
                          <i class="fas fa-link mr-2"></i>URLをコピー
                      </button>
                  </div>
              </div>
          </main>

          <!-- フッター -->
          <footer class="bg-white shadow mt-12">
              <div class="max-w-4xl mx-auto px-4 py-6 text-center text-gray-600">
                  <p>&copy; 2025 AI Blog CMS. All rights reserved.</p>
              </div>
          </footer>

          <script>
              // Markdownをレンダリング
              const content = ${JSON.stringify(article.content || '')};
              const html = marked.parse(content);
              document.getElementById('article-body').innerHTML = html;

              // シェア機能
              const currentUrl = window.location.href;
              const title = ${JSON.stringify(article.title)};

              function shareTwitter() {
                  const url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(currentUrl);
                  window.open(url, '_blank');
              }

              function shareFacebook() {
                  const url = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(currentUrl);
                  window.open(url, '_blank');
              }

              function copyUrl() {
                  navigator.clipboard.writeText(currentUrl).then(() => {
                      alert('URLをコピーしました！');
                  });
              }
          </script>
      </body>
      </html>
    `);

  } catch (error: any) {
    console.error('Public article error:', error);
    return c.html(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
          <meta charset="UTF-8">
          <title>エラー</title>
          <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-50">
          <div class="min-h-screen flex items-center justify-center px-4">
              <div class="max-w-md w-full text-center">
                  <h1 class="text-2xl font-bold text-red-600 mb-2">エラーが発生しました</h1>
                  <p class="text-gray-600">${error.message}</p>
              </div>
          </div>
      </body>
      </html>
    `, 500);
  }
});

/**
 * GET /blog - ブログ記事一覧ページ
 */
publicRoutes.get('/blog', async (c) => {
  try {
    const articles = await c.env.DB.prepare(
      `SELECT a.*, u.name as author_name 
       FROM articles a 
       JOIN users u ON a.user_id = u.id 
       WHERE a.status = 'published' 
       ORDER BY a.created_at DESC 
       LIMIT 50`
    ).all();

    const articleList = articles.results || [];

    return c.html(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>記事一覧 - AI Blog CMS</title>
          <meta name="description" content="AI Blog CMSで管理されているブログ記事一覧">
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
      </head>
      <body class="bg-gray-50">
          <!-- ヘッダー -->
          <header class="bg-white shadow">
              <div class="max-w-6xl mx-auto px-4 py-6">
                  <h1 class="text-3xl font-bold text-gray-800">
                      <i class="fas fa-newspaper mr-2 text-blue-600"></i>
                      ブログ記事一覧
                  </h1>
              </div>
          </header>

          <!-- 記事一覧 -->
          <main class="max-w-6xl mx-auto px-4 py-8">
              ${articleList.length === 0 ? `
                <div class="bg-white rounded-lg shadow p-12 text-center">
                    <i class="fas fa-inbox text-6xl text-gray-400 mb-4"></i>
                    <p class="text-xl text-gray-600">まだ公開記事がありません</p>
                </div>
              ` : `
                <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    ${articleList.map((article: any) => `
                      <article class="bg-white rounded-lg shadow hover:shadow-lg transition">
                          <a href="/blog/${article.slug || article.id}" class="block p-6">
                              <h2 class="text-xl font-bold text-gray-900 mb-2 hover:text-blue-600">
                                  ${article.title}
                              </h2>
                              ${article.meta_description ? `
                                <p class="text-gray-600 mb-4">${article.meta_description.substring(0, 100)}...</p>
                              ` : ''}
                              <div class="flex items-center text-sm text-gray-500">
                                  <i class="fas fa-user mr-2"></i>
                                  <span class="mr-4">${article.author_name}</span>
                                  <i class="fas fa-calendar mr-2"></i>
                                  <span>${new Date(article.created_at).toLocaleDateString('ja-JP')}</span>
                              </div>
                          </a>
                      </article>
                    `).join('')}
                </div>
              `}
          </main>

          <!-- フッター -->
          <footer class="bg-white shadow mt-12">
              <div class="max-w-6xl mx-auto px-4 py-6 text-center text-gray-600">
                  <p>&copy; 2025 AI Blog CMS. All rights reserved.</p>
              </div>
          </footer>
      </body>
      </html>
    `);

  } catch (error: any) {
    console.error('Public articles list error:', error);
    return c.text('Internal Server Error', 500);
  }
});

export default publicRoutes;
