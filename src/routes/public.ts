// ===================================
// 公開ページルート（認証不要）
// ===================================

import { Hono } from 'hono';
import type { Env } from '../types';

const publicRoutes = new Hono<{ Bindings: Env }>();

/**
 * H2見出し配下に画像を自動挿入する関数
 */
function insertHeadingImages(content: string, images: any[]): string {
  const lines = content.split('\n');
  const processedLines: string[] = [];
  let insertedCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    processedLines.push(line);
    
    // H2見出し行を検出
    const h2Match = line.match(/^##\s+(.+)$/);
    
    if (h2Match) {
      const headingText = h2Match[1].trim();
      
      // この見出しに対応する画像を検索
      const matchingImage = images.find(img => img.heading_text === headingText);
      
      if (matchingImage) {
        // 見出しの直後に空行と画像を挿入
        processedLines.push('');
        processedLines.push(generateImageHtml(matchingImage));
        processedLines.push('');
        insertedCount++;
      }
    }
  }
  
  return processedLines.join('\n');
}

/**
 * 画像HTMLを生成する関数
 */
function generateImageHtml(image: any): string {
  const width = image.width || 800;
  const height = image.height || 450;
  const altText = image.alt_text || '記事の画像';
  
  return `
<figure style="margin: 2rem 0;">
  <img 
    src="${image.image_url}" 
    alt="${altText}" 
    width="${width}" 
    height="${height}"
    style="width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
    loading="lazy"
  />
</figure>
`.trim();
}

/**
 * Markdown本文に内部リンクを挿入する関数
 * 指定された見出しのセクションの最下部（次の見出しの直前）に挿入する
 */
function insertInternalLinks(content: string, links: any[]): string {
  const lines = content.split('\n');
  const processedLines: string[] = [];
  
  // 各見出しとその内容を追跡
  const headingSections: Map<string, { startIndex: number, links: any[] }> = new Map();
  
  // まず、見出しとそれに対応する内部リンクをマッピング
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      const headingText = headingMatch[2].trim();
      
      // この見出しに対応する内部リンクを検索
      const matchingLinks = links.filter(link => {
        if (link.to_heading) {
          return link.to_heading === headingText;
        }
        return false;
      });
      
      if (matchingLinks.length > 0) {
        headingSections.set(headingText, { startIndex: i, links: matchingLinks });
      }
    }
  }
  
  // 次に、各見出しセクションの終わり（次の見出しの直前）にブログカードを挿入
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    processedLines.push(line);
    
    // 次の行が見出しかチェック
    const nextLineIndex = i + 1;
    if (nextLineIndex < lines.length) {
      const nextLine = lines[nextLineIndex];
      const nextIsHeading = nextLine.match(/^(#{1,6})\s+(.+)$/);
      
      // 次の行が見出しの場合、現在のセクションの終わり
      if (nextIsHeading) {
        // 前の見出しに対応するブログカードがあるか確認
        for (const [headingText, section] of headingSections.entries()) {
          if (section.startIndex < i && section.startIndex < nextLineIndex) {
            // このセクションの終わりにブログカードを挿入
            processedLines.push('');
            
            section.links.forEach((link: any) => {
              const blogCard = generateBlogCard(link);
              processedLines.push(blogCard);
              processedLines.push('');
            });
            
            // 一度挿入したら削除
            headingSections.delete(headingText);
            break;
          }
        }
      }
    }
  }
  
  // 最後のセクションに対応するブログカードを挿入（ファイルの最後）
  for (const [headingText, section] of headingSections.entries()) {
    processedLines.push('');
    
    section.links.forEach((link: any) => {
      const blogCard = generateBlogCard(link);
      processedLines.push(blogCard);
      processedLines.push('');
    });
  }
  
  // to_headingが指定されていないリンク（記事全体へのリンク）を先頭に追加
  const articleLevelLinks = links.filter(link => !link.to_heading);
  if (articleLevelLinks.length > 0) {
    const linkLines: string[] = [''];
    articleLevelLinks.forEach(link => {
      const blogCard = generateBlogCard(link);
      linkLines.push(blogCard);
      linkLines.push('');
    });
    processedLines.unshift(...linkLines);
  }
  
  return processedLines.join('\n');
}

/**
 * ブログカードHTMLを生成する関数（改善版 - アイキャッチ画像対応）
 * マークダウンパーサーがHTMLとして正しく認識できるようにする
 */
