/**
 * ===================================
 * 内部リンク管理 - トピッククラスターマインドマップ
 * Internal Links Management - Topic Cluster Mind Map
 * ===================================
 */

console.log('🗺️ Loading Topic Cluster Mind Map Module...');

// グローバル変数
let articles = [];
let links = [];
let network = null;
let nodes = null;
let edges = null;
let selectedNode = null;

// ===================================
// 初期化
// ===================================
function showInternalLinks() {
  console.log('📋 Initializing Mind Map View...');
  
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
          トピッククラスター管理
        </h1>
        <p class="text-gray-600 mt-2 text-lg">記事と見出しをビジュアルに接続してトピッククラスターを構築</p>
      </div>

      <!-- Vis.js CDN -->
      <link href="https://unpkg.com/vis-network@latest/styles/vis-network.min.css" rel="stylesheet" type="text/css" />
      <script src="https://unpkg.com/vis-network@latest/dist/vis-network.min.js"></script>

      <!-- ツールバー -->
      <div class="bg-white rounded-lg shadow-lg p-4 mb-6">
        <div class="flex flex-wrap items-center gap-4">
          <button onclick="refreshMindMap()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow">
            <i class="fas fa-sync-alt mr-2"></i>更新
          </button>
          <button onclick="addConnection()" class="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow">
            <i class="fas fa-link mr-2"></i>リンク追加
          </button>
          <button onclick="deleteSelectedConnection()" class="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow">
            <i class="fas fa-unlink mr-2"></i>選択したリンク削除
          </button>
          <button onclick="showNodeDetails()" class="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold shadow">
            <i class="fas fa-info-circle mr-2"></i>詳細表示
          </button>
          <button onclick="exportClusterData()" class="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-bold shadow">
            <i class="fas fa-download mr-2"></i>エクスポート
          </button>
        </div>
        
        <!-- 凡例 -->
        <div class="mt-4 flex items-center gap-6 text-sm">
          <div class="flex items-center">
            <div class="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
            <span>記事（タイトル）</span>
          </div>
          <div class="flex items-center">
            <div class="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
            <span>H2見出し</span>
          </div>
          <div class="flex items-center">
            <div class="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
            <span>H3見出し</span>
          </div>
        </div>
      </div>

      <!-- マインドマップ表示エリア -->
      <div class="bg-white rounded-lg shadow-lg p-4 mb-6">
        <div id="mindmap-container" style="height: 700px; border: 2px solid #e5e7eb; border-radius: 8px;"></div>
      </div>

      <!-- 選択中のノード情報 -->
      <div id="node-info" class="bg-white rounded-lg shadow-lg p-6 hidden">
        <h3 class="text-xl font-bold text-gray-800 mb-4">
          <i class="fas fa-info-circle text-blue-600 mr-2"></i>選択中のノード
        </h3>
        <div id="node-info-content"></div>
      </div>

      <!-- リンク追加モーダル -->
      <div id="link-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <h3 class="text-2xl font-bold text-gray-800 mb-4">
            <i class="fas fa-link text-green-600 mr-2"></i>内部リンクを追加
          </h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">リンク元（From）</label>
              <select id="link-from" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
                <option value="">選択してください</option>
              </select>
            </div>
            
            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">リンク先（To）</label>
              <select id="link-to" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
                <option value="">選択してください</option>
              </select>
            </div>
            
            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">リンクテキスト（任意）</label>
              <input type="text" id="link-text" placeholder="例: 詳しくはこちら" 
                class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
            </div>
            
            <div class="flex gap-3">
              <button onclick="saveNewConnection()" class="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold">
                <i class="fas fa-save mr-2"></i>保存
              </button>
              <button onclick="closeLinkModal()" class="flex-1 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 font-bold">
                <i class="fas fa-times mr-2"></i>キャンセル
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // 少し待ってからデータ読み込み（Vis.jsのロードを待つ）
  setTimeout(() => {
    loadMindMapData();
  }, 500);
}

