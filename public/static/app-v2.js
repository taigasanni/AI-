// ===================================
// AI Blog CMS v2 - Simplified Version
// ===================================

const API_BASE = '/api';
let authToken = localStorage.getItem('auth_token');
let currentUser = null;

// コンテンツ作成フローの状態管理
let contentFlow = {
  keyword: '',
  outline: null,
  article: '',
  step: 'keyword' // keyword, outline, article, rewrite
};

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
      showContentCreation(); // デフォルトでコンテンツ作成画面を表示
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
      showContentCreation();
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
      showContentCreation();
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
// サイドバーアクティブ状態管理
// ===================================
function updateSidebarActive(page) {
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.remove('active');
  });
  const activeLink = document.querySelector(`[data-page="${page}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
}

// ===================================
// コンテンツ作成画面 (統合フロー)
// ===================================
function showContentCreation() {
  updateSidebarActive('content');
  
  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = `
    <h1 class="text-3xl font-bold text-gray-800 mb-6">
      <i class="fas fa-edit text-blue-600 mr-3"></i>
      コンテンツ作成
    </h1>
    
    <!-- プログレスバー -->
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex-1 text-center ${contentFlow.step === 'keyword' ? 'text-blue-600 font-bold' : 'text-gray-400'}">
          <i class="fas fa-key text-2xl mb-2"></i>
          <p class="text-sm">1. キーワード入力</p>
        </div>
        <div class="flex-1 border-t-2 ${contentFlow.step !== 'keyword' ? 'border-blue-600' : 'border-gray-300'}"></div>
        <div class="flex-1 text-center ${contentFlow.step === 'outline' ? 'text-blue-600 font-bold' : 'text-gray-400'}">
          <i class="fas fa-list text-2xl mb-2"></i>
          <p class="text-sm">2. 構成作成</p>
        </div>
        <div class="flex-1 border-t-2 ${contentFlow.step === 'article' || contentFlow.step === 'rewrite' ? 'border-blue-600' : 'border-gray-300'}"></div>
        <div class="flex-1 text-center ${contentFlow.step === 'article' || contentFlow.step === 'rewrite' ? 'text-blue-600 font-bold' : 'text-gray-400'}">
          <i class="fas fa-file-alt text-2xl mb-2"></i>
          <p class="text-sm">3. 記事執筆</p>
        </div>
        <div class="flex-1 border-t-2 ${contentFlow.step === 'rewrite' ? 'border-blue-600' : 'border-gray-300'}"></div>
        <div class="flex-1 text-center ${contentFlow.step === 'rewrite' ? 'text-blue-600 font-bold' : 'text-gray-400'}">
          <i class="fas fa-redo text-2xl mb-2"></i>
          <p class="text-sm">4. リライト</p>
        </div>
      </div>
    </div>
    
    <!-- メインコンテンツエリア -->
    <div id="content-flow-area"></div>
  `;
  
  renderCurrentStep();
}

function renderCurrentStep() {
  const area = document.getElementById('content-flow-area');
  
  if (contentFlow.step === 'keyword') {
    area.innerHTML = `
      <div class="bg-white rounded-lg shadow-lg p-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">
          <i class="fas fa-key text-blue-600 mr-2"></i>
          ステップ1: キーワード入力
        </h2>
        
        <div class="mb-6">
          <label class="block text-gray-700 text-sm font-bold mb-2">
            キーワード <span class="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            id="keyword-input" 
            value="${escapeHtml(contentFlow.keyword)}"
            class="w-full px-4 py-3 text-lg border-2 rounded-lg focus:outline-none focus:border-blue-500" 
            placeholder="例: AI ブログ 自動化">
          <p class="text-sm text-gray-500 mt-2">
            <i class="fas fa-info-circle mr-1"></i>
            記事のメインキーワードを入力してください
          </p>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2">文字数目安</label>
            <input 
              type="number" 
              id="max-chars" 
              value="3000" 
              class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
          </div>
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2">トーン</label>
            <select id="tone" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
              <option value="professional">プロフェッショナル</option>
              <option value="casual">カジュアル</option>
              <option value="friendly">フレンドリー</option>
            </select>
          </div>
        </div>
        
        <button onclick="generateOutline()" class="w-full bg-blue-600 text-white font-bold py-4 rounded-lg hover:bg-blue-700 transition text-lg">
          <i class="fas fa-arrow-right mr-2"></i>
          構成を生成
        </button>
      </div>
    `;
  } else if (contentFlow.step === 'outline') {
    area.innerHTML = `
      <div class="bg-white rounded-lg shadow-lg p-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">
          <i class="fas fa-list text-green-600 mr-2"></i>
          ステップ2: 記事構成
        </h2>
        
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p class="text-blue-800">
            <i class="fas fa-lightbulb mr-2"></i>
            <strong>キーワード:</strong> ${escapeHtml(contentFlow.keyword)}
          </p>
        </div>
        
        <div class="mb-6">
          <label class="block text-gray-700 text-sm font-bold mb-2">生成された構成</label>
          <textarea 
            id="outline-edit" 
            rows="15"
            class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
          >${JSON.stringify(contentFlow.outline, null, 2)}</textarea>
          <p class="text-sm text-gray-500 mt-2">
            <i class="fas fa-info-circle mr-1"></i>
            構成を編集できます。そのまま使用する場合は「本文を生成」ボタンをクリック
          </p>
        </div>
        
        <div class="flex gap-4">
          <button onclick="backToKeyword()" class="flex-1 bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400 transition">
            <i class="fas fa-arrow-left mr-2"></i>
            戻る
          </button>
          <button onclick="generateArticle()" class="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition">
            <i class="fas fa-arrow-right mr-2"></i>
            本文を生成
          </button>
        </div>
      </div>
    `;
  } else if (contentFlow.step === 'article' || contentFlow.step === 'rewrite') {
    area.innerHTML = `
      <div class="bg-white rounded-lg shadow-lg p-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">
          <i class="fas fa-file-alt text-purple-600 mr-2"></i>
          ステップ3: 記事本文 ${contentFlow.step === 'rewrite' ? '(リライト済み)' : ''}
        </h2>
        
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p class="text-blue-800">
            <i class="fas fa-lightbulb mr-2"></i>
            <strong>キーワード:</strong> ${escapeHtml(contentFlow.keyword)}
          </p>
        </div>
        
        <div class="mb-6">
          <label class="block text-gray-700 text-sm font-bold mb-2">記事本文 (Markdown)</label>
          <textarea 
            id="article-edit" 
            rows="20"
            class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
          >${escapeHtml(contentFlow.article)}</textarea>
          <div class="flex justify-between items-center mt-2">
            <p class="text-sm text-gray-500">
              <i class="fas fa-info-circle mr-1"></i>
              文字数: <span id="char-count">${contentFlow.article.length}</span>文字
            </p>
            <button onclick="copyToClipboard()" class="text-blue-600 hover:underline text-sm">
              <i class="fas fa-copy mr-1"></i>クリップボードにコピー
            </button>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2">タイトル</label>
            <input 
              type="text" 
              id="article-title" 
              value="${contentFlow.outline?.title || ''}"
              class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
          </div>
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2">ステータス</label>
            <select id="article-status" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
              <option value="draft">下書き</option>
              <option value="review">レビュー中</option>
              <option value="published">公開</option>
            </select>
          </div>
        </div>
        
        <div class="flex gap-4">
          <button onclick="backToOutline()" class="flex-1 bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400 transition">
            <i class="fas fa-arrow-left mr-2"></i>
            構成に戻る
          </button>
          <button onclick="rewriteArticle()" class="flex-1 bg-yellow-600 text-white font-bold py-3 rounded-lg hover:bg-yellow-700 transition">
            <i class="fas fa-redo mr-2"></i>
            リライト
          </button>
          <button onclick="saveArticle()" class="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition">
            <i class="fas fa-save mr-2"></i>
            保存
          </button>
        </div>
      </div>
    `;
    
    // 文字数カウント
    const textarea = document.getElementById('article-edit');
    if (textarea) {
      textarea.addEventListener('input', () => {
        document.getElementById('char-count').textContent = textarea.value.length;
      });
    }
  }
}

// ===================================
// コンテンツ作成フロー関数
// ===================================
async function generateOutline() {
  const keyword = document.getElementById('keyword-input').value;
  const maxChars = document.getElementById('max-chars').value;
  const tone = document.getElementById('tone').value;
  
  if (!keyword) {
    alert('キーワードを入力してください');
    return;
  }
  
  contentFlow.keyword = keyword;
  
  // ローディング表示
  document.getElementById('content-flow-area').innerHTML = `
    <div class="bg-white rounded-lg shadow-lg p-12 text-center">
      <i class="fas fa-spinner fa-spin text-6xl text-blue-600 mb-4"></i>
      <h3 class="text-2xl font-bold text-gray-800 mb-2">構成を生成中...</h3>
      <p class="text-gray-600">約10秒お待ちください</p>
    </div>
  `;
  
  try {
    const response = await fetch(`${API_BASE}/generate/outline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        keyword,
        params: { max_chars: maxChars, tone }
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      contentFlow.outline = data.data.outline;
      contentFlow.step = 'outline';
      renderCurrentStep();
    } else {
      alert(data.error || '構成生成に失敗しました');
      contentFlow.step = 'keyword';
      renderCurrentStep();
    }
  } catch (error) {
    console.error('Generate outline error:', error);
    alert('構成生成に失敗しました');
    contentFlow.step = 'keyword';
    renderCurrentStep();
  }
}