function generateBlogCard(link: any): string {
  const articleIdentifier = link.from_article_slug || link.from_article_id;
  
  const linkUrl = link.from_heading_id 
    ? `/blog/${articleIdentifier}#${link.from_heading_id}`
    : `/blog/${articleIdentifier}`;
  
  const description = link.from_article_description || 'この記事で詳しく解説しています。';
  const publishedDate = link.from_article_published_at 
    ? new Date(link.from_article_published_at).toLocaleDateString('ja-JP')
    : '';
  
  const imageUrl = link.from_article_image_url;
  
  // 画像がある場合とない場合でレイアウトを分ける
  if (imageUrl) {
    // 画像付きレイアウト: 左側にサムネイル、右側にテキスト
    return `<div class="blog-card-wrapper" style="margin:2rem 0;padding:2px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)"><a href="${linkUrl}" style="display:flex;gap:1rem;text-decoration:none;background:white;border-radius:10px;padding:1rem;transition:all 0.3s ease" onmouseover="this.parentElement.style.transform='translateY(-4px)';this.parentElement.style.boxShadow='0 12px 24px rgba(102,126,234,0.3)'" onmouseout="this.parentElement.style.transform='translateY(0)';this.parentElement.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)'"><div style="flex-shrink:0;width:120px;height:120px;overflow:hidden;border-radius:8px;background:#f3f4f6"><img src="${imageUrl}" alt="${link.from_article_title}" style="width:100%;height:100%;object-fit:cover" loading="lazy"></div><div style="flex:1;min-width:0;display:flex;flex-direction:column"><div style="display:flex;align-items:center;margin-bottom:0.5rem;flex-wrap:wrap"><span style="display:inline-block;background:#f3f4f6;color:#4b5563;padding:0.25rem 0.75rem;border-radius:6px;font-size:0.75rem;font-weight:600;margin-right:0.5rem">🔗 関連記事</span>${publishedDate ? `<span style="color:#9ca3af;font-size:0.875rem">${publishedDate}</span>` : ''}</div><h3 style="font-size:1.1rem;font-weight:bold;color:#1f2937;margin:0 0 0.5rem 0;line-height:1.3;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${link.from_article_title}</h3><p style="color:#6b7280;font-size:0.8rem;line-height:1.5;margin:0 0 0.75rem 0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${description}</p><div style="display:flex;align-items:center;color:#667eea;font-weight:600;font-size:0.875rem;margin-top:auto"><span>${link.link_text}</span><svg style="width:1rem;height:1rem;margin-left:0.5rem" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></div></div></a></div>`;
  } else {
    // 画像なしレイアウト: 従来通りのテキストのみ
    return `<div class="blog-card-wrapper" style="margin:2rem 0;padding:2px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1)"><a href="${linkUrl}" style="display:block;text-decoration:none;background:white;border-radius:10px;padding:1.5rem;transition:all 0.3s ease" onmouseover="this.parentElement.style.transform='translateY(-4px)';this.parentElement.style.boxShadow='0 12px 24px rgba(102,126,234,0.3)'" onmouseout="this.parentElement.style.transform='translateY(0)';this.parentElement.style.boxShadow='0 4px 6px rgba(0,0,0,0.1)'"><div style="display:flex;align-items:center;margin-bottom:0.75rem"><span style="display:inline-block;background:#f3f4f6;color:#4b5563;padding:0.25rem 0.75rem;border-radius:6px;font-size:0.75rem;font-weight:600;margin-right:0.5rem">🔗 関連記事</span>${publishedDate ? `<span style="color:#9ca3af;font-size:0.875rem">${publishedDate}</span>` : ''}</div><h3 style="font-size:1.25rem;font-weight:bold;color:#1f2937;margin:0 0 0.5rem 0;line-height:1.4">${link.from_article_title}</h3><p style="color:#6b7280;font-size:0.875rem;line-height:1.6;margin:0 0 1rem 0">${description}</p><div style="display:flex;align-items:center;color:#667eea;font-weight:600;font-size:0.875rem"><span>${link.link_text}</span><svg style="width:1rem;height:1rem;margin-left:0.5rem" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></div></a></div>`;
  }
}

/**
 * GET / - トップページ（ブログ一覧を表示）
 */
