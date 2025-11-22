// ===================================
// Public Blog Article Script (No Authentication Required)
// 公開ブログ記事詳細ページ用スクリプト（認証不要）
// ===================================

const API_BASE = '/api';

// ページ読み込み時に記事を取得
document.addEventListener('DOMContentLoaded', () => {
  loadArticle();
});

// URLから記事IDを取得
function getArticleIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

// 記事を読み込んで表示
async function loadArticle() {
  const articleId = getArticleIdFromUrl();
  
  if (!articleId) {
    showError('記事IDが指定されていません');
    return;
  }
  
  const container = document.getElementById('article-container');
  
  try {
    // 記事データを取得
    const response = await fetch(`${API_BASE}/public/articles/${articleId}`);
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || '記事の取得に失敗しました');
    }
    
    const article = data.data;
    
    // メタタグを更新
    updateMetaTags(article);
    
    // 記事コンテンツを表示
    displayArticle(article);
    
    // 関連記事を読み込み
    loadRelatedArticles(articleId);
    
  } catch (error) {
    console.error('Load article error:', error);
    showError(error.message);
  }
}

// メタタグを動的に更新
function updateMetaTags(article) {
  // タイトル
  document.title = `${article.title} - My Blog`;
  document.getElementById('article-title').textContent = `${article.title} - My Blog`;
  
  // Description
  const description = article.meta_description || truncateText(article.content, 150);
  const descMeta = document.getElementById('article-description');
  if (descMeta) descMeta.setAttribute('content', description);
  
  // OG Tags
  const ogTitle = document.getElementById('og-title');
  if (ogTitle) ogTitle.setAttribute('content', article.title);
  
  const ogDesc = document.getElementById('og-description');
  if (ogDesc) ogDesc.setAttribute('content', description);
}

// 記事コンテンツを表示
function displayArticle(article) {
  const container = document.getElementById('article-container');
  
  // Markdownをパース
  // IMPORTANT: mangle: false, headerIds: false でHTMLタグをそのまま残す
  marked.setOptions({
    breaks: true,
    gfm: true,
    mangle: false,
    headerIds: false
  });
  
  const htmlContent = marked.parse(article.content);
  
  // 記事HTMLを生成
  container.innerHTML = `
    <div class="bg-white rounded-lg shadow-lg p-8 mb-8">
      <!-- 記事ヘッダー -->
      <header class="mb-8 pb-8 border-b border-gray-200">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">${escapeHtml(article.title)}</h1>
        
        <div class="flex flex-wrap items-center gap-4 text-gray-600">
          <div class="flex items-center">
            <i class="far fa-calendar mr-2"></i>
            <time datetime="${article.published_at || article.created_at}">
              ${formatDate(article.published_at || article.created_at)}
            </time>
          </div>
          
          ${article.updated_at && article.updated_at !== article.created_at ? `
            <div class="flex items-center">
              <i class="fas fa-sync-alt mr-2"></i>
              <span>更新: ${formatDate(article.updated_at)}</span>
            </div>
          ` : ''}
          
          ${article.author_name ? `
            <div class="flex items-center">
              <i class="fas fa-user mr-2"></i>
              <span>${escapeHtml(article.author_name)}</span>
            </div>
          ` : ''}
        </div>
        
        ${article.target_keywords ? `
          <div class="mt-4 flex flex-wrap gap-2">
            ${article.target_keywords.split(',').map(keyword => `
              <span class="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                <i class="fas fa-tag mr-1"></i>${escapeHtml(keyword.trim())}
              </span>
            `).join('')}
          </div>
        ` : ''}
      </header>
      
      <!-- 記事本文 -->
      <div class="article-content markdown-preview prose max-w-none">
        ${htmlContent}
      </div>
      
      <!-- 記事フッター -->
      <footer class="mt-12 pt-8 border-t border-gray-200">
        <div class="flex justify-between items-center">
          <a href="/blog" class="inline-flex items-center text-blue-600 hover:text-blue-700 transition">
            <i class="fas fa-arrow-left mr-2"></i>記事一覧に戻る
          </a>
          
          <div class="flex space-x-4">
            <button onclick="shareOnTwitter()" class="text-gray-600 hover:text-blue-400 transition">
              <i class="fab fa-twitter text-xl"></i>
            </button>
            <button onclick="shareOnFacebook()" class="text-gray-600 hover:text-blue-600 transition">
              <i class="fab fa-facebook text-xl"></i>
            </button>
            <button onclick="copyLink()" class="text-gray-600 hover:text-green-600 transition">
              <i class="fas fa-link text-xl"></i>
            </button>
          </div>
        </div>
      </footer>
    </div>
  `;
}

