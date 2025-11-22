/**
 * ===================================
 * 内部リンク管理 - トグル式マインドマップ
 * Internal Links Management - Toggle Mind Map
 * ===================================
 */

console.log('🗺️ Loading Toggle Mind Map Internal Links Module...');

// グローバル変数
let articles = [];
let links = [];
let dragSourceHeading = null;

// ===================================
// 初期化
// ===================================
function showInternalLinks() {
  console.log('📋 Initializing Toggle Mind Map...');
  
  updateSidebarActive('links');
  
  const contentArea = document.getElementById('content-area');
  if (!contentArea) {
    alert('エラー: コンテンツエリアが見つかりません');
    return;
  }
  
  contentArea.innerHTML = `
    <div class="max-w-7xl mx-auto">
      <!-- ヘッダー -->
      <div class="mb-6">
        <h1 class="text-4xl font-bold text-gray-900 flex items-center">
          <i class="fas fa-project-diagram text-blue-600 mr-4"></i>
          内部リンク管理 - トグル式マインドマップ
        </h1>
        <p class="text-gray-600 mt-2 text-lg">記事を展開して見出しを表示、見出しをドラッグ&ドロップで接続</p>
      </div>

      <!-- ツールバー -->
      <div class="bg-white rounded-lg shadow-lg p-4 mb-6">
        <div class="flex justify-between items-center">
          <div class="flex space-x-4">
            <button onclick="refreshMindMap()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow">
              <i class="fas fa-sync-alt mr-2"></i>更新
            </button>
            <button onclick="expandAllArticles()" class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow">
              <i class="fas fa-expand-alt mr-2"></i>すべて展開
            </button>
            <button onclick="collapseAllArticles()" class="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-bold shadow">
              <i class="fas fa-compress-alt mr-2"></i>すべて折りたたみ
            </button>
            <button onclick="clearAllLinks()" class="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow">
              <i class="fas fa-trash mr-2"></i>全リンク削除
            </button>
          </div>
        </div>
      </div>

      <!-- マインドマップコンテナ -->
      <div class="grid grid-cols-1 gap-6">
        <div id="articles-container" class="space-y-4">
          <!-- 記事がここに表示されます -->
        </div>
      </div>

      <!-- 使い方 -->
      <div class="mt-6 bg-blue-50 rounded-lg p-6">
        <h3 class="font-bold text-lg text-gray-800 mb-4">📖 操作方法:</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
          <div><i class="fas fa-chevron-down text-blue-600 mr-2"></i><strong>記事タイトル</strong>をクリック → 見出しを展開/折りたたみ</div>
          <div><i class="fas fa-hand-rock text-green-600 mr-2"></i><strong>見出し</strong>をドラッグ → 他の見出しにドロップしてリンク作成</div>
          <div><i class="fas fa-link text-purple-600 mr-2"></i><strong>作成されたリンク</strong>は見出しの下に表示されます</div>
          <div><i class="fas fa-times-circle text-red-600 mr-2"></i><strong>リンクのゴミ箱アイコン</strong>をクリック → リンクを削除</div>
        </div>
      </div>
    </div>

    <!-- リンク作成モーダル -->
    <div id="link-modal" class="hidden fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onclick="if(event.target.id==='link-modal') closeLinkModal()">
      <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4" onclick="event.stopPropagation()">
        <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
          <div class="flex justify-between items-center">
            <h3 class="text-2xl font-bold">
              <i class="fas fa-link mr-3"></i>リンク詳細設定
            </h3>
            <button onclick="closeLinkModal()" class="text-white hover:text-gray-200">
              <i class="fas fa-times text-3xl"></i>
            </button>
          </div>
        </div>
        <div class="p-8">
          <div class="space-y-6">
            <div class="bg-blue-50 p-4 rounded-lg">
              <p class="text-sm font-semibold text-gray-600 mb-2">リンク元:</p>
              <p id="modal-from" class="text-lg font-bold text-gray-900"></p>
            </div>
            <div class="text-center">
              <i class="fas fa-arrow-down text-4xl text-blue-600"></i>
            </div>
            <div class="bg-green-50 p-4 rounded-lg">
              <p class="text-sm font-semibold text-gray-600 mb-2">リンク先:</p>
              <p id="modal-to" class="text-lg font-bold text-gray-900"></p>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">リンクテキスト:</label>
              <input type="text" id="modal-link-text" class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200" placeholder="例: 詳しくはこちら">
            </div>
          </div>
          <div class="flex justify-end space-x-4 mt-8">
            <button onclick="closeLinkModal()" class="px-8 py-3 bg-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-400">
              キャンセル
            </button>
            <button onclick="confirmCreateLink()" class="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">
              <i class="fas fa-check mr-2"></i>作成
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  loadMindMapData();
}

// ===================================
// データ読み込み
// ===================================
async function loadMindMapData() {
  console.log('📡 Loading data...');
  
  try {
    // 記事取得
    const articlesRes = await fetch('/api/articles', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const articlesData = await articlesRes.json();
    if (!articlesData.success) throw new Error('記事の取得に失敗');
    
    articles = (articlesData.data || []).filter(a => a.status === 'published');
    
    // 各記事の見出しを取得
    for (const article of articles) {
      const headingsRes = await fetch(`/api/internal-links/headings/${article.id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const headingsData = await headingsRes.json();
      article.headings = headingsData.success ? (headingsData.data || []) : [];
      article.expanded = false;
    }
    
    // 内部リンク取得
    const linksRes = await fetch('/api/internal-links', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const linksData = await linksRes.json();
    links = linksData.success ? (linksData.data || []) : [];
    
    console.log('✅ Data loaded:', { articles: articles.length, links: links.length });
    
    renderMindMap();
    
  } catch (error) {
    console.error('❌ Error:', error);
    alert('データの読み込みに失敗しました: ' + error.message);
  }
}

