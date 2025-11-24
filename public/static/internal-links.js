/**
 * ===================================
 * 内部リンク管理 - 2カラムドラッグ&ドロップ
 * Internal Links Management - Two Column Drag & Drop
 * ===================================
 */

console.log('🗺️ Loading Two Column Internal Links Module...');

// グローバル変数
let articles = [];
let links = [];
let dragSourceHeading = null;

// ===================================
// 初期化
// ===================================
function showInternalLinks() {
  console.log('📋 Initializing Two Column View...');
  
  updateSidebarActive('links');
  
  const contentArea = document.getElementById('content-area');
  if (!contentArea) {
    alert('エラー: コンテンツエリアが見つかりません');
    return;
  }
  
  contentArea.innerHTML = `
    <div class="max-w-full">
      <!-- ヘッダー -->
      <div class="mb-6">
        <h1 class="text-4xl font-bold text-gray-900 flex items-center">
          <i class="fas fa-link text-blue-600 mr-4"></i>
          内部リンク管理
        </h1>
        <p class="text-gray-600 mt-2 text-lg">左側から右側へ見出しをドラッグ&ドロップしてリンクを作成</p>
      </div>

      <!-- ツールバー -->
      <div class="bg-white rounded-lg shadow-lg p-4 mb-6">
        <div class="flex flex-col space-y-4">
          <!-- 検索フィルター -->
          <div class="flex items-center space-x-4">
            <div class="flex-1">
              <div class="relative">
                <i class="fas fa-search absolute left-3 top-3.5 text-gray-400"></i>
                <input type="text" 
                       id="search-articles" 
                       placeholder="記事を検索（タイトル、キーワード）..." 
                       class="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                       oninput="filterArticles(this.value)">
              </div>
            </div>
            <button onclick="clearSearch()" class="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
              <i class="fas fa-times mr-2"></i>クリア
            </button>
          </div>
          
          <!-- ボタングループ -->
          <div class="flex justify-between items-center">
            <div class="flex space-x-4">
              <button onclick="refreshMindMap()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow">
                <i class="fas fa-sync-alt mr-2"></i>更新
              </button>
              <button onclick="expandAllArticles('left')" class="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow">
                <i class="fas fa-expand-alt mr-2"></i>左側すべて展開
              </button>
              <button onclick="expandAllArticles('right')" class="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold shadow">
                <i class="fas fa-expand-alt mr-2"></i>右側すべて展開
              </button>
              <button onclick="clearAllLinks()" class="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow">
                <i class="fas fa-trash mr-2"></i>全リンク削除
              </button>
            </div>
            
            <!-- モード切替 -->
            <div class="flex items-center space-x-2 bg-gray-100 rounded-lg p-2">
              <span class="text-sm font-semibold text-gray-700">操作モード:</span>
              <button id="drag-mode-btn" onclick="setLinkMode('drag')" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">
                <i class="fas fa-hand-rock mr-1"></i>ドラッグ
              </button>
              <button id="click-mode-btn" onclick="setLinkMode('click')" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm font-bold">
                <i class="fas fa-mouse-pointer mr-1"></i>クリック
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- モード説明 -->
      <div id="mode-description" class="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
        <p class="text-blue-800 font-semibold">
          <i class="fas fa-hand-rock mr-2"></i>
          <strong>ドラッグモード:</strong> 左側の見出しを右側の見出しにドラッグ&ドロップしてリンクを作成
        </p>
      </div>

      <!-- 2カラムレイアウト -->
      <div class="grid grid-cols-2 gap-6">
        <!-- 左側: リンク先を選択 -->
        <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-xl p-6 border-4 border-blue-300">
          <div class="mb-4 pb-4 border-b-4 border-blue-400">
            <h2 class="text-2xl font-bold text-blue-900 flex items-center">
              <i class="fas fa-hand-point-right text-3xl mr-3"></i>
              リンク元（ここからドラッグ）
            </h2>
            <p class="text-blue-700 mt-2">参照元の見出しを右側の配置先にドラッグ</p>
          </div>
          <div id="left-articles" class="space-y-4 max-h-[800px] overflow-y-auto pr-2">
            <!-- 左側の記事がここに表示されます -->
          </div>
        </div>

        <!-- 右側: リンク配置先 -->
        <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-xl p-6 border-4 border-green-300">
          <div class="mb-4 pb-4 border-b-4 border-green-400">
            <h2 class="text-2xl font-bold text-green-900 flex items-center">
              <i class="fas fa-bullseye text-3xl mr-3"></i>
              リンク配置先（ここにドロップ）
            </h2>
            <p class="text-green-700 mt-2">ここにドロップした見出しの下にリンクが表示されます</p>
          </div>
          <div id="right-articles" class="space-y-4 max-h-[800px] overflow-y-auto pr-2">
            <!-- 右側の記事がここに表示されます -->
          </div>
        </div>
      </div>

      <!-- 使い方 -->
      <div class="mt-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 border-2 border-blue-300">
        <h3 class="font-bold text-xl text-gray-800 mb-4 flex items-center">
          <i class="fas fa-info-circle text-blue-600 text-2xl mr-3"></i>
          操作方法
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-700">
          <div class="bg-white p-4 rounded-lg shadow">
            <i class="fas fa-chevron-down text-blue-600 mr-2 text-xl"></i>
            <strong>記事タイトル</strong>をクリック → 見出しを展開/折りたたみ
          </div>
          <div class="bg-white p-4 rounded-lg shadow">
            <i class="fas fa-hand-rock text-green-600 mr-2 text-xl"></i>
            <strong>左側の見出し</strong>をドラッグ → 右側の見出しにドロップすると、右側の見出しの下にリンクが配置されます
          </div>
          <div class="bg-white p-4 rounded-lg shadow">
            <i class="fas fa-times-circle text-red-600 mr-2 text-xl"></i>
            <strong>作成済みリンク</strong>のゴミ箱アイコンで削除
          </div>
        </div>
      </div>
    </div>

    <!-- リンク作成モーダル -->
    <div id="link-modal" class="hidden fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onclick="if(event.target.id==='link-modal') closeLinkModal()">
      <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4" onclick="event.stopPropagation()">
        <div class="bg-gradient-to-r from-blue-600 to-green-600 text-white p-6 rounded-t-2xl">
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
            <div class="bg-green-50 p-4 rounded-lg border-l-4 border-green-600">
              <p class="text-sm font-semibold text-gray-600 mb-2">
                <i class="fas fa-map-marker-alt text-green-600 mr-2"></i>リンク配置先（この見出しの下に表示）:
              </p>
              <p id="modal-to" class="text-lg font-bold text-gray-900"></p>
            </div>
            <div class="text-center">
              <i class="fas fa-arrow-down text-5xl text-gradient bg-gradient-to-r from-blue-600 to-green-600"></i>
            </div>
            <div class="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
              <p class="text-sm font-semibold text-gray-600 mb-2">
                <i class="fas fa-link text-blue-600 mr-2"></i>リンク元（この記事への参照）:
              </p>
              <p id="modal-from" class="text-lg font-bold text-gray-900"></p>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                <i class="fas fa-edit text-blue-600 mr-2"></i>リンクテキスト:
              </label>
              <input type="text" id="modal-link-text" class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg" placeholder="例: 詳しくはこちら">
            </div>
          </div>
          <div class="flex justify-end space-x-4 mt-8">
            <button onclick="closeLinkModal()" class="px-8 py-3 bg-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-400 shadow">
              <i class="fas fa-times mr-2"></i>キャンセル
            </button>
            <button onclick="confirmCreateLink()" class="px-8 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-green-700 shadow-lg">
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
      article.expandedLeft = false;
      article.expandedRight = false;
    }
    
    // 内部リンク取得
    const linksRes = await fetch('/api/internal-links', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const linksData = await linksRes.json();
    links = linksData.success ? (linksData.data || []) : [];
    
    console.log('✅ Data loaded:', { articles: articles.length, links: links.length });
    
    renderBothColumns();
    
  } catch (error) {
    console.error('❌ Error:', error);
    alert('データの読み込みに失敗しました: ' + error.message);
  }
}

// ===================================
// 両カラム描画
// ===================================
function renderBothColumns() {
  renderColumn('left');
  renderColumn('right');
}

function renderColumn(side) {
  console.log(`🎨 Rendering ${side} column...`);
  
  const containerId = side === 'left' ? 'left-articles' : 'right-articles';
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const expandedProp = side === 'left' ? 'expandedLeft' : 'expandedRight';
  const isDragSource = side === 'left';
  
  container.innerHTML = '';
  
  articles.forEach((article) => {
    const articleCard = document.createElement('div');
    articleCard.className = 'bg-white rounded-lg shadow-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-all';
    
    // 記事ヘッダー
    const header = document.createElement('div');
    const bgColor = side === 'left' ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-green-600 to-green-700';
    header.className = `${bgColor} text-white p-4 cursor-pointer hover:opacity-90 flex items-center justify-between`;
    header.onclick = () => toggleArticle(article.id, side);
    
    header.innerHTML = `
      <div class="flex items-center space-x-3">
        <i class="fas ${article[expandedProp] ? 'fa-chevron-down' : 'fa-chevron-right'} text-xl"></i>
        <i class="fas fa-newspaper text-xl"></i>
        <h3 class="text-lg font-bold">${article.title}</h3>
      </div>
      <span class="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm">
        ${article.headings.length}個
      </span>
    `;
    
    articleCard.appendChild(header);
    
    // 見出しコンテナ
    if (article[expandedProp]) {
      const headingsContainer = document.createElement('div');
      headingsContainer.className = 'p-4 bg-gray-50';
      
      if (article.headings.length === 0) {
        headingsContainer.innerHTML = `
          <p class="text-gray-500 italic text-center py-4">
            <i class="fas fa-info-circle mr-2"></i>この記事には見出しがありません
          </p>
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
          const indent = (heading.level - 1) * 16;
          
          // 見出しカード
          const headingCard = document.createElement('div');
          headingCard.className = `${color} border-l-4 p-3 rounded-lg transition-all ${isDragSource ? 'cursor-move hover:shadow-lg hover:scale-105' : 'cursor-pointer hover:shadow-md'}`;
          headingCard.style.marginLeft = `${indent}px`;
          
          if (isDragSource) {
            headingCard.draggable = true;
            headingCard.innerHTML = `
              <div class="flex items-center space-x-2">
                <i class="fas fa-grip-vertical text-gray-500"></i>
                <span class="font-semibold">H${heading.level}</span>
                <span class="font-bold">${heading.text}</span>
                <i class="fas fa-arrow-right text-blue-600 ml-auto"></i>
              </div>
            `;
            
            // ドラッグイベント（左側のみ）
            headingCard.ondragstart = (e) => handleDragStart(e, article, heading);
            headingCard.ondragend = (e) => handleDragEnd(e);
          } else {
            headingCard.innerHTML = `
              <div class="flex items-center space-x-2">
                <i class="fas fa-bullseye text-green-600"></i>
                <span class="font-semibold">H${heading.level}</span>
                <span class="font-bold">${heading.text}</span>
              </div>
            `;
            
            // ドロップイベント（右側のみ）
            headingCard.ondragover = (e) => handleDragOver(e);
            headingCard.ondrop = (e) => handleDrop(e, article, heading);
            headingCard.ondragleave = (e) => handleDragLeave(e);
          }
          
          headingDiv.appendChild(headingCard);
          
          // 右側（配置先）の場合、この見出しに配置されているリンクを表示
          if (!isDragSource) {
            const headingLinks = links.filter(link => 
              link.to_article_id === article.id && 
              link.to_heading === heading.text &&
              link.is_active
            );
            
            if (headingLinks.length > 0) {
              const linksContainer = document.createElement('div');
              linksContainer.className = 'ml-8 mt-2 space-y-2';
              
              headingLinks.forEach(link => {
                const fromArticle = articles.find(a => a.id === link.from_article_id);
                const linkDiv = document.createElement('div');
                linkDiv.className = 'bg-green-50 border-l-4 border-green-500 p-2 rounded flex items-center justify-between shadow-sm';
                
                linkDiv.innerHTML = `
                  <div class="flex items-center space-x-2 text-sm">
                    <i class="fas fa-link text-green-600"></i>
                    <span class="font-semibold text-green-900">${link.link_text}</span>
                    <i class="fas fa-arrow-left text-gray-400"></i>
                    <span class="text-gray-700">${fromArticle ? fromArticle.title : '不明'}</span>
                    ${link.from_heading ? `<span class="text-xs text-gray-500">← ${link.from_heading}</span>` : ''}
                  </div>
                  <button onclick="deleteLink(${link.id})" class="text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-100">
                    <i class="fas fa-trash"></i>
                  </button>
                `;
                
                linksContainer.appendChild(linkDiv);
              });
              
              headingDiv.appendChild(linksContainer);
            }
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
  e.target.style.opacity = '0.4';
  e.target.classList.add('ring-4', 'ring-blue-400');
  e.dataTransfer.effectAllowed = 'link';
  console.log('🎯 Drag started:', heading.text);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'link';
  e.target.closest('.cursor-pointer')?.classList.add('ring-4', 'ring-green-400', 'scale-105');
  return false;
}

function handleDragLeave(e) {
  e.target.closest('.cursor-pointer')?.classList.remove('ring-4', 'ring-green-400', 'scale-105');
}

function handleDrop(e, targetArticle, targetHeading) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }
  e.preventDefault();
  
  e.target.closest('.cursor-pointer')?.classList.remove('ring-4', 'ring-green-400', 'scale-105');
  
  if (!dragSourceHeading) return false;
  
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
  e.target.classList.remove('ring-4', 'ring-blue-400');
  dragSourceHeading = null;
}