publicRoutes.get('/', async (c) => {
  // 全ユーザーの公開記事を表示（アイキャッチ画像も取得）
  const articles = await c.env.DB.prepare(
    `SELECT a.id, a.title, a.meta_description, a.content, a.target_keywords, 
            a.og_image_url, a.published_at, a.created_at, u.name as author_name
     FROM articles a 
     JOIN users u ON a.user_id = u.id 
     WHERE a.status = 'published'
     ORDER BY a.published_at DESC, a.created_at DESC
     LIMIT 20`
  ).all();

  // 見出し画像を取得（アイキャッチのフォールバック用）
  const headingImages = await c.env.DB.prepare(
    `SELECT hi.*, il.image_url, il.alt_text
     FROM heading_images hi
     JOIN image_library il ON hi.image_name = il.image_name`
  ).all();

  // 各記事のアイキャッチ画像を決定
  const articlesList = (articles.results || []).map((article: any) => {
    let featuredImageUrl = article.og_image_url;
    
    // og_image_urlがない場合、最初のH2画像を使用
    if (!featuredImageUrl && article.content) {
      const h2Match = article.content.match(/^##\s+(.+)$/m);
      if (h2Match && headingImages.results) {
        const firstH2Text = h2Match[1].trim();
        const matchingImage = (headingImages.results as any[]).find(
          (img: any) => img.heading_text === firstH2Text
        );
        if (matchingImage) {
          featuredImageUrl = matchingImage.image_url;
        }
      }
    }
    
    return {
      ...article,
      featured_image_url: featuredImageUrl
    };
  });

  return c.html(`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ブログ - AI Blog CMS</title>
        <meta name="description" content="AI Blog CMSで作成された記事一覧">
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <header class="bg-white shadow">
            <div class="max-w-6xl mx-auto px-4 py-6">
                <h1 class="text-3xl font-bold text-gray-800">
                    <i class="fas fa-blog mr-2 text-blue-600"></i>ブログ
                </h1>
            </div>
        </header>
        
        <main class="max-w-6xl mx-auto px-4 py-8">
            ${articlesList.length === 0 ? `
                <div class="text-center py-16">
                    <i class="fas fa-inbox text-6xl text-gray-400 mb-4"></i>
                    <h2 class="text-2xl font-bold text-gray-600 mb-2">まだ記事がありません</h2>
                    <p class="text-gray-500">公開された記事がここに表示されます</p>
                </div>
            ` : `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${articlesList.map((article: any) => `
                        <article class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition">
                            ${article.featured_image_url ? `
                                <a href="/blog/${article.id}">
                                    <img src="${article.featured_image_url}" 
                                         alt="${article.title}" 
                                         class="w-full h-48 object-cover"
                                         loading="lazy">
                                </a>
                            ` : ''}
                            <div class="p-6">
                                <h2 class="text-xl font-bold text-gray-800 mb-3 line-clamp-2">
                                    ${article.title}
                                </h2>
                                <p class="text-gray-600 text-sm mb-4 line-clamp-3">
                                    ${article.meta_description || article.content?.substring(0, 150) || ''}...
                                </p>
                                <div class="flex justify-between items-center text-sm text-gray-500 mb-4">
                                    <span>
                                        <i class="far fa-calendar mr-1"></i>
                                        ${new Date(article.published_at || article.created_at).toLocaleDateString('ja-JP')}
                                    </span>
                                    <span>
                                        <i class="far fa-user mr-1"></i>
                                        ${article.author_name}
                                    </span>
                                </div>
                                ${article.target_keywords ? `
                                    <div class="mb-4">
                                        ${article.target_keywords.split(',').slice(0, 3).map((kw: string) => `
                                            <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 mb-2">
                                                ${kw.trim()}
                                            </span>
                                        `).join('')}
                                    </div>
                                ` : ''}
                                <a href="/blog/${article.id}" 
                                   class="block text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
                                    <i class="fas fa-arrow-right mr-2"></i>続きを読む
                                </a>
                            </div>
                        </article>
                    `).join('')}
                </div>
            `}
        </main>
        
        <footer class="bg-white border-t mt-16">
            <div class="max-w-6xl mx-auto px-4 py-6 text-center text-gray-600">
                <p>Powered by AI Blog CMS</p>
            </div>
        </footer>
    </body>
    </html>
  `);
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

    // 内部リンクを取得（この記事がリンク先となっているもの + アイキャッチ画像も取得）
    const internalLinks = await c.env.DB.prepare(
      `SELECT 
        il.*,
        fa.slug as from_article_slug,
        fa.title as from_article_title,
        fa.meta_description as from_article_description,
        fa.published_at as from_article_published_at,
        fa.og_image_url as from_article_image_url
       FROM internal_links il
       JOIN articles fa ON il.from_article_id = fa.id
       WHERE il.to_article_id = ?
       ORDER BY il.position ASC`
    ).bind(article.id).all();

    // 見出しと画像のマッピングを取得
    const headingImages = await c.env.DB.prepare(
      `SELECT hi.*, il.image_url, il.alt_text, il.width, il.height
       FROM heading_images hi
       JOIN image_library il ON hi.image_name = il.image_name`
    ).all();

    // 画像と内部リンクを本文に挿入
    let contentWithEnhancements = article.content;
    
    // 1. まず画像を挿入
    if (headingImages.results && headingImages.results.length > 0) {
      contentWithEnhancements = insertHeadingImages(
        contentWithEnhancements,
        headingImages.results as any[]
      );
    }
    
    // 2. 次に内部リンクを挿入
    if (internalLinks.results && internalLinks.results.length > 0) {
      contentWithEnhancements = insertInternalLinks(
        contentWithEnhancements, 
        internalLinks.results as any[]
      );
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
          <link href="/api/decoration-template/css" rel="stylesheet">
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
              scroll-margin-top: 100px; /* スクロール時のオフセット */
            }
            .article-content h2 {
              font-size: 1.5em;
              font-weight: bold;
              margin-top: 1em;
              margin-bottom: 0.5em;
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 0.3em;
              scroll-margin-top: 100px; /* スクロール時のオフセット */
            }
            .article-content h3 {
              font-size: 1.25em;
              font-weight: bold;
              margin-top: 0.8em;
              margin-bottom: 0.4em;
              scroll-margin-top: 100px; /* スクロール時のオフセット */
            }
            
            /* 目次のスタイル */
            #table-of-contents {
              background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
              border: 2px solid #3b82f6;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(59, 130, 246, 0.1);
            }
            
            #table-of-contents h2 {
              border-bottom: 2px solid #3b82f6 !important;
              padding-bottom: 0.5rem !important;
              margin: 0 0 1rem 0 !important;
            }
            
            #toc-list a {
              display: flex;
              align-items: center;
              text-decoration: none;
              transition: all 0.2s;
            }
            
            #toc-list a:hover {
              transform: translateX(4px);
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
              background: #f3f4f6;
              padding: 1em;
              margin: 1em 0;
              border-radius: 8px;
              border: none;
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

                  <!-- アイキャッチ画像（タイトル直下） -->
                  <div id="featured-image-container"></div>

                  <!-- 目次 -->
                  <div id="table-of-contents" class="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8" style="display: none;">
                      <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                          <i class="fas fa-list text-blue-600 mr-2"></i>
                          目次
                      </h2>
                      <nav id="toc-list" class="space-y-2">
                          <!-- 目次項目が自動生成されます -->
                      </nav>
                  </div>

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
              // アイキャッチ画像の取得と表示
              const ogImageUrl = ${JSON.stringify(article.og_image_url || '')};
              const content = ${JSON.stringify(contentWithEnhancements || '')};
              const headingImages = ${JSON.stringify(headingImages.results || [])};
              
              // アイキャッチ画像を決定（優先順位: og_image_url > 最初のH2画像）
              let featuredImageUrl = ogImageUrl;
              
              if (!featuredImageUrl) {
                // 最初のH2見出しを抽出
                const h2Match = content.match(/^##\\s+(.+)$/m);
                if (h2Match) {
                  const firstH2Text = h2Match[1].trim();
                  // H2見出しに対応する画像を検索
                  const matchingImage = headingImages.find(img => img.heading_text === firstH2Text);
                  if (matchingImage) {
                    featuredImageUrl = matchingImage.image_url;
                  }
                }
              }
              
              // アイキャッチ画像を表示
              if (featuredImageUrl) {
                document.getElementById('featured-image-container').innerHTML = \`
                  <figure style="margin: 0 0 2rem 0;">
                    <img 
                      src="\${featuredImageUrl}" 
                      alt="${article.title}" 
                      style="width: 100%; height: auto; max-height: 500px; object-fit: cover; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
                      loading="eager"
                    />
                  </figure>
                \`;
              }
              
              // Markdownをレンダリング
              // IMPORTANT: mangle: false, headerIds: true で見出しにIDを自動付与
              marked.setOptions({
                breaks: true,
                gfm: true,
                mangle: false,
                headerIds: true // 見出しにIDを自動付与
              });
              const html = marked.parse(content);
              document.getElementById('article-body').innerHTML = html;
              
              // 目次を自動生成
              generateTableOfContents();

              // 目次を自動生成する関数
              function generateTableOfContents() {
                  const articleBody = document.getElementById('article-body');
                  const tocContainer = document.getElementById('table-of-contents');
                  const tocList = document.getElementById('toc-list');
                  
                  // H2とH3見出しを取得
                  const headings = articleBody.querySelectorAll('h2, h3');
                  
                  if (headings.length === 0) {
                      // 見出しがない場合は目次を非表示
                      return;
                  }
                  
                  // 見出しにIDを付与（markedがIDを生成しない場合のフォールバック）
                  headings.forEach((heading, index) => {
                      if (!heading.id) {
                          heading.id = 'heading-' + index;
                      }
                  });
                  
                  // 目次項目を生成
                  let tocHTML = '';
                  headings.forEach((heading) => {
                      const level = heading.tagName.toLowerCase();
                      const text = heading.textContent;
                      const id = heading.id;
                      
                      // H2とH3でインデントを変える
                      const indent = level === 'h3' ? 'ml-6' : '';
                      const fontSize = level === 'h3' ? 'text-sm' : 'text-base';
                      const icon = level === 'h2' ? '<i class="fas fa-chevron-right text-blue-600 mr-2 text-xs"></i>' : '<i class="fas fa-angle-right text-gray-500 mr-2 text-xs"></i>';
                      
                      tocHTML += \`
                          <a href="#\${id}" 
                             class="block \${indent} \${fontSize} text-gray-700 hover:text-blue-600 hover:bg-blue-100 px-3 py-2 rounded transition-colors"
                             onclick="smoothScrollTo('\${id}'); return false;">
                              \${icon}
                              <span>\${text}</span>
                          </a>
                      \`;
                  });
                  
                  tocList.innerHTML = tocHTML;
                  tocContainer.style.display = 'block';
                  
                  // 目次を最初の段落（導入文）の後に移動
                  const firstParagraph = articleBody.querySelector('p');
                  if (firstParagraph) {
                      // 目次を現在の位置から削除
                      const tocParent = tocContainer.parentNode;
                      if (tocParent) {
                          tocContainer.remove();
                      }
                      
                      // 最初の段落の直後に目次を挿入
                      firstParagraph.insertAdjacentElement('afterend', tocContainer);
                  }
              }
              
              // スムーススクロール関数
              function smoothScrollTo(targetId) {
                  const target = document.getElementById(targetId);
                  if (target) {
                      // ヘッダー分のオフセット（80px）を考慮
                      const offset = 80;
                      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                      
                      window.scrollTo({
                          top: targetPosition,
                          behavior: 'smooth'
                      });
                      
                      // 見出しをハイライト（一時的に背景色を変更）
                      target.style.transition = 'background-color 0.3s';
                      target.style.backgroundColor = '#fef3c7';
                      setTimeout(() => {
                          target.style.backgroundColor = '';
                      }, 1500);
                  }
              }

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

    // 見出し画像を取得（アイキャッチのフォールバック用）
    const headingImages = await c.env.DB.prepare(
      `SELECT hi.*, il.image_url, il.alt_text
       FROM heading_images hi
       JOIN image_library il ON hi.image_name = il.image_name`
    ).all();

    // 各記事のアイキャッチ画像を決定
    const articleList = (articles.results || []).map((article: any) => {
      let featuredImageUrl = article.og_image_url;
      
      // og_image_urlがない場合、最初のH2画像を使用
      if (!featuredImageUrl && article.content) {
        const h2Match = article.content.match(/^##\s+(.+)$/m);
        if (h2Match && headingImages.results) {
          const firstH2Text = h2Match[1].trim();
          const matchingImage = (headingImages.results as any[]).find(
            (img: any) => img.heading_text === firstH2Text
          );
          if (matchingImage) {
            featuredImageUrl = matchingImage.image_url;
          }
        }
      }
      
      return {
        ...article,
        featured_image_url: featuredImageUrl
      };
    });

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
                      <article class="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden">
                          ${article.featured_image_url ? `
                              <a href="/blog/${article.slug || article.id}">
                                  <img src="${article.featured_image_url}" 
                                       alt="${article.title}" 
                                       class="w-full h-48 object-cover"
                                       loading="lazy">
                              </a>
                          ` : ''}
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
