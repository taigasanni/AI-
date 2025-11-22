// ===================================
// Public Blog Script (No Authentication Required)
// 公開ブログ用スクリプト（認証不要）
// ===================================

const API_BASE = '/api';

// ページ読み込み時に記事一覧を取得
document.addEventListener('DOMContentLoaded', () => {
  loadPublicArticles();
});

// 公開記事一覧を取得（認証不要のエンドポイント）
async function loadPublicArticles() {
  const container = document.getElementById('articles-container');
  
  try {
    const response = await fetch(`${API_BASE}/public/articles`);
    const data = await response.json();
    
    if (data.success && data.data.length > 0) {
      const articles = data.data;
      
      container.innerHTML = articles.map(article => `
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
              ${article.target_keywords ? `
                <span class="article-card-tag">
                  ${escapeHtml(article.target_keywords.split(',')[0].trim())}
                </span>
              ` : ''}
            </div>
            <a href="/blog/article.html?id=${article.id}" class="article-card-button">
              <i class="fas fa-arrow-right mr-2"></i>記事を読む
            </a>
          </div>
        </article>
      `).join('');
      
    } else if (data.success && data.data.length === 0) {
      // 記事が0件の場合
      container.innerHTML = `
        <div class="col-span-full empty-state">
          <i class="fas fa-inbox"></i>
          <p class="empty-state-title">まだ記事がありません</p>
          <p>公開された記事がここに表示されます</p>
        </div>
      `;
    } else {
      throw new Error(data.error || '記事の取得に失敗しました');
    }
    
  } catch (error) {
    console.error('Load articles error:', error);
    container.innerHTML = `
      <div class="col-span-full error-container">
        <i class="fas fa-exclamation-circle error-icon"></i>
        <h3 class="error-title">記事の読み込みに失敗しました</h3>
        <p class="error-message">${escapeHtml(error.message)}</p>
      </div>
    `;
  }
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