// ===================================
// リンク作成モーダル
// ===================================
function showLinkModal(source, target) {
  // モーダルの表示順序を逆にする
  document.getElementById('modal-to').textContent = 
    `${target.article.title} > ${target.heading.text}`;
  
  document.getElementById('modal-from').textContent = 
    `${source.article.title} > ${source.heading.text}`;
  
  document.getElementById('modal-link-text').value = 
    `${source.article.title}について詳しく見る`;
  
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
    // from と to を逆にする：
    // source（左側）がリンク元、target（右側）がリンク配置先
    // データベースには to が配置先、from が参照元として保存
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
function toggleArticle(articleId, side) {
  const article = articles.find(a => a.id === articleId);
  if (article) {
    if (side === 'left') {
      article.expandedLeft = !article.expandedLeft;
    } else {
      article.expandedRight = !article.expandedRight;
    }
    renderColumn(side);
  }
}

function expandAllArticles(side) {
  if (side === 'left') {
    articles.forEach(article => article.expandedLeft = true);
    renderColumn('left');
  } else if (side === 'right') {
    articles.forEach(article => article.expandedRight = true);
    renderColumn('right');
  }
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
window.clearAllLinks = clearAllLinks;
window.deleteLink = deleteLink;
window.closeLinkModal = closeLinkModal;
window.confirmCreateLink = confirmCreateLink;

console.log('✅ Two Column Internal Links Module Loaded!');