// ===================================
// データ読み込み
// ===================================
async function loadMindMapData() {
  try {
    // 記事一覧を取得
    const articlesRes = await fetch(\`\${API_BASE}/articles\`, {
      headers: {
        'Authorization': \`Bearer \${authToken}\`
      }
    });
    const articlesData = await articlesRes.json();
    articles = articlesData.success ? articlesData.data : [];

    // 内部リンクを取得
    const linksRes = await fetch(\`\${API_BASE}/internal-links\`, {
      headers: {
        'Authorization': \`Bearer \${localStorage.getItem('token')}\`,
        'X-User-Id': currentUser.id
      }
    });
    const linksData = await linksRes.json();
    links = linksData.links || [];

    // マインドマップを描画
    renderMindMap();
    
  } catch (error) {
    console.error('Failed to load mind map data:', error);
    showToast('データの読み込みに失敗しました', 'error');
  }
}

// ===================================
// マインドマップ描画
// ===================================
function renderMindMap() {
  if (typeof vis === 'undefined') {
    console.error('Vis.js not loaded yet, retrying...');
    setTimeout(renderMindMap, 500);
    return;
  }

  const nodesArray = [];
  const edgesArray = [];
  const nodeIdMap = new Map(); // ID管理用

  // 記事と見出しをノードとして追加
  articles.forEach(article => {
    // 記事本体のノード
    const articleNodeId = \`article-\${article.id}\`;
    nodeIdMap.set(articleNodeId, {
      type: 'article',
      articleId: article.id,
      title: article.title
    });

    nodesArray.push({
      id: articleNodeId,
      label: article.title,
      color: {
        background: '#3B82F6',
        border: '#1E40AF',
        highlight: { background: '#60A5FA', border: '#1E3A8A' }
      },
      font: { color: '#FFFFFF', size: 16, bold: true },
      shape: 'box',
      margin: 10
    });

    // 見出しを解析
    if (article.outline && typeof article.outline === 'object') {
      const headings = article.outline.headings || [];
      
      headings.forEach((heading, index) => {
        const level = heading.level || 'h2';
        const headingId = \`heading-\${article.id}-\${index}\`;
        
        nodeIdMap.set(headingId, {
          type: 'heading',
          articleId: article.id,
          headingIndex: index,
          headingText: heading.text,
          level: level
        });

        const isH2 = level === 'h2';
        nodesArray.push({
          id: headingId,
          label: heading.text || heading,
          color: {
            background: isH2 ? '#10B981' : '#F59E0B',
            border: isH2 ? '#047857' : '#D97706',
            highlight: { 
              background: isH2 ? '#34D399' : '#FBBF24', 
              border: isH2 ? '#065F46' : '#B45309'
            }
          },
          font: { color: '#FFFFFF', size: isH2 ? 14 : 12 },
          shape: 'ellipse'
        });

        // 記事と見出しを接続
        edgesArray.push({
          from: articleNodeId,
          to: headingId,
          color: { color: '#94A3B8', opacity: 0.5 },
          width: 1,
          dashes: true
        });
      });
    }
  });

  // 保存されている内部リンクをエッジとして追加
  links.forEach(link => {
    const fromId = link.from_heading_id 
      ? \`heading-\${link.from_article_id}-\${link.from_heading_id}\`
      : \`article-\${link.from_article_id}\`;
    
    const toId = link.to_heading_id
      ? \`heading-\${link.to_article_id}-\${link.to_heading_id}\`
      : \`article-\${link.to_article_id}\`;

    edgesArray.push({
      id: \`link-\${link.id}\`,
      from: fromId,
      to: toId,
      label: link.link_text || '',
      color: { color: '#EF4444' },
      width: 3,
      arrows: 'to',
      smooth: { type: 'continuous' }
    });
  });

  // Vis.jsネットワーク作成
  const container = document.getElementById('mindmap-container');
  nodes = new vis.DataSet(nodesArray);
  edges = new vis.DataSet(edgesArray);

  const data = { nodes, edges };
  const options = {
    physics: {
      enabled: true,
      barnesHut: {
        gravitationalConstant: -8000,
        centralGravity: 0.3,
        springLength: 200,
        springConstant: 0.04,
        damping: 0.09
      },
      stabilization: {
        iterations: 200
      }
    },
    interaction: {
      hover: true,
      tooltipDelay: 100,
      navigationButtons: true,
      keyboard: true
    },
    layout: {
      improvedLayout: true,
      hierarchical: false
    }
  };

  network = new vis.Network(container, data, options);

  // イベントリスナー
  network.on('click', function(params) {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0];
      selectedNode = nodeId;
      displayNodeInfo(nodeId);
    }
  });

  network.on('doubleClick', function(params) {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0];
      const nodeData = nodeIdMap.get(nodeId);
      if (nodeData && nodeData.type === 'article') {
        editArticle(nodeData.articleId);
      }
    }
  });

  showToast(\`\${nodesArray.length}個のノードと\${edgesArray.length}個のエッジを表示しました\`, 'success');
}

// ===================================
// ノード情報表示
// ===================================
function displayNodeInfo(nodeId) {
  const node = nodes.get(nodeId);
  const infoContainer = document.getElementById('node-info');
  const infoContent = document.getElementById('node-info-content');

  if (!node) return;

  const connectedEdges = network.getConnectedEdges(nodeId);
  const connectedNodes = network.getConnectedNodes(nodeId);

  infoContent.innerHTML = \`
    <div class="space-y-3">
      <div>
        <span class="font-bold text-gray-700">ノードID:</span>
        <span class="text-gray-900">\${nodeId}</span>
      </div>
      <div>
        <span class="font-bold text-gray-700">ラベル:</span>
        <span class="text-gray-900">\${node.label}</span>
      </div>
      <div>
        <span class="font-bold text-gray-700">接続数:</span>
        <span class="text-gray-900">\${connectedNodes.length}個のノードに接続</span>
      </div>
      <div>
        <span class="font-bold text-gray-700">エッジ数:</span>
        <span class="text-gray-900">\${connectedEdges.length}本</span>
      </div>
    </div>
  \`;

  infoContainer.classList.remove('hidden');
}

// ===================================
// リンク管理
// ===================================
function addConnection() {
  const modal = document.getElementById('link-modal');
  const fromSelect = document.getElementById('link-from');
  const toSelect = document.getElementById('link-to');

  // セレクトボックスをクリア
  fromSelect.innerHTML = '<option value="">選択してください</option>';
  toSelect.innerHTML = '<option value="">選択してください</option>';

  // 全ノードをオプションとして追加
  articles.forEach(article => {
    const articleOption = document.createElement('option');
    articleOption.value = \`article-\${article.id}\`;
    articleOption.textContent = \`📄 \${article.title}\`;
    fromSelect.appendChild(articleOption.cloneNode(true));
    toSelect.appendChild(articleOption.cloneNode(true));

    // 見出しも追加
    if (article.outline && article.outline.headings) {
      article.outline.headings.forEach((heading, index) => {
        const headingOption = document.createElement('option');
        headingOption.value = \`heading-\${article.id}-\${index}\`;
        const level = heading.level || 'h2';
        const prefix = level === 'h2' ? '  ├─ H2' : '  └─ H3';
        headingOption.textContent = \`\${prefix}: \${heading.text || heading}\`;
        fromSelect.appendChild(headingOption.cloneNode(true));
        toSelect.appendChild(headingOption.cloneNode(true));
      });
    }
  });

  modal.classList.remove('hidden');
}

function closeLinkModal() {
  document.getElementById('link-modal').classList.add('hidden');
}

async function saveNewConnection() {
  const fromId = document.getElementById('link-from').value;
  const toId = document.getElementById('link-to').value;
  const linkText = document.getElementById('link-text').value;

  if (!fromId || !toId) {
    alert('リンク元とリンク先を選択してください');
    return;
  }

  if (fromId === toId) {
    alert('同じノードへのリンクは作成できません');
    return;
  }

  // IDを解析
  const parseNodeId = (id) => {
    if (id.startsWith('article-')) {
      return {
        articleId: parseInt(id.replace('article-', '')),
        headingId: null
      };
    } else if (id.startsWith('heading-')) {
      const parts = id.replace('heading-', '').split('-');
      return {
        articleId: parseInt(parts[0]),
        headingId: parseInt(parts[1])
      };
    }
    return null;
  };

  const from = parseNodeId(fromId);
  const to = parseNodeId(toId);

  if (!from || !to) {
    alert('無効なノードIDです');
    return;
  }

  try {
    const response = await fetch(\`\${API_BASE}/internal-links\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${localStorage.getItem('token')}\`,
        'X-User-Id': currentUser.id
      },
      body: JSON.stringify({
        from_article_id: from.articleId,
        from_heading_id: from.headingId,
        to_article_id: to.articleId,
        to_heading_id: to.headingId,
        link_text: linkText || null
      })
    });

    const data = await response.json();

    if (data.success) {
      showToast('内部リンクを追加しました', 'success');
      closeLinkModal();
      refreshMindMap();
    } else {
      alert(data.error || 'リンクの追加に失敗しました');
    }
  } catch (error) {
    console.error('Save connection error:', error);
    alert('リンクの追加に失敗しました');
  }
}

function deleteSelectedConnection() {
  if (!selectedNode) {
    alert('ノードを選択してください');
    return;
  }

  const connectedEdges = network.getConnectedEdges(selectedNode);
  if (connectedEdges.length === 0) {
    alert('このノードに接続されているリンクはありません');
    return;
  }

  // リンクを選択させる
  // 簡易実装：最初のエッジを削除
  const edgeId = connectedEdges[0];
  const linkId = edgeId.replace('link-', '');

  if (confirm('選択したノードの最初のリンクを削除しますか？')) {
    deleteLink(parseInt(linkId));
  }
}

async function deleteLink(linkId) {
  try {
    const response = await fetch(\`\${API_BASE}/internal-links/\${linkId}\`, {
      method: 'DELETE',
      headers: {
        'Authorization': \`Bearer \${localStorage.getItem('token')}\`,
        'X-User-Id': currentUser.id
      }
    });

    const data = await response.json();

    if (data.success) {
      showToast('リンクを削除しました', 'success');
      refreshMindMap();
    } else {
      alert(data.error || 'リンクの削除に失敗しました');
    }
  } catch (error) {
    console.error('Delete link error:', error);
    alert('リンクの削除に失敗しました');
  }
}

function refreshMindMap() {
  loadMindMapData();
}

function showNodeDetails() {
  if (!selectedNode) {
    alert('ノードを選択してください');
    return;
  }
  displayNodeInfo(selectedNode);
}

function exportClusterData() {
  const data = {
    nodes: nodes.get(),
    edges: edges.get(),
    articles: articles,
    links: links
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = \`topic-cluster-\${new Date().toISOString().split('T')[0]}.json\`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('クラスターデータをエクスポートしました', 'success');
}

console.log('✅ Topic Cluster Mind Map Module Loaded');