async function generateArticle() {
  const outlineText = document.getElementById('outline-edit').value;
  
  try {
    contentFlow.outline = JSON.parse(outlineText);
  } catch (e) {
    alert('構成のJSON形式が正しくありません');
    return;
  }
  
  // ローディング表示
  document.getElementById('content-flow-area').innerHTML = `
    <div class="bg-white rounded-lg shadow-lg p-12 text-center">
      <i class="fas fa-spinner fa-spin text-6xl text-green-600 mb-4"></i>
      <h3 class="text-2xl font-bold text-gray-800 mb-2">記事本文を生成中...</h3>
      <p class="text-gray-600">約30秒お待ちください</p>
    </div>
  `;
  
  try {
    const response = await fetch(`${API_BASE}/generate/article`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        keyword: contentFlow.keyword,
        outline: contentFlow.outline
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      contentFlow.article = data.data.content;
      contentFlow.step = 'article';
      renderCurrentStep();
    } else {
      alert(data.error || '記事生成に失敗しました');
      contentFlow.step = 'outline';
      renderCurrentStep();
    }
  } catch (error) {
    console.error('Generate article error:', error);
    alert('記事生成に失敗しました');
    contentFlow.step = 'outline';
    renderCurrentStep();
  }
}

async function rewriteArticle() {
  const currentArticle = document.getElementById('article-edit').value;
  
  if (!currentArticle) {
    alert('記事本文を入力してください');
    return;
  }
  
  // ローディング表示
  document.getElementById('content-flow-area').innerHTML = `
    <div class="bg-white rounded-lg shadow-lg p-12 text-center">
      <i class="fas fa-spinner fa-spin text-6xl text-yellow-600 mb-4"></i>
      <h3 class="text-2xl font-bold text-gray-800 mb-2">記事をリライト中...</h3>
      <p class="text-gray-600">約30秒お待ちください</p>
    </div>
  `;
  
  try {
    const response = await fetch(`${API_BASE}/generate/rewrite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        keyword: contentFlow.keyword,
        original_content: currentArticle
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      contentFlow.article = data.data.content;
      contentFlow.step = 'rewrite';
      renderCurrentStep();
    } else {
      alert(data.error || 'リライトに失敗しました');
      contentFlow.step = 'article';
      renderCurrentStep();
    }
  } catch (error) {
    console.error('Rewrite error:', error);
    alert('リライトに失敗しました');
    contentFlow.step = 'article';
    renderCurrentStep();
  }
}

async function saveArticle() {
  const title = document.getElementById('article-title').value;
  const content = document.getElementById('article-edit').value;
  const status = document.getElementById('article-status').value;
  
  if (!title || !content) {
    alert('タイトルと本文を入力してください');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title,
        content,
        status,
        meta_description: contentFlow.outline?.meta_description || ''
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('記事を保存しました');
      // フローをリセット
      contentFlow = {
        keyword: '',
        outline: null,
        article: '',
        step: 'keyword'
      };
      showContentCreation();
    } else {
      alert(data.error || '記事の保存に失敗しました');
    }
  } catch (error) {
    console.error('Save article error:', error);
    alert('記事の保存に失敗しました');
  }
}

function backToKeyword() {
  contentFlow.step = 'keyword';
  renderCurrentStep();
}

function backToOutline() {
  contentFlow.step = 'outline';
  renderCurrentStep();
}

function copyToClipboard() {
  const content = document.getElementById('article-edit').value;
  navigator.clipboard.writeText(content).then(() => {
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
