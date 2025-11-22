/**
 * ===================================
 * 内部リンク管理 - マインドマップ形式
 * Internal Links Management - Mind Map Format
 * ===================================
 */

console.log('🗺️ Loading Mind Map Internal Links Module...');

// グローバル変数
let articles = [];
let links = [];
let svg, simulation, linkLayer, nodeLayer;
let dragLine = null;
let dragSourceNode = null;
let nodes = [];
let linksData = [];

// ===================================
// 初期化
// ===================================
function showInternalLinks() {
  console.log('📋 Initializing Mind Map...');
  
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
          <i class="fas fa-project-diagram text-blue-600 mr-4"></i>
          内部リンク管理 - マインドマップ
        </h1>
        <p class="text-gray-600 mt-2 text-lg">記事と見出しをドラッグ&ドロップで接続してください</p>
      </div>

      <!-- ツールバー -->
      <div class="bg-white rounded-lg shadow-lg p-4 mb-6">
        <div class="flex justify-between items-center">
          <div class="flex space-x-4">
            <button onclick="refreshMindMap()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow">
              <i class="fas fa-sync-alt mr-2"></i>更新
            </button>
            <button onclick="resetLayout()" class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow">
              <i class="fas fa-magic mr-2"></i>自動整列
            </button>
            <button onclick="clearAllLinks()" class="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow">
              <i class="fas fa-trash mr-2"></i>全リンク削除
            </button>
          </div>
          <div class="text-gray-600">
            <i class="fas fa-info-circle mr-2"></i>
            記事をクリックして見出し表示、見出しをドラッグして他の見出しにドロップでリンク作成
          </div>
        </div>
      </div>

      <!-- マインドマップキャンバス -->
      <div class="bg-white rounded-lg shadow-2xl p-4">
        <div id="mindmap-container" style="width: 100%; height: 700px; border: 2px solid #e5e7eb; border-radius: 0.5rem; background: #f9fafb;">
          <!-- SVGがここに描画されます -->
        </div>
      </div>

      <!-- 凡例 -->
      <div class="mt-6 bg-blue-50 rounded-lg p-6">
        <h3 class="font-bold text-lg text-gray-800 mb-4">操作方法:</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
          <div><i class="fas fa-mouse-pointer text-blue-600 mr-2"></i><strong>記事ノード</strong>をクリック → 見出しを表示/非表示</div>
          <div><i class="fas fa-hand-rock text-green-600 mr-2"></i><strong>見出しノード</strong>をドラッグ → 他の見出しにドロップしてリンク作成</div>
          <div><i class="fas fa-arrows-alt text-purple-600 mr-2"></i><strong>任意のノード</strong>をドラッグ → 配置を調整</div>
          <div><i class="fas fa-times-circle text-red-600 mr-2"></i><strong>リンク線</strong>をクリック → リンクを削除</div>
        </div>
      </div>
    </div>

    <!-- リンク詳細モーダル -->
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
  
  initMindMap();
  loadMindMapData();
}

// ===================================
// マインドマップ初期化
// ===================================
function initMindMap() {
  const container = document.getElementById('mindmap-container');
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  // SVG作成
  svg = d3.select('#mindmap-container')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .call(d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        svg.select('g.main').attr('transform', event.transform);
      }));
  
  const mainGroup = svg.append('g').attr('class', 'main');
  
  // 矢印マーカー定義
  mainGroup.append('defs').append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', 30)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 8)
    .attr('markerHeight', 8)
    .append('path')
    .attr('d', 'M 0,-5 L 10,0 L 0,5')
    .attr('fill', '#3B82F6');
  
  linkLayer = mainGroup.append('g').attr('class', 'links');
  nodeLayer = mainGroup.append('g').attr('class', 'nodes');
  
  // Force Simulation
  simulation = d3.forceSimulation()
    .force('link', d3.forceLink().id(d => d.id).distance(200))
    .force('charge', d3.forceManyBody().strength(-800))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(100));
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
  console.log('🎨 Rendering mind map...');
  
  nodes = [];
  linksData = [];
  
  // 記事ノードと見出しノードを作成
  articles.forEach((article, idx) => {
    const articleNode = {
      id: `article-${article.id}`,
      type: 'article',
      label: article.title,
      articleId: article.id,
      article: article,
      expanded: article.expanded
    };
    nodes.push(articleNode);
    
    // 見出しノード（展開時）
    if (article.expanded) {
      article.headings.forEach((heading, hIdx) => {
        const headingNode = {
          id: `heading-${article.id}-${heading.id}`,
          type: 'heading',
          label: heading.text,
          level: heading.level,
          articleId: article.id,
          headingId: heading.id,
          headingText: heading.text
        };
        nodes.push(headingNode);
        
        // 記事と見出しを接続
        linksData.push({
          source: articleNode.id,
          target: headingNode.id,
          type: 'hierarchy'
        });
      });
    }
  });
  
  // 内部リンクを追加
  links.forEach(link => {
    if (link.is_active) {
      const sourceId = `heading-${link.from_article_id}-${link.from_heading_id}`;
      const targetId = link.to_heading_id 
        ? `heading-${link.to_article_id}-${link.to_heading_id}`
        : `article-${link.to_article_id}`;
      
      linksData.push({
        source: sourceId,
        target: targetId,
        type: 'internal-link',
        linkId: link.id,
        linkText: link.link_text
      });
    }
  });
  
  updateVisualization();
}

