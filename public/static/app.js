// ===================================
// AI Blog CMS - Frontend Application
// ===================================

const API_BASE = '/api';
let authToken = localStorage.getItem('auth_token');
let currentUser = null;
let currentProjects = [];
let selectedProjectId = null;

// ===================================
// 初期化
// ===================================
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

// ===================================
// 認証チェック
// ===================================
async function checkAuth() {
  if (!authToken) {
    showLoginScreen();
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      currentUser = data.data;
      showMainScreen();
      loadDashboard();
    } else {
      localStorage.removeItem('auth_token');
      authToken = null;
      showLoginScreen();
    }
  } catch (error) {
    console.error('Auth check error:', error);
    showLoginScreen();
  }
}

// ===================================
// 画面切り替え
// ===================================
function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('main-screen').classList.add('hidden');
}

function showMainScreen() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-screen').classList.remove('hidden');
  document.getElementById('user-info').textContent = currentUser ? currentUser.email : '';
}

function showLogin() {
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('message').textContent = '';
}

function showRegister() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('register-form').classList.remove('hidden');
  document.getElementById('message').textContent = '';
}

// ===================================
// 認証処理
// ===================================
async function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const messageEl = document.getElementById('message');

  if (!email || !password) {
    messageEl.textContent = 'メールアドレスとパスワードを入力してください';
    messageEl.className = 'mt-4 text-center text-sm text-red-600';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.success) {
      authToken = data.data.token;
      localStorage.setItem('auth_token', authToken);
      currentUser = data.data.user;
      showMainScreen();
      loadDashboard();
      messageEl.textContent = '';
    } else {
      messageEl.textContent = data.error || 'ログインに失敗しました';
      messageEl.className = 'mt-4 text-center text-sm text-red-600';
    }
  } catch (error) {
    console.error('Login error:', error);
    messageEl.textContent = 'ログインに失敗しました';
    messageEl.className = 'mt-4 text-center text-sm text-red-600';
  }
}

async function handleRegister() {
  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const messageEl = document.getElementById('message');

  if (!name || !email || !password) {
    messageEl.textContent = 'すべての項目を入力してください';
    messageEl.className = 'mt-4 text-center text-sm text-red-600';
    return;
  }

  if (password.length < 8) {
    messageEl.textContent = 'パスワードは8文字以上で入力してください';
    messageEl.className = 'mt-4 text-center text-sm text-red-600';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();

    if (data.success) {
      authToken = data.data.token;
      localStorage.setItem('auth_token', authToken);
      currentUser = data.data.user;
      showMainScreen();
      loadDashboard();
      messageEl.textContent = '';
    } else {
      messageEl.textContent = data.error || '登録に失敗しました';
      messageEl.className = 'mt-4 text-center text-sm text-red-600';
    }
  } catch (error) {
    console.error('Register error:', error);
    messageEl.textContent = '登録に失敗しました';
    messageEl.className = 'mt-4 text-center text-sm text-red-600';
  }
}

async function handleLogout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
  }

  localStorage.removeItem('auth_token');
  authToken = null;
  currentUser = null;
  showLoginScreen();
}