// 関連記事を読み込み
async function loadRelatedArticles(currentArticleId) {
  try {
    const response = await fetch(`${API_BASE}/public/articles`);
    const data = await response.json();
    
    if (!data.success) {
      return; // 関連記事の取得に失敗しても無視
    }
    
    // 現在の記事を除外し、最大3件取得
    const relatedArticles = data.data
      .filter(article => article.id.toString() !== currentArticleId.toString())
      .slice(0, 3);
    
    if (relatedArticles.length === 0) {
      return; // 関連記事がない場合は表示しない
    }
    
    // 関連記事セクションを表示
    const section = document.getElementById('related-articles');
    const container = document.getElementById('related-articles-container');
    
    container.innerHTML = relatedArticles.map(article => `
      <article class="article-card fade-in">
        <div class="article-card-image"></div>
        <div class="article-card-content">
          <h3 class="article-card-title">${escapeHtml(article.title)}</h3>
          <p class="article-card-description">
            ${escapeHtml(article.meta_description || truncateText(article.content, 100))}
          </p>
          <div class="article-card-meta">
            <span>
              <i class="far fa-calendar mr-1"></i>
              ${formatDate(article.published_at || article.created_at)}
            </span>
          </div>
          <a href="/blog/article.html?id=${article.id}" class="article-card-button">
            <i class="fas fa-arrow-right mr-2"></i>記事を読む
          </a>
        </div>
      </article>
    `).join('');
    
    section.classList.remove('hidden');
    
  } catch (error) {
    console.error('Load related articles error:', error);
    // 関連記事の取得に失敗しても無視
  }
}

// エラー表示
function showError(message) {
  const container = document.getElementById('article-container');
  container.innerHTML = `
    <div class="bg-white rounded-lg shadow-lg p-12 text-center">
      <i class="fas fa-exclamation-circle text-red-500 text-6xl mb-4"></i>
      <h2 class="text-2xl font-bold text-gray-900 mb-2">記事が見つかりません</h2>
      <p class="text-gray-600 mb-8">${escapeHtml(message)}</p>
      <a href="/blog" class="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
        <i class="fas fa-arrow-left mr-2"></i>記事一覧に戻る
      </a>
    </div>
  `;
}

// HTMLエスケープ
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// テキストの切り詰め
function truncateText(text, length) {
  if (!text) return '';
  // Markdownの記号を削除
  const plainText = text.replace(/[#*`>\-\[\]()]/g, '').trim();
  if (plainText.length <= length) return plainText;
  return plainText.substring(0, length) + '...';
}

// 日付のフォーマット
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// SNS共有機能
function shareOnTwitter() {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(document.getElementById('article-title').textContent);
  window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
}

function shareOnFacebook() {
  const url = encodeURIComponent(window.location.href);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
}

function copyLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    // コピー成功のフィードバック
    const btn = event.target.closest('button');
    const originalIcon = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check text-xl"></i>';
    btn.classList.add('text-green-600');
    
    setTimeout(() => {
      btn.innerHTML = originalIcon;
      btn.classList.remove('text-green-600');
    }, 2000);
  }).catch(err => {
    console.error('クリップボードへのコピーに失敗:', err);
    alert('リンクのコピーに失敗しました');
  });
}