// ===================================
// 可視化更新
// ===================================
function updateVisualization() {
  // リンク描画
  const link = linkLayer.selectAll('line')
    .data(linksData, d => `${getNodeId(d.source)}-${getNodeId(d.target)}`);
  
  link.exit().remove();
  
  const linkEnter = link.enter().append('line')
    .attr('stroke-width', d => d.type === 'internal-link' ? 4 : 2)
    .attr('stroke', d => d.type === 'internal-link' ? '#3B82F6' : '#D1D5DB')
    .attr('stroke-dasharray', d => d.type === 'hierarchy' ? '5,5' : '0')
    .attr('marker-end', d => d.type === 'internal-link' ? 'url(#arrowhead)' : '')
    .style('cursor', d => d.type === 'internal-link' ? 'pointer' : 'default')
    .on('click', function(event, d) {
      if (d.type === 'internal-link') {
        event.stopPropagation();
        if (confirm(`このリンクを削除しますか？\n「${d.linkText}」`)) {
          deleteLink(d.linkId);
        }
      }
    });
  
  const linkUpdate = linkEnter.merge(link);
  
  // ノード描画
  const node = nodeLayer.selectAll('g.node')
    .data(nodes, d => d.id);
  
  node.exit().remove();
  
  const nodeEnter = node.enter().append('g')
    .attr('class', 'node')
    .call(d3.drag()
      .on('start', dragStarted)
      .on('drag', dragged)
      .on('end', dragEnded));
  
  // 記事ノード
  const articleNodes = nodeEnter.filter(d => d.type === 'article');
  
  articleNodes.append('rect')
    .attr('width', 200)
    .attr('height', 60)
    .attr('x', -100)
    .attr('y', -30)
    .attr('rx', 10)
    .attr('fill', '#3B82F6')
    .attr('stroke', '#2563EB')
    .attr('stroke-width', 3)
    .style('cursor', 'pointer')
    .on('click', function(event, d) {
      event.stopPropagation();
      toggleArticle(d.articleId);
    });
  
  articleNodes.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', 5)
    .attr('fill', 'white')
    .attr('font-size', '14px')
    .attr('font-weight', 'bold')
    .style('pointer-events', 'none')
    .text(d => {
      const maxLen = 20;
      return d.label.length > maxLen ? d.label.substring(0, maxLen) + '...' : d.label;
    });
  
  // 見出しノード
  const headingNodes = nodeEnter.filter(d => d.type === 'heading');
  
  headingNodes.append('rect')
    .attr('width', d => 150 + (d.level - 1) * 20)
    .attr('height', 40)
    .attr('x', d => -(75 + (d.level - 1) * 10))
    .attr('y', -20)
    .attr('rx', 8)
    .attr('fill', d => {
      const colors = ['#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
      return colors[(d.level - 1) % colors.length];
    })
    .attr('stroke', '#374151')
    .attr('stroke-width', 2)
    .style('cursor', 'grab')
    .on('mousedown', function(event, d) {
      startDragLink(event, d);
    });
  
  headingNodes.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', 5)
    .attr('fill', 'white')
    .attr('font-size', '13px')
    .attr('font-weight', 'bold')
    .style('pointer-events', 'none')
    .text(d => {
      const maxLen = 18 - (d.level - 1) * 2;
      return d.label.length > maxLen ? d.label.substring(0, maxLen) + '...' : d.label;
    });
  
  const nodeUpdate = nodeEnter.merge(node);
  
  // Simulation
  simulation.nodes(nodes)
    .on('tick', () => {
      linkUpdate
        .attr('x1', d => getNode(d.source).x)
        .attr('y1', d => getNode(d.source).y)
        .attr('x2', d => getNode(d.target).x)
        .attr('y2', d => getNode(d.target).y);
      
      nodeUpdate.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  
  simulation.force('link').links(linksData.filter(l => l.type === 'hierarchy'));
  
  // 初回のみシミュレーション実行、その後すぐに停止
  simulation.alpha(1).restart();
  
  // 3秒後に自動停止（初期レイアウト完了後）
  setTimeout(() => {
    simulation.stop();
    console.log('🛑 Force simulation stopped - nodes are now static');
  }, 3000);
}

// ===================================
// ドラッグ操作
// ===================================
function dragStarted(event, d) {
  // ドラッグ開始時はシミュレーションを再開させない（静的に保つ）
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}

function dragEnded(event, d) {
  // ドラッグ終了時は固定位置を解除せず、そのまま固定
  // d.fx と d.fy を保持して、ノードの位置を固定
}

// ===================================
// リンクドラッグ
// ===================================
function startDragLink(event, sourceNode) {
  if (sourceNode.type !== 'heading') return;
  
  event.stopPropagation();
  dragSourceNode = sourceNode;
  
  const container = document.getElementById('mindmap-container');
  const svg = container.querySelector('svg');
  const mainGroup = svg.querySelector('g.main');
  
  dragLine = d3.select(mainGroup).append('line')
    .attr('stroke', '#3B82F6')
    .attr('stroke-width', 3)
    .attr('stroke-dasharray', '5,5')
    .style('pointer-events', 'none');
  
  const onMouseMove = (e) => {
    const rect = container.getBoundingClientRect();
    const transform = d3.zoomTransform(svg);
    const x = (e.clientX - rect.left - transform.x) / transform.k;
    const y = (e.clientY - rect.top - transform.y) / transform.k;
    
    dragLine
      .attr('x1', sourceNode.x)
      .attr('y1', sourceNode.y)
      .attr('x2', x)
      .attr('y2', y);
  };
  
  const onMouseUp = (e) => {
    container.removeEventListener('mousemove', onMouseMove);
    container.removeEventListener('mouseup', onMouseUp);
    
    if (dragLine) {
      dragLine.remove();
      dragLine = null;
    }
    
    const rect = container.getBoundingClientRect();
    const transform = d3.zoomTransform(svg);
    const x = (e.clientX - rect.left - transform.x) / transform.k;
    const y = (e.clientY - rect.top - transform.y) / transform.k;
    
    const targetNode = findNodeAtPosition(x, y);
    
    if (targetNode && targetNode.id !== dragSourceNode.id) {
      if (targetNode.type === 'heading' || targetNode.type === 'article') {
        if (dragSourceNode.articleId !== targetNode.articleId) {
          showLinkModal(dragSourceNode, targetNode);
        } else {
          alert('同じ記事内の見出しへのリンクは作成できません');
        }
      }
    }
    
    dragSourceNode = null;
  };
  
  container.addEventListener('mousemove', onMouseMove);
  container.addEventListener('mouseup', onMouseUp);
}

function findNodeAtPosition(x, y) {
  const threshold = 50;
  for (const node of nodes) {
    const distance = Math.sqrt((node.x - x) ** 2 + (node.y - y) ** 2);
    if (distance < threshold) {
      return node;
    }
  }
  return null;
}

// ===================================
// リンク作成モーダル
// ===================================
function showLinkModal(sourceNode, targetNode) {
  const fromArticle = articles.find(a => a.id === sourceNode.articleId);
  const toArticle = articles.find(a => a.id === targetNode.articleId);
  
  document.getElementById('modal-from').textContent = 
    `${fromArticle.title} > ${sourceNode.label}`;
  
  document.getElementById('modal-to').textContent = 
    targetNode.type === 'heading' 
      ? `${toArticle.title} > ${targetNode.label}`
      : toArticle.title;
  
  document.getElementById('modal-link-text').value = 
    `${toArticle.title}について詳しく見る`;
  
  document.getElementById('link-modal').classList.remove('hidden');
  
  window.pendingLink = { sourceNode, targetNode };
}

function closeLinkModal() {
  document.getElementById('link-modal').classList.add('hidden');
  window.pendingLink = null;
}

async function confirmCreateLink() {
  if (!window.pendingLink) return;
  
  const { sourceNode, targetNode } = window.pendingLink;
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
        from_article_id: sourceNode.articleId,
        from_heading: sourceNode.headingText,
        from_heading_id: sourceNode.headingId,
        to_article_id: targetNode.articleId,
        to_heading: targetNode.type === 'heading' ? targetNode.headingText : null,
        to_heading_id: targetNode.type === 'heading' ? targetNode.headingId : null,
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

// ===================================
// ユーティリティ
// ===================================
function getNodeId(node) {
  return typeof node === 'object' ? node.id : node;
}

function getNode(node) {
  if (typeof node === 'object') return node;
  return nodes.find(n => n.id === node) || { x: 0, y: 0 };
}

async function refreshMindMap() {
  await loadMindMapData();
  alert('✅ 更新しました');
}

function resetLayout() {
  // すべてのノードの固定を解除
  nodes.forEach(node => {
    node.fx = null;
    node.fy = null;
  });
  
  // シミュレーションを再開
  simulation.alpha(1).restart();
  
  // 3秒後に再度停止
  setTimeout(() => {
    simulation.stop();
    console.log('🛑 Force simulation stopped after reset');
  }, 3000);
  
  alert('✅ 自動整列を実行中...');
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
window.resetLayout = resetLayout;
window.clearAllLinks = clearAllLinks;
window.closeLinkModal = closeLinkModal;
window.confirmCreateLink = confirmCreateLink;

console.log('✅ Mind Map Internal Links Module Loaded!');