// ===================================
// ダッシュボード
// ===================================
async function loadDashboard() {
  try {
    // プロジェクト数取得
    const projectsRes = await fetch(`${API_BASE}/projects`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const projectsData = await projectsRes.json();
    currentProjects = projectsData.data || [];
    document.getElementById('project-count').textContent = currentProjects.length;

    // 最初のプロジェクトを選択
    if (currentProjects.length > 0) {
      selectedProjectId = currentProjects[0].id;
      
      // キーワード数取得
      const keywordsRes = await fetch(`${API_BASE}/keywords?projectId=${selectedProjectId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const keywordsData = await keywordsRes.json();
      document.getElementById('keyword-count').textContent = keywordsData.data?.length || 0;

      // 記事数取得
      const articlesRes = await fetch(`${API_BASE}/articles?projectId=${selectedProjectId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const articlesData = await articlesRes.json();
      document.getElementById('article-count').textContent = articlesData.data?.length || 0;
    }
  } catch (error) {
    console.error('Load dashboard error:', error);
  }
}

function showDashboard() {
  updateSidebarActive('dashboard');
  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = `
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
  `;
  loadDashboard();
}

// ===================================
// サイドバーアクティブ状態管理
// ===================================
function updateSidebarActive(page) {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.remove('active');
  });
}

// ===================================
// プロジェクト管理
// ===================================
async function showProjects() {
  updateSidebarActive('projects');
  const contentArea = document.getElementById('content-area');
  
  contentArea.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">プロジェクト管理</h1>
      <button onclick="showCreateProjectModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
        <i class="fas fa-plus mr-2"></i>新規作成
      </button>
    </div>
    <div id="projects-list" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="text-center py-12">
        <i class="fas fa-spinner fa-spin text-4xl text-gray-400"></i>
        <p class="text-gray-600 mt-4">読み込み中...</p>
      </div>
    </div>
  `;

  try {
    const response = await fetch(`${API_BASE}/projects`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();
    
    if (data.success && data.data.length > 0) {
      currentProjects = data.data;
      const projectsHtml = data.data.map(project => `
        <div class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-xl font-bold text-gray-800">${escapeHtml(project.name)}</h3>
              <p class="text-sm text-gray-600 mt-1">${escapeHtml(project.description || '')}</p>
            </div>
            <button onclick="selectProject(${project.id})" class="text-blue-600 hover:text-blue-800">
              <i class="fas fa-arrow-right"></i>
            </button>
          </div>
          <div class="text-sm text-gray-500">
            <p><i class="fas fa-globe mr-2"></i>${escapeHtml(project.domain || 'ドメイン未設定')}</p>
            <p class="mt-1"><i class="fas fa-calendar mr-2"></i>作成日: ${new Date(project.created_at).toLocaleDateString('ja-JP')}</p>
          </div>
        </div>
      `).join('');
      
      document.getElementById('projects-list').innerHTML = projectsHtml;
    } else {
      document.getElementById('projects-list').innerHTML = `
        <div class="col-span-2 text-center py-12">
          <i class="fas fa-folder-open text-6xl text-gray-300"></i>
          <p class="text-gray-600 mt-4">プロジェクトがまだありません</p>
          <button onclick="showCreateProjectModal()" class="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            最初のプロジェクトを作成
          </button>
        </div>
      `;
    }
  } catch (error) {
    console.error('Load projects error:', error);
    document.getElementById('projects-list').innerHTML = `
      <div class="col-span-2 text-center py-12">
        <i class="fas fa-exclamation-triangle text-6xl text-red-300"></i>
        <p class="text-red-600 mt-4">プロジェクトの読み込みに失敗しました</p>
      </div>
    `;
  }
}

function selectProject(projectId) {
  selectedProjectId = projectId;
  showArticles();
}

// ===================================
// キーワード管理
// ===================================
async function showKeywords() {
  updateSidebarActive('keywords');
  
  if (!selectedProjectId && currentProjects.length > 0) {
    selectedProjectId = currentProjects[0].id;
  }

  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">キーワード管理</h1>
      <button onclick="showAddKeywordModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700" ${!selectedProjectId ? 'disabled' : ''}>
        <i class="fas fa-plus mr-2"></i>キーワード追加
      </button>
    </div>
    <div id="keywords-list">
      <div class="text-center py-12">
        <i class="fas fa-spinner fa-spin text-4xl text-gray-400"></i>
        <p class="text-gray-600 mt-4">読み込み中...</p>
      </div>
    </div>
  `;

  if (!selectedProjectId) {
    document.getElementById('keywords-list').innerHTML = `
      <div class="text-center py-12">
        <i class="fas fa-folder-open text-6xl text-gray-300"></i>
        <p class="text-gray-600 mt-4">まずプロジェクトを作成してください</p>
      </div>
    `;
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/keywords?projectId=${selectedProjectId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();
    
    if (data.success && data.data.length > 0) {
      const keywordsHtml = `
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <table class="min-w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">キーワード</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">検索意図</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作成日</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${data.data.map(keyword => `
                <tr>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${escapeHtml(keyword.keyword)}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${escapeHtml(keyword.search_intent || '-')}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(keyword.created_at).toLocaleDateString('ja-JP')}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button onclick="deleteKeyword(${keyword.id})" class="text-red-600 hover:text-red-800">
                      <i class="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      document.getElementById('keywords-list').innerHTML = keywordsHtml;
    } else {
      document.getElementById('keywords-list').innerHTML = `
        <div class="text-center py-12 bg-white rounded-lg shadow">
          <i class="fas fa-key text-6xl text-gray-300"></i>
          <p class="text-gray-600 mt-4">キーワードがまだありません</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Load keywords error:', error);
  }
}

// ===================================
// 記事管理
// ===================================
async function showArticles() {
  updateSidebarActive('articles');
  
  if (!selectedProjectId && currentProjects.length > 0) {
    selectedProjectId = currentProjects[0].id;
  }

  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold text-gray-800">記事管理</h1>
      <button onclick="showCreateArticleModal()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700" ${!selectedProjectId ? 'disabled' : ''}>
        <i class="fas fa-plus mr-2"></i>記事作成
      </button>
    </div>
    <div id="articles-list">
      <div class="text-center py-12">
        <i class="fas fa-spinner fa-spin text-4xl text-gray-400"></i>
        <p class="text-gray-600 mt-4">読み込み中...</p>
      </div>
    </div>
  `;

  if (!selectedProjectId) {
    document.getElementById('articles-list').innerHTML = `
      <div class="text-center py-12">
        <i class="fas fa-folder-open text-6xl text-gray-300"></i>
        <p class="text-gray-600 mt-4">まずプロジェクトを作成してください</p>
      </div>
    `;
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/articles?projectId=${selectedProjectId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();
    
    if (data.success && data.data.length > 0) {
      const articlesHtml = data.data.map(article => `
        <div class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
          <div class="flex justify-between items-start mb-4">
            <div class="flex-1">
              <h3 class="text-xl font-bold text-gray-800 mb-2">${escapeHtml(article.title)}</h3>
              <span class="px-3 py-1 text-sm rounded-full ${getStatusColor(article.status)}">${getStatusText(article.status)}</span>
            </div>
            <div class="flex gap-2">
              <button onclick="viewArticle(${article.id})" class="text-blue-600 hover:text-blue-800">
                <i class="fas fa-eye"></i>
              </button>
              <button onclick="deleteArticle(${article.id})" class="text-red-600 hover:text-red-800">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <p class="text-sm text-gray-500">
            <i class="fas fa-calendar mr-2"></i>${new Date(article.created_at).toLocaleDateString('ja-JP')}
          </p>
        </div>
      `).join('');
      
      document.getElementById('articles-list').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${articlesHtml}
        </div>
      `;
    } else {
      document.getElementById('articles-list').innerHTML = `
        <div class="text-center py-12 bg-white rounded-lg shadow">
          <i class="fas fa-file-alt text-6xl text-gray-300"></i>
          <p class="text-gray-600 mt-4">記事がまだありません</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Load articles error:', error);
  }
}

// ===================================
// AI記事生成
// ===================================
function showGenerate() {
  updateSidebarActive('generate');
  
  if (!selectedProjectId && currentProjects.length > 0) {
    selectedProjectId = currentProjects[0].id;
  }

  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = `
    <h1 class="text-3xl font-bold text-gray-800 mb-6">AI記事生成</h1>
    
    <div class="bg-white p-6 rounded-lg shadow mb-6">
      <h2 class="text-xl font-bold text-gray-800 mb-4">
        <i class="fas fa-magic text-blue-600 mr-2"></i>構成生成
      </h2>
      <div class="mb-4">
        <label class="block text-gray-700 text-sm font-bold mb-2">キーワード</label>
        <input type="text" id="outline-keyword" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="AI ブログ 自動化">
      </div>
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">文字数目安</label>
          <input type="number" id="outline-chars" value="3000" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
        </div>
        <div>
          <label class="block text-gray-700 text-sm font-bold mb-2">トーン</label>
          <select id="outline-tone" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
            <option value="professional">プロフェッショナル</option>
            <option value="casual">カジュアル</option>
            <option value="friendly">フレンドリー</option>
          </select>
        </div>
      </div>
      <button onclick="generateOutline()" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700" ${!selectedProjectId ? 'disabled' : ''}>
        <i class="fas fa-magic mr-2"></i>構成を生成
      </button>
      <div id="outline-result" class="mt-4"></div>
    </div>

    <div class="bg-white p-6 rounded-lg shadow">
      <h2 class="text-xl font-bold text-gray-800 mb-4">
        <i class="fas fa-file-alt text-green-600 mr-2"></i>本文生成
      </h2>
      <div class="mb-4">
        <label class="block text-gray-700 text-sm font-bold mb-2">キーワード</label>
        <input type="text" id="article-keyword" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="AI ブログ 自動化">
      </div>
      <div class="mb-4">
        <label class="block text-gray-700 text-sm font-bold mb-2">構成 (JSON形式)</label>
        <textarea id="article-outline" rows="6" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm" placeholder='{"title": "記事タイトル", "outline": [...]}'></textarea>
      </div>
      <button onclick="generateArticle()" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700" ${!selectedProjectId ? 'disabled' : ''}>
        <i class="fas fa-magic mr-2"></i>本文を生成
      </button>
      <div id="article-result" class="mt-4"></div>
    </div>
  `;
}

async function generateOutline() {
  const keyword = document.getElementById('outline-keyword').value;
  const maxChars = document.getElementById('outline-chars').value;
  const tone = document.getElementById('outline-tone').value;
  const resultEl = document.getElementById('outline-result');

  if (!keyword) {
    resultEl.innerHTML = '<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">キーワードを入力してください</div>';
    return;
  }

  resultEl.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-2xl text-blue-600"></i><p class="text-gray-600 mt-2">構成を生成中...</p></div>';

  try {
    const response = await fetch(`${API_BASE}/generate/outline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        project_id: selectedProjectId,
        keyword,
        params: { max_chars: maxChars, tone }
      })
    });

    const data = await response.json();

    if (data.success) {
      const outline = data.data.outline;
      resultEl.innerHTML = `
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          ✓ 構成生成が完了しました
        </div>
        <div class="bg-gray-50 p-4 rounded-lg">
          <pre class="text-sm overflow-auto">${JSON.stringify(outline, null, 2)}</pre>
        </div>
        <button onclick="copyOutline()" class="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <i class="fas fa-copy mr-2"></i>本文生成欄にコピー
        </button>
      `;
      
      // グローバル変数に保存
      window.lastGeneratedOutline = outline;
    } else {
      resultEl.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">${data.error || '構成生成に失敗しました'}</div>`;
    }
  } catch (error) {
    console.error('Generate outline error:', error);
    resultEl.innerHTML = '<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">構成生成に失敗しました</div>';
  }
}

function copyOutline() {
  if (window.lastGeneratedOutline) {
    document.getElementById('article-outline').value = JSON.stringify(window.lastGeneratedOutline, null, 2);
    document.getElementById('article-keyword').value = document.getElementById('outline-keyword').value;
  }
}

async function generateArticle() {
  const keyword = document.getElementById('article-keyword').value;
  const outlineText = document.getElementById('article-outline').value;
  const resultEl = document.getElementById('article-result');

  if (!keyword || !outlineText) {
    resultEl.innerHTML = '<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">キーワードと構成を入力してください</div>';
    return;
  }

  let outline;
  try {
    outline = JSON.parse(outlineText);
  } catch (e) {
    outline = outlineText;
  }

  resultEl.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin text-2xl text-green-600"></i><p class="text-gray-600 mt-2">本文を生成中... (30秒ほどかかります)</p></div>';

  try {
    const response = await fetch(`${API_BASE}/generate/article`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        project_id: selectedProjectId,
        keyword,
        outline
      })
    });

    const data = await response.json();

    if (data.success) {
      const content = data.data.content;
      resultEl.innerHTML = `
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          ✓ 本文生成が完了しました
        </div>
        <div class="bg-gray-50 p-4 rounded-lg max-h-96 overflow-auto">
          <pre class="text-sm whitespace-pre-wrap">${escapeHtml(content)}</pre>
        </div>
        <div class="mt-4 flex gap-2">
          <button onclick="saveGeneratedArticle('${escapeHtml(keyword)}', \`${content.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <i class="fas fa-save mr-2"></i>記事として保存
          </button>
          <button onclick="copyToClipboard(\`${content.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
            <i class="fas fa-copy mr-2"></i>クリップボードにコピー
          </button>
        </div>
      `;
    } else {
      resultEl.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">${data.error || '本文生成に失敗しました'}</div>`;
    }
  } catch (error) {
    console.error('Generate article error:', error);
    resultEl.innerHTML = '<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">本文生成に失敗しました</div>';
  }
}

async function saveGeneratedArticle(keyword, content) {
  try {
    const response = await fetch(`${API_BASE}/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        project_id: selectedProjectId,
        title: keyword,
        content,
        status: 'draft'
      })
    });

    const data = await response.json();

    if (data.success) {
      alert('記事を保存しました');
      showArticles();
    } else {
      alert('記事の保存に失敗しました');
    }
  } catch (error) {
    console.error('Save article error:', error);
    alert('記事の保存に失敗しました');
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert('クリップボードにコピーしました');
  }).catch(() => {
    alert('コピーに失敗しました');
  });
}

// ===================================
// ユーティリティ関数
// ===================================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getStatusColor(status) {
  const colors = {
    draft: 'bg-gray-100 text-gray-800',
    review: 'bg-yellow-100 text-yellow-800',
    scheduled: 'bg-blue-100 text-blue-800',
    published: 'bg-green-100 text-green-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

function getStatusText(status) {
  const texts = {
    draft: '下書き',
    review: 'レビュー中',
    scheduled: '予約投稿',
    published: '公開済み'
  };
  return texts[status] || status;
}

// ===================================
// モーダル管理
// ===================================
function showModal(modalHtml) {
  // 既存のモーダルを削除
  const existingModal = document.getElementById('modal-overlay');
  if (existingModal) {
    existingModal.remove();
  }

  // モーダルオーバーレイを作成
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'modal-overlay';
  modalOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modalOverlay.innerHTML = modalHtml;
  
  // オーバーレイクリックで閉じる
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
  
  document.body.appendChild(modalOverlay);
}

function closeModal() {
  const modal = document.getElementById('modal-overlay');
  if (modal) {
    modal.remove();
  }
}

// ===================================
// プロジェクト作成モーダル
// ===================================
function showCreateProjectModal() {
  const modalHtml = `
    <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">
          <i class="fas fa-folder-plus text-blue-600 mr-2"></i>
          新規プロジェクト作成
        </h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <form onsubmit="handleCreateProject(event)" id="create-project-form">
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-bold mb-2">
            プロジェクト名 <span class="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            id="project-name" 
            required
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" 
            placeholder="テックブログ">
        </div>
        
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-bold mb-2">
            説明
          </label>
          <textarea 
            id="project-description" 
            rows="3"
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" 
            placeholder="AI・テクノロジー関連のブログメディア"></textarea>
        </div>
        
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-bold mb-2">
            ドメイン
          </label>
          <input 
            type="text" 
            id="project-domain" 
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" 
            placeholder="tech-blog.example.com">
        </div>
        
        <div class="mb-6">
          <label class="block text-gray-700 text-sm font-bold mb-2">
            公開方法
          </label>
          <select 
            id="project-publish-method"
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
            <option value="internal">内部CMS</option>
            <option value="wordpress">WordPress</option>
            <option value="manual">手動コピー</option>
          </select>
        </div>
        
        <div id="project-modal-message" class="mb-4 text-sm"></div>
        
        <div class="flex gap-3">
          <button 
            type="submit"
            class="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition duration-200">
            <i class="fas fa-check mr-2"></i>作成
          </button>
          <button 
            type="button"
            onclick="closeModal()"
            class="flex-1 bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400 transition duration-200">
            キャンセル
          </button>
        </div>
      </form>
    </div>
  `;
  
  showModal(modalHtml);
}

async function handleCreateProject(event) {
  event.preventDefault();
  
  const name = document.getElementById('project-name').value;
  const description = document.getElementById('project-description').value;
  const domain = document.getElementById('project-domain').value;
  const publishMethod = document.getElementById('project-publish-method').value;
  const messageEl = document.getElementById('project-modal-message');
  
  try {
    const response = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        name,
        description,
        domain,
        publish_method: publishMethod
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      messageEl.innerHTML = '<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded">✓ プロジェクトを作成しました</div>';
      setTimeout(() => {
        closeModal();
        showProjects();
      }, 1000);
    } else {
      messageEl.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">${data.error || 'プロジェクト作成に失敗しました'}</div>`;
    }
  } catch (error) {
    console.error('Create project error:', error);
    messageEl.innerHTML = '<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">プロジェクト作成に失敗しました</div>';
  }
}

// ===================================
// キーワード追加モーダル
// ===================================
function showAddKeywordModal() {
  if (!selectedProjectId) {
    alert('まずプロジェクトを選択してください');
    return;
  }
  
  const modalHtml = `
    <div class="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">
          <i class="fas fa-key text-purple-600 mr-2"></i>
          キーワード追加
        </h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <form onsubmit="handleAddKeyword(event)" id="add-keyword-form">
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-bold mb-2">
            キーワード <span class="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            id="keyword-text" 
            required
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" 
            placeholder="AI ブログ 自動化">
        </div>
        
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-bold mb-2">
            検索意図
          </label>
          <input 
            type="text" 
            id="keyword-search-intent" 
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" 
            placeholder="情報収集型 - AIでブログ運営を効率化したい人">
        </div>
        
        <div class="mb-6">
          <label class="block text-gray-700 text-sm font-bold mb-2">
            メモ
          </label>
          <textarea 
            id="keyword-notes" 
            rows="3"
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" 
            placeholder="キーワードに関するメモ"></textarea>
        </div>
        
        <div id="keyword-modal-message" class="mb-4 text-sm"></div>
        
        <div class="flex gap-3">
          <button 
            type="submit"
            class="flex-1 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition duration-200">
            <i class="fas fa-check mr-2"></i>追加
          </button>
          <button 
            type="button"
            onclick="closeModal()"
            class="flex-1 bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400 transition duration-200">
            キャンセル
          </button>
        </div>
      </form>
    </div>
  `;
  
  showModal(modalHtml);
}

async function handleAddKeyword(event) {
  event.preventDefault();
  
  const keyword = document.getElementById('keyword-text').value;
  const searchIntent = document.getElementById('keyword-search-intent').value;
  const notes = document.getElementById('keyword-notes').value;
  const messageEl = document.getElementById('keyword-modal-message');
  
  try {
    const response = await fetch(`${API_BASE}/keywords`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        project_id: selectedProjectId,
        keyword,
        search_intent: searchIntent,
        notes
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      messageEl.innerHTML = '<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded">✓ キーワードを追加しました</div>';
      setTimeout(() => {
        closeModal();
        showKeywords();
      }, 1000);
    } else {
      messageEl.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">${data.error || 'キーワード追加に失敗しました'}</div>`;
    }
  } catch (error) {
    console.error('Add keyword error:', error);
    messageEl.innerHTML = '<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">キーワード追加に失敗しました</div>';
  }
}

// ===================================
// 記事作成モーダル
// ===================================
function showCreateArticleModal() {
  if (!selectedProjectId) {
    alert('まずプロジェクトを選択してください');
    return;
  }
  
  const modalHtml = `
    <div class="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">
          <i class="fas fa-file-alt text-green-600 mr-2"></i>
          新規記事作成
        </h2>
        <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <form onsubmit="handleCreateArticle(event)" id="create-article-form">
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-bold mb-2">
            タイトル <span class="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            id="article-title" 
            required
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" 
            placeholder="AIでブログを自動化する方法">
        </div>
        
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-bold mb-2">
            スラッグ (URL用)
          </label>
          <input 
            type="text" 
            id="article-slug" 
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" 
            placeholder="ai-blog-automation">
          <p class="text-xs text-gray-500 mt-1">空欄の場合は自動生成されます</p>
        </div>
        
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-bold mb-2">
            本文
          </label>
          <textarea 
            id="article-content-input" 
            rows="10"
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm" 
            placeholder="# 見出し1

記事本文をMarkdown形式で入力してください..."></textarea>
        </div>
        
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-bold mb-2">
            メタディスクリプション
          </label>
          <textarea 
            id="article-meta-description" 
            rows="2"
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" 
            placeholder="記事の概要を120文字以内で入力"></textarea>
        </div>
        
        <div class="mb-6">
          <label class="block text-gray-700 text-sm font-bold mb-2">
            ステータス
          </label>
          <select 
            id="article-status"
            class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
            <option value="draft">下書き</option>
            <option value="review">レビュー中</option>
            <option value="scheduled">予約投稿</option>
            <option value="published">公開済み</option>
          </select>
        </div>
        
        <div id="article-modal-message" class="mb-4 text-sm"></div>
        
        <div class="flex gap-3">
          <button 
            type="submit"
            class="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition duration-200">
            <i class="fas fa-check mr-2"></i>作成
          </button>
          <button 
            type="button"
            onclick="closeModal()"
            class="flex-1 bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400 transition duration-200">
            キャンセル
          </button>
        </div>
      </form>
    </div>
  `;
  
  showModal(modalHtml);
}

async function handleCreateArticle(event) {
  event.preventDefault();
  
  const title = document.getElementById('article-title').value;
  const slug = document.getElementById('article-slug').value;
  const content = document.getElementById('article-content-input').value;
  const metaDescription = document.getElementById('article-meta-description').value;
  const status = document.getElementById('article-status').value;
  const messageEl = document.getElementById('article-modal-message');
  
  try {
    const response = await fetch(`${API_BASE}/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        project_id: selectedProjectId,
        title,
        slug: slug || null,
        content,
        meta_description: metaDescription,
        status
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      messageEl.innerHTML = '<div class="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded">✓ 記事を作成しました</div>';
      setTimeout(() => {
        closeModal();
        showArticles();
      }, 1000);
    } else {
      messageEl.innerHTML = `<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">${data.error || '記事作成に失敗しました'}</div>`;
    }
  } catch (error) {
    console.error('Create article error:', error);
    messageEl.innerHTML = '<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">記事作成に失敗しました</div>';
  }
}

// ===================================
// 記事詳細表示
// ===================================
async function viewArticle(id) {
  try {
    const response = await fetch(`${API_BASE}/articles/${id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const article = data.data;
      const modalHtml = `
        <div class="bg-white rounded-lg shadow-xl p-8 max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-file-alt text-blue-600 mr-2"></i>
              記事詳細
            </h2>
            <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>
          
          <div class="mb-6">
            <h3 class="text-2xl font-bold text-gray-900 mb-2">${escapeHtml(article.title)}</h3>
            <div class="flex gap-2 items-center text-sm text-gray-600">
              <span class="px-3 py-1 rounded-full ${getStatusColor(article.status)}">${getStatusText(article.status)}</span>
              <span><i class="fas fa-calendar mr-1"></i>${new Date(article.created_at).toLocaleDateString('ja-JP')}</span>
              ${article.slug ? `<span><i class="fas fa-link mr-1"></i>${escapeHtml(article.slug)}</span>` : ''}
            </div>
          </div>
          
          ${article.meta_description ? `
          <div class="mb-6">
            <h4 class="text-sm font-bold text-gray-700 mb-2">メタディスクリプション</h4>
            <p class="text-gray-600 bg-gray-50 p-3 rounded">${escapeHtml(article.meta_description)}</p>
          </div>
          ` : ''}
          
          <div class="mb-6">
            <h4 class="text-sm font-bold text-gray-700 mb-2">本文</h4>
            <div class="prose max-w-none bg-gray-50 p-4 rounded">
              <pre class="whitespace-pre-wrap text-sm">${escapeHtml(article.content || '(本文なし)')}</pre>
            </div>
          </div>
          
          <div class="flex gap-3">
            <button onclick="editArticle(${article.id})" class="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition duration-200">
              <i class="fas fa-edit mr-2"></i>編集
            </button>
            <button onclick="closeModal()" class="flex-1 bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400 transition duration-200">
              閉じる
            </button>
          </div>
        </div>
      `;
      
      showModal(modalHtml);
    } else {
      alert('記事の取得に失敗しました');
    }
  } catch (error) {
    console.error('View article error:', error);
    alert('記事の取得に失敗しました');
  }
}

async function editArticle(id) {
  alert('記事編集機能は開発中です (ID: ' + id + ')');
  // 将来的には編集モーダルを表示
}

async function deleteArticle(id) {
  if (!confirm('この記事を削除してもよろしいですか?')) return;
  
  try {
    const response = await fetch(`${API_BASE}/articles/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.ok) {
      showArticles();
    }
  } catch (error) {
    console.error('Delete article error:', error);
  }
}

async function deleteKeyword(id) {
  if (!confirm('このキーワードを削除してもよろしいですか?')) return;
  
  try {
    const response = await fetch(`${API_BASE}/keywords/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (response.ok) {
      showKeywords();
    }
  } catch (error) {
    console.error('Delete keyword error:', error);
  }
}