// ===================================
// マインドマップ描画
// ===================================
function renderMindMap() {
  console.log('🎨 Rendering toggle mind map...');
  
  const container = document.getElementById('articles-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  articles.forEach((article, index) => {
    const articleCard = document.createElement('div');
    articleCard.className = 'bg-white rounded-lg shadow-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-all';
    
    // 記事ヘッダー（トグルボタン）
    const header = document.createElement('div');
    header.className = 'bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 cursor-pointer hover:from-blue-700 hover:to-blue-800 flex items-center justify-between';
    header.onclick = () => toggleArticle(article.id);
    
    header.innerHTML = `
      <div class="flex items-center space-x-3">
        <i class="fas ${article.expanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-xl"></i>
        <i class="fas fa-newspaper text-xl"></i>
        <h3 class="text-xl font-bold">${article.title}</h3>
      </div>
      <span class="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm">
        ${article.headings.length}個の見出し
      </span>
    `;
    
    articleCard.appendChild(header);
    
    // 見出しコンテナ
    if (article.expanded) {
      const headingsContainer = document.createElement('div');
      headingsContainer.className = 'p-4 bg-gray-50';
      
      if (article.headings.length === 0) {
        headingsContainer.innerHTML = `
          <p class="text-gray-500 italic">この記事には見出しがありません</p>
        `;
      } else {
        article.headings.forEach((heading) => {
          const headingDiv = document.createElement('div');
          headingDiv.className = 'mb-3';
          
          // 見出しレベルに応じた色とインデント
          const levelColors = {
            1: 'bg-green-100 border-green-500 text-green-900',
            2: 'bg-orange-100 border-orange-500 text-orange-900',
            3: 'bg-purple-100 border-purple-500 text-purple-900',
            4: 'bg-pink-100 border-pink-500 text-pink-900'
          };
          const color = levelColors[heading.level] || 'bg-gray-100 border-gray-500 text-gray-900';
          const indent = (heading.level - 1) * 20;
          
          // 見出しカード（ドラッグ可能）
          const headingCard = document.createElement('div');
          headingCard.className = `${color} border-l-4 p-3 rounded-lg cursor-move hover:shadow-lg transition-all`;
          headingCard.style.marginLeft = `${indent}px`;
          headingCard.draggable = true;
          
          headingCard.innerHTML = `
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <i class="fas fa-grip-vertical text-gray-400"></i>
                <span class="font-semibold">H${heading.level}</span>
                <span class="font-bold">${heading.text}</span>
              </div>
              <i class="fas fa-link text-blue-600"></i>
            </div>
          `;
          
          // ドラッグイベント
          headingCard.ondragstart = (e) => handleDragStart(e, article, heading);
          headingCard.ondragover = (e) => handleDragOver(e);
          headingCard.ondrop = (e) => handleDrop(e, article, heading);
          headingCard.ondragend = (e) => handleDragEnd(e);
          
          headingDiv.appendChild(headingCard);
          
          // この見出しから出ているリンクを表示
          const headingLinks = links.filter(link => 
            link.from_article_id === article.id && 
            link.from_heading === heading.text &&
            link.is_active
          );
          
          if (headingLinks.length > 0) {
            const linksContainer = document.createElement('div');
            linksContainer.className = 'ml-8 mt-2 space-y-2';
            
            headingLinks.forEach(link => {
              const toArticle = articles.find(a => a.id === link.to_article_id);
              const linkDiv = document.createElement('div');
              linkDiv.className = 'bg-blue-50 border-l-4 border-blue-500 p-2 rounded flex items-center justify-between';
              
              linkDiv.innerHTML = `
                <div class="flex items-center space-x-2">
                  <i class="fas fa-arrow-right text-blue-600"></i>
                  <span class="text-sm font-semibold text-blue-900">${link.link_text}</span>
                  <i class="fas fa-arrow-right text-gray-400"></i>
                  <span class="text-sm text-gray-700">${toArticle ? toArticle.title : '不明な記事'}</span>
                  ${link.to_heading ? `<span class="text-xs text-gray-500">→ ${link.to_heading}</span>` : ''}
                </div>
                <button onclick="deleteLink(${link.id})" class="text-red-600 hover:text-red-800 px-2">
                  <i class="fas fa-trash"></i>
                </button>
              `;
              
              linksContainer.appendChild(linkDiv);
            });
            
            headingDiv.appendChild(linksContainer);
          }
          
          headingsContainer.appendChild(headingDiv);
        });
      }
      
      articleCard.appendChild(headingsContainer);
    }
    
    container.appendChild(articleCard);
  });
}

// ===================================
// ドラッグ&ドロップ処理
// ===================================
function handleDragStart(e, article, heading) {
  dragSourceHeading = { article, heading };
  e.target.style.opacity = '0.5';
  e.dataTransfer.effectAllowed = 'link';
  e.dataTransfer.setData('text/html', e.target.innerHTML);
  console.log('🎯 Drag started:', heading.text);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'link';
  e.target.closest('.cursor-move')?.classList.add('ring-4', 'ring-blue-400');
  return false;
}

function handleDrop(e, targetArticle, targetHeading) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  e.preventDefault();
  
  e.target.closest('.cursor-move')?.classList.remove('ring-4', 'ring-blue-400');
  
  if (!dragSourceHeading) return false;
  
  // 同じ見出しへのドロップは無視
  if (dragSourceHeading.article.id === targetArticle.id && 
      dragSourceHeading.heading.id === targetHeading.id) {
    console.log('⚠️ Cannot link to same heading');
    return false;
  }
  
  // 同じ記事内のリンクは禁止
  if (dragSourceHeading.article.id === targetArticle.id) {
    alert('⚠️ 同じ記事内の見出しへのリンクは作成できません');
    return false;
  }
  
  console.log('🎯 Dropped:', {
    from: dragSourceHeading.heading.text,
    to: targetHeading.text
  });
  
  showLinkModal(dragSourceHeading, { article: targetArticle, heading: targetHeading });
  
  return false;
}

function handleDragEnd(e) {
  e.target.style.opacity = '1';
  e.target.closest('.cursor-move')?.classList.remove('ring-4', 'ring-blue-400');
  dragSourceHeading = null;
}

// ===================================
// リンク作成モーダル
// ===================================
function showLinkModal(source, target) {
  document.getElementById('modal-from').textContent = 
    `${source.article.title} > ${source.heading.text}`;
  
  document.getElementById('modal-to').textContent = 
    `${target.article.title} > ${target.heading.text}`;
  
  document.getElementById('modal-link-text').value = 
    `${target.article.title}について詳しく見る`;
  
  document.getElementById('link-modal').classList.remove('hidden');
  
  window.pendingLink = { source, target };
}

function closeLinkModal() {
  document.getElementById('link-modal').classList.add('hidden');
  window.pendingLink = null;
}

async function confirmCreateLink() {
  if (!window.pendingLink) return;
  
  const { source, target } = window.pendingLink;
  const linkText = document.getElementById('modal-link-text').value.trim();
  
  if (!linkText) {
    alert('リンクテキストを入力してください');
    return;
  }
  
  try {
    const response = await fetch('/api/internal-links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        from_article_id: source.article.id,
        from_heading: source.heading.text,
        from_heading_id: source.heading.id,
        to_article_id: target.article.id,
        to_heading: target.heading.text,
        to_heading_id: target.heading.id,
        link_text: linkText,
        is_active: 1
      })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    
    alert('✅ 内部リンクを作成しました！');
    closeLinkModal();
    loadMindMapData();
    
  } catch (error) {
    alert('❌ エラー: ' + error.message);
  }
}

// ===================================
// 記事の展開/折りたたみ
// ===================================
function toggleArticle(articleId) {
  const article = articles.find(a => a.id === articleId);
  if (article) {
    article.expanded = !article.expanded;
    renderMindMap();
  }
}

function expandAllArticles() {
  articles.forEach(article => article.expanded = true);
  renderMindMap();
}

function collapseAllArticles() {
  articles.forEach(article => article.expanded = false);
  renderMindMap();
}

// ===================================
// ユーティリティ
// ===================================
async function refreshMindMap() {
  await loadMindMapData();
  alert('✅ 更新しました');
}

async function clearAllLinks() {
  if (!confirm('すべての内部リンクを削除しますか？')) return;
  
  try {
    for (const link of links) {
      await fetch(`/api/internal-links/${link.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    }
    alert('✅ すべてのリンクを削除しました');
    loadMindMapData();
  } catch (error) {
    alert('❌ エラー: ' + error.message);
  }
}

async function deleteLink(linkId) {
  if (!confirm('このリンクを削除しますか？')) return;
  
  try {
    const response = await fetch(`/api/internal-links/${linkId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    alert('✅ リンクを削除しました');
    loadMindMapData();
  } catch (error) {
    alert('❌ エラー: ' + error.message);
  }
}

// グローバル登録
window.showInternalLinks = showInternalLinks;
window.refreshMindMap = refreshMindMap;
window.expandAllArticles = expandAllArticles;
window.collapseAllArticles = collapseAllArticles;
window.clearAllLinks = clearAllLinks;
window.deleteLink = deleteLink;
window.closeLinkModal = closeLinkModal;
window.confirmCreateLink = confirmCreateLink;

console.log('✅ Toggle Mind Map Internal Links Module Loaded!');
