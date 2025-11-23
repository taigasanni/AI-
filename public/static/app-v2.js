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
  seo_title: '',
  meta_description: '',
  target_keywords: '',
  og_image_url: '',
  max_chars: 3000,
  tone: 'professional',
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
  document.getElementById('message').textContent = '';
}

// 招待制のため、新規登録機能は無効化
function showRegister() {
  // 新規登録は無効化（招待制）
  alert('新規登録は無効化されています。このシステムは招待制です。');
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

// 招待制のため、新規登録機能は無効化
async function handleRegister() {
  const messageEl = document.getElementById('message');
  messageEl.textContent = '新規登録は無効化されています。このシステムは招待制です。';
  messageEl.className = 'mt-4 text-center text-sm text-red-600';
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
  const activeLink = document.querySelector(`.sidebar-link[data-page="${page}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
}

// エイリアス関数（user-management.js等で使用）
function setActivePage(page) {
  updateSidebarActive(page);
}

// ===================================
// プロンプト管理
// ===================================
async function loadUserPrompts() {
  try {
    const response = await fetch(`${API_BASE}/prompts`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();
    
    if (data.success) {
      const prompts = data.data;
      const promptsSection = document.getElementById('prompts-section');
      
      if (prompts.length === 0) {
        promptsSection.innerHTML = `
          <div class="text-center py-8">
            <i class="fas fa-inbox text-4xl text-gray-400"></i>
            <p class="mt-4 text-gray-600">プロンプトがありません</p>
          </div>
        `;
      } else {
        const outlinePrompt = prompts.find(p => p.type === 'outline');
        const articlePrompt = prompts.find(p => p.type === 'article_draft');
        
        promptsSection.innerHTML = `
          ${outlinePrompt ? `
            <div class="mb-6 p-4 border rounded-lg">
              <h3 class="font-bold text-gray-800 mb-2">
                <i class="fas fa-list-ul text-blue-600 mr-2"></i>
                アウトライン生成プロンプト
              </h3>
              <div class="mb-3">
                <label class="block text-gray-700 text-sm font-bold mb-2">プロンプト名</label>
                <input type="text" id="outline-prompt-name" value="${escapeHtml(outlinePrompt.name)}" 
                  class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
              </div>
              <div class="mb-3">
                <label class="block text-gray-700 text-sm font-bold mb-2">
                  プロンプト本文
                  <span class="text-xs text-gray-500 ml-2">変数: {{keyword}}, {{max_chars}}, {{tone}}</span>
                </label>
                <textarea id="outline-prompt-body" rows="8" 
                  class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">${escapeHtml(outlinePrompt.body)}</textarea>
              </div>
              <button onclick="savePrompt(${outlinePrompt.id}, 'outline')" 
                class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                <i class="fas fa-save mr-2"></i>保存
              </button>
              <div id="outline-prompt-status" class="mt-3"></div>
            </div>
          ` : ''}
          
          ${articlePrompt ? `
            <div class="mb-4 p-4 border rounded-lg">
              <h3 class="font-bold text-gray-800 mb-2">
                <i class="fas fa-file-alt text-green-600 mr-2"></i>
                記事執筆プロンプト
              </h3>
              <div class="mb-3">
                <label class="block text-gray-700 text-sm font-bold mb-2">プロンプト名</label>
                <input type="text" id="article-prompt-name" value="${escapeHtml(articlePrompt.name)}" 
                  class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
              </div>
              <div class="mb-3">
                <label class="block text-gray-700 text-sm font-bold mb-2">
                  プロンプト本文
                  <span class="text-xs text-gray-500 ml-2">変数: {{keyword}}, {{outline}}, {{max_chars}}, {{tone}}</span>
                </label>
                <textarea id="article-prompt-body" rows="8" 
                  class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">${escapeHtml(articlePrompt.body)}</textarea>
              </div>
              <button onclick="savePrompt(${articlePrompt.id}, 'article')" 
                class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
                <i class="fas fa-save mr-2"></i>保存
              </button>
              <div id="article-prompt-status" class="mt-3"></div>
            </div>
          ` : ''}
        `;
      }
    }
  } catch (error) {
    console.error('Load prompts error:', error);
  }
}

async function savePrompt(promptId, type) {
  const nameId = type === 'outline' ? 'outline-prompt-name' : 'article-prompt-name';
  const bodyId = type === 'outline' ? 'outline-prompt-body' : 'article-prompt-body';
  const statusId = type === 'outline' ? 'outline-prompt-status' : 'article-prompt-status';
  
  const name = document.getElementById(nameId).value.trim();
  const body = document.getElementById(bodyId).value.trim();
  const statusEl = document.getElementById(statusId);

  if (!name || !body) {
    statusEl.innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        <i class="fas fa-exclamation-circle mr-2"></i>
        プロンプト名と本文を入力してください
      </div>
    `;
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/prompts/${promptId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        body,
        params: '{}'
      })
    });

    const data = await response.json();
    
    if (data.success) {
      statusEl.innerHTML = `
        <div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          <i class="fas fa-check-circle mr-2"></i>
          プロンプトを保存しました
        </div>
      `;
    } else {
      statusEl.innerHTML = `
        <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          <i class="fas fa-exclamation-circle mr-2"></i>
          ${escapeHtml(data.error || 'プロンプトの保存に失敗しました')}
        </div>
      `;
    }
  } catch (error) {
    console.error('Save prompt error:', error);
    statusEl.innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        <i class="fas fa-exclamation-circle mr-2"></i>
        プロンプトの保存に失敗しました
      </div>
    `;
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
              value="${contentFlow.max_chars}" 
              min="500"
              max="10000"
              step="100"
              class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
          </div>
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2">トーン</label>
            <select id="tone" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
              <option value="professional" ${contentFlow.tone === 'professional' ? 'selected' : ''}>プロフェッショナル</option>
              <option value="casual" ${contentFlow.tone === 'casual' ? 'selected' : ''}>カジュアル</option>
              <option value="friendly" ${contentFlow.tone === 'friendly' ? 'selected' : ''}>フレンドリー</option>
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
          ステップ3: 記事編集 ${contentFlow.step === 'rewrite' ? '(リライト済み)' : ''}
        </h2>
        
        <!-- タブ切り替え -->
        <div class="flex border-b mb-6">
          <button onclick="switchTab('edit')" id="tab-edit" class="tab-button active px-6 py-3 font-semibold border-b-2 border-blue-600 text-blue-600">
            <i class="fas fa-edit mr-2"></i>編集
          </button>
          <button onclick="switchTab('preview')" id="tab-preview" class="tab-button px-6 py-3 font-semibold text-gray-600 hover:text-blue-600">
            <i class="fas fa-eye mr-2"></i>プレビュー
          </button>
          <button onclick="switchTab('seo')" id="tab-seo" class="tab-button px-6 py-3 font-semibold text-gray-600 hover:text-blue-600">
            <i class="fas fa-search mr-2"></i>SEO設定
          </button>
        </div>
        
        <!-- 編集タブ -->
        <div id="content-edit" class="tab-content">
          ${contentFlow.editingArticleId ? `
          <div class="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-4">
            <p class="text-amber-800">
              <i class="fas fa-pen mr-2"></i>
              <strong>編集モード:</strong> 既存の記事を編集しています（ID: ${contentFlow.editingArticleId}）
            </p>
          </div>
          ` : ''}
          
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p class="text-blue-800">
              <i class="fas fa-lightbulb mr-2"></i>
              <strong>キーワード:</strong> ${escapeHtml(contentFlow.keyword)}
            </p>
          </div>
          
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">タイトル <span class="text-red-500">*</span></label>
              <input 
                type="text" 
                id="article-title" 
                value="${escapeHtml(contentFlow.outline?.title || '')}"
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
          
          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-bold mb-2">記事本文 (Markdown) <span class="text-red-500">*</span></label>
            <textarea 
              id="article-edit" 
              rows="20"
              class="w-full px-4 py-3 border rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
              oninput="updateCharCount()"
            >${escapeHtml(contentFlow.article)}</textarea>
            <div class="flex justify-between items-center mt-2">
              <div class="flex items-center gap-4">
                <p class="text-sm text-gray-500">
                  <i class="fas fa-info-circle mr-1"></i>
                  文字数: <span id="char-count">${contentFlow.article.length}</span>文字
                </p>
                <button onclick="openImageLibraryForArticle()" class="text-green-600 hover:text-green-800 text-sm font-medium">
                  <i class="fas fa-image mr-1"></i>画像を挿入
                </button>
              </div>
              <button onclick="copyToClipboard()" class="text-blue-600 hover:underline text-sm">
                <i class="fas fa-copy mr-1"></i>クリップボードにコピー
              </button>
            </div>
          </div>
        </div>
        
        <!-- プレビュータブ -->
        <div id="content-preview" class="tab-content hidden">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p class="text-blue-800 text-sm">
              <i class="fas fa-edit mr-2"></i>
              <strong>編集モード:</strong> プレビュー画面のコンテンツを直接クリックして編集できます。編集後、他の場所をクリックすると自動的に「記事編集」タブに反映されます。
            </p>
          </div>
          <div class="prose max-w-none bg-gray-50 p-8 rounded-lg border">
            <h1 class="text-4xl font-bold mb-4">${escapeHtml(contentFlow.outline?.title || '')}</h1>
            <div class="text-sm text-gray-500 mb-6">
              <i class="fas fa-calendar mr-2"></i>${new Date().toLocaleDateString('ja-JP')}
              <span class="mx-2">|</span>
              <i class="fas fa-tag mr-2"></i>${escapeHtml(contentFlow.keyword)}
            </div>
            <div id="article-preview-content" class="article-content"></div>
          </div>
        </div>
        
        <!-- SEO設定タブ -->
        <div id="content-seo" class="tab-content hidden">
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p class="text-yellow-800">
              <i class="fas fa-magic mr-2"></i>
              <strong>AI自動生成:</strong> これらのSEO項目は記事生成時に自動で作成されています。必要に応じて編集してください。
            </p>
          </div>
          
          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-bold mb-2">
              SEOタイトル <span class="text-gray-500 text-xs">(検索結果に表示されるタイトル、60文字以内推奨)</span>
            </label>
            <input 
              type="text" 
              id="seo-title" 
              value="${escapeHtml(contentFlow.seo_title || contentFlow.outline?.title || '')}"
              maxlength="60"
              class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
            <p class="text-xs text-gray-500 mt-1">
              現在: <span id="seo-title-count">${(contentFlow.seo_title || contentFlow.outline?.title || '').length}</span>/60文字
            </p>
          </div>
          
          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-bold mb-2">
              メタディスクリプション <span class="text-gray-500 text-xs">(検索結果の説明文、120-160文字推奨)</span>
            </label>
            <textarea 
              id="meta-description" 
              rows="3"
              maxlength="160"
              class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
              oninput="updateMetaDescCount()"
            >${escapeHtml(contentFlow.meta_description || '')}</textarea>
            <p class="text-xs text-gray-500 mt-1">
              現在: <span id="meta-desc-count">${(contentFlow.meta_description || '').length}</span>/160文字
            </p>
          </div>
          
          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-bold mb-2">
              ターゲットキーワード <span class="text-gray-500 text-xs">(カンマ区切りで3-5個)</span>
            </label>
            <input 
              type="text" 
              id="target-keywords" 
              value="${escapeHtml(contentFlow.target_keywords || contentFlow.keyword)}"
              placeholder="例: AI, ブログ, 自動化, SEO"
              class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500">
            <p class="text-xs text-gray-500 mt-1">
              <i class="fas fa-info-circle mr-1"></i>
              これらのキーワードは記事のSEO最適化に使用されます
            </p>
          </div>
          
          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-bold mb-2">
              アイキャッチ画像 <span class="text-gray-500 text-xs">(タイトル直下に表示)</span>
            </label>
            <div class="flex items-center gap-4">
              <div id="og-image-preview" class="flex-shrink-0">
                ${contentFlow.og_image_url ? `
                  <img src="${contentFlow.og_image_url}" alt="アイキャッチ画像" 
                       class="w-32 h-32 object-cover rounded-lg border-2 border-gray-300">
                ` : `
                  <div class="w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <i class="fas fa-image text-gray-400 text-3xl"></i>
                  </div>
                `}
              </div>
              <div class="flex-1">
                <button onclick="openOgImageSelector()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mb-2">
                  <i class="fas fa-images mr-2"></i>画像を選択
                </button>
                ${contentFlow.og_image_url ? `
                  <button onclick="removeOgImage()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 ml-2 mb-2">
                    <i class="fas fa-times mr-2"></i>削除
                  </button>
                ` : ''}
                <p class="text-xs text-gray-500">
                  <i class="fas fa-info-circle mr-1"></i>
                  記事タイトル直下に表示されます。未設定の場合、最初のH2見出しの画像が自動的に使用されます
                </p>
              </div>
            </div>
          </div>
          
          <button onclick="regenerateSEO()" class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">
            <i class="fas fa-sync-alt mr-2"></i>SEO項目を再生成
          </button>
        </div>
        
        <!-- アクションボタン -->
        <div class="flex gap-4 mt-8 pt-6 border-t">
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
            ${contentFlow.editingArticleId ? '更新' : '保存'}
          </button>
        </div>
      </div>
    `;
    
    // SEO項目の文字数カウント更新
    const seoTitleInput = document.getElementById('seo-title');
    if (seoTitleInput) {
      seoTitleInput.addEventListener('input', () => {
        const count = document.getElementById('seo-title-count');
        if (count) count.textContent = seoTitleInput.value.length;
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
  contentFlow.max_chars = maxChars;
  contentFlow.tone = tone;
  
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
      const errorMsg = data.error || '構成生成に失敗しました';
      alert(`エラー: ${errorMsg}\n\n設定画面でAI APIキー（OpenAIまたはAnthropic）を確認してください。`);
      contentFlow.step = 'keyword';
      renderCurrentStep();
    }
  } catch (error) {
    console.error('Generate outline error:', error);
    alert(`ネットワークエラー: ${error.message}\n\n接続がタイムアウトしました。もう一度お試しください。`);
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
        outline: contentFlow.outline,
        params: {
          max_chars: contentFlow.max_chars,
          tone: contentFlow.tone
        }
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      contentFlow.article = data.data.content;
      
      // SEO項目も自動生成
      await generateSEOFields();
      
      contentFlow.step = 'article';
      renderCurrentStep();
    } else {
      const errorMsg = data.error || '記事生成に失敗しました';
      alert(`エラー: ${errorMsg}\n\n設定画面でAI APIキー（OpenAIまたはAnthropic）を確認してください。`);
      contentFlow.step = 'outline';
      renderCurrentStep();
    }
  } catch (error) {
    console.error('Generate article error:', error);
    alert(`ネットワークエラー: ${error.message}\n\n接続がタイムアウトしました。もう一度お試しください。`);
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
        original_content: currentArticle,
        params: {
          max_chars: contentFlow.max_chars,
          tone: contentFlow.tone
        }
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

// SEO項目を自動生成
async function generateSEOFields() {
  try {
    const response = await fetch(`${API_BASE}/generate/seo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        keyword: contentFlow.keyword,
        content: contentFlow.article
      })
    });
    
    const data = await response.json();
    if (data.success) {
      contentFlow.seo_title = data.data.seo_title;
      contentFlow.meta_description = data.data.meta_description;
      contentFlow.target_keywords = data.data.target_keywords;
    }
  } catch (error) {
    console.error('Generate SEO error:', error);
    // エラーが出てもデフォルト値を使用
    contentFlow.seo_title = contentFlow.outline?.title || contentFlow.keyword;
    contentFlow.meta_description = `${contentFlow.keyword}に関する詳しい情報をお届けします。`;
    contentFlow.target_keywords = contentFlow.keyword;
  }
}

async function saveArticle() {
  const title = document.getElementById('article-title').value;
  const content = document.getElementById('article-edit').value;
  const status = document.getElementById('article-status').value;
  const seoTitle = document.getElementById('seo-title').value;
  const metaDescription = document.getElementById('meta-description').value;
  const targetKeywords = document.getElementById('target-keywords').value;
  
  if (!title || !content) {
    alert('タイトルと本文を入力してください');
    return;
  }
  
  try {
    // 編集モードか新規作成モードかを判定
    const isEditMode = !!contentFlow.editingArticleId;
    const url = isEditMode 
      ? `${API_BASE}/articles/${contentFlow.editingArticleId}` 
      : `${API_BASE}/articles`;
    const method = isEditMode ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title,
        content,
        status,
        keyword: contentFlow.keyword,
        outline: contentFlow.outline,
        seo_title: seoTitle,
        meta_description: metaDescription,
        target_keywords: targetKeywords,
        og_image_url: contentFlow.og_image_url || null
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast(isEditMode ? '✅ 記事を更新しました' : '✅ 記事を保存しました', 'success');
      
      // フローをリセット
      contentFlow = {
        keyword: '',
        outline: null,
        article: '',
        seo_title: '',
        meta_description: '',
        target_keywords: '',
        og_image_url: '',
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

function copyToClipboard(text) {
  // テキストが渡された場合はそれをコピー、なければ記事編集エリアの内容をコピー
  const contentToCopy = text || document.getElementById('article-edit')?.value || '';
  
  navigator.clipboard.writeText(contentToCopy).then(() => {
    if (text) {
      showToast('📋 URLをコピーしました', 'success');
    } else {
      alert('クリップボードにコピーしました');
    }
  }).catch(() => {
    alert('コピーに失敗しました');
  });
}

// ===================================
// 記事一覧画面
// ===================================
async function showArticleList() {
  updateSidebarActive('articles');
  
  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = `
    <div class="max-w-6xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800">
          <i class="fas fa-file-alt mr-2"></i>記事一覧
        </h1>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <div id="articles-list">
          <div class="text-center py-8">
            <i class="fas fa-spinner fa-spin text-4xl text-blue-500"></i>
            <p class="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const response = await fetch(`${API_BASE}/articles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();
    
    if (data.success) {
      const articles = data.data;
      const listEl = document.getElementById('articles-list');
      
      if (articles.length === 0) {
        listEl.innerHTML = `
          <div class="text-center py-8">
            <i class="fas fa-inbox text-4xl text-gray-400"></i>
            <p class="mt-4 text-gray-600">まだ記事がありません</p>
          </div>
        `;
      } else {
        listEl.innerHTML = `
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead>
                <tr class="border-b">
                  <th class="text-left py-3 px-4">タイトル</th>
                  <th class="text-left py-3 px-4">ステータス</th>
                  <th class="text-left py-3 px-4">公開URL</th>
                  <th class="text-left py-3 px-4">作成日</th>
                  <th class="text-left py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                ${articles.map(article => {
                  const articleUrl = article.slug ? `/blog/${article.slug}` : `/blog/${article.id}`;
                  const fullUrl = window.location.origin + articleUrl;
                  return `
                  <tr class="border-b hover:bg-gray-50">
                    <td class="py-3 px-4">${escapeHtml(article.title)}</td>
                    <td class="py-3 px-4">
                      <span class="px-2 py-1 rounded text-xs ${article.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                        ${article.status}
                      </span>
                    </td>
                    <td class="py-3 px-4">
                      ${article.status === 'published' ? `
                        <div class="flex items-center gap-2">
                          <a href="${articleUrl}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm truncate max-w-xs" title="${fullUrl}">
                            ${articleUrl}
                          </a>
                          <button onclick="copyToClipboard('${fullUrl}')" class="text-gray-600 hover:text-gray-800" title="URLをコピー">
                            <i class="fas fa-copy"></i>
                          </button>
                        </div>
                      ` : '<span class="text-gray-400 text-sm">未公開</span>'}
                    </td>
                    <td class="py-3 px-4">${new Date(article.created_at).toLocaleDateString('ja-JP')}</td>
                    <td class="py-3 px-4 space-x-2">
                      <button onclick="editArticle(${article.id})" class="text-blue-600 hover:text-blue-800" title="編集">
                        <i class="fas fa-edit"></i>
                      </button>
                      ${article.status === 'published' ? `
                        <button onclick="viewArticle(${article.id})" class="text-green-600 hover:text-green-800" title="公開ページを見る">
                          <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="togglePublishStatus(${article.id}, 'draft')" class="text-orange-600 hover:text-orange-800" title="非公開にする">
                          <i class="fas fa-eye-slash"></i>
                        </button>
                      ` : `
                        <button onclick="togglePublishStatus(${article.id}, 'published')" class="text-green-600 hover:text-green-800" title="公開する">
                          <i class="fas fa-globe"></i>
                        </button>
                      `}
                      <button onclick="deleteArticle(${article.id})" class="text-red-600 hover:text-red-800" title="削除">
                        <i class="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                `}).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Load articles error:', error);
    document.getElementById('articles-list').innerHTML = `
      <div class="text-center py-8 text-red-600">
        <i class="fas fa-exclamation-circle text-4xl"></i>
        <p class="mt-4">記事の読み込みに失敗しました</p>
      </div>
    `;
  }
}

async function editArticle(articleId) {
  try {
    // 記事データを取得
    const response = await fetch(`${API_BASE}/articles/${articleId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();
    
    if (data.success) {
      const article = data.data;
      
      // outlineがJSON文字列の場合はパース
      let outline = article.outline || null;
      if (outline && typeof outline === 'string') {
        try {
          outline = JSON.parse(outline);
        } catch (e) {
          console.warn('Failed to parse outline JSON:', e);
        }
      }
      
      // contentFlowに記事データを読み込む
      contentFlow.keyword = article.keyword || '';
      contentFlow.outline = outline;
      contentFlow.article = article.content || '';
      contentFlow.seo_title = article.seo_title || '';
      contentFlow.meta_description = article.meta_description || '';
      contentFlow.target_keywords = article.target_keywords || '';
      contentFlow.og_image_url = article.og_image_url || '';
      contentFlow.step = 'article'; // 記事編集ステップに設定
      contentFlow.editingArticleId = articleId; // 編集中の記事IDを保存
      
      // コンテンツ作成画面を表示
      showContentCreation();
      
      // トースト通知
      showToast('📝 記事を読み込みました', 'success');
    } else {
      alert(data.error || '記事の読み込みに失敗しました');
    }
  } catch (error) {
    console.error('Edit article error:', error);
    alert('記事の読み込みに失敗しました');
  }
}

async function deleteArticle(articleId) {
  if (!confirm('この記事を削除してもよろしいですか?')) return;

  try {
    const response = await fetch(`${API_BASE}/articles/${articleId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();
    
    if (data.success) {
      alert('記事を削除しました');
      showArticleList(); // リロード
    } else {
      alert(data.error || '記事の削除に失敗しました');
    }
  } catch (error) {
    console.error('Delete article error:', error);
    alert('記事の削除に失敗しました');
  }
}

// 公開/非公開を切り替え
async function togglePublishStatus(articleId, newStatus) {
  const confirmMsg = newStatus === 'published' 
    ? 'この記事を公開しますか？' 
    : 'この記事を非公開にしますか？';
  
  if (!confirm(confirmMsg)) return;

  try {
    const response = await fetch(`${API_BASE}/articles/${articleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        status: newStatus
      })
    });

    const data = await response.json();
    
    if (data.success) {
      const msg = newStatus === 'published' ? '記事を公開しました' : '記事を非公開にしました';
      showToast(msg, 'success');
      showArticleList(); // リロード
    } else {
      alert(data.error || 'ステータスの変更に失敗しました');
    }
  } catch (error) {
    console.error('Toggle publish status error:', error);
    alert('ステータスの変更に失敗しました');
  }
}

// 公開記事を閲覧
function viewArticle(articleId) {
  // 新しいタブで公開ページを開く
  window.open(`/blog/${articleId}`, '_blank');
}

// ===================================
// ブログ画面（公開記事一覧）
// ===================================
async function showBlogList() {
  updateSidebarActive('blog');
  
  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = `
    <div class="max-w-6xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800">
          <i class="fas fa-globe mr-2"></i>公開ブログ
        </h1>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <div id="blog-list">
          <div class="text-center py-8">
            <i class="fas fa-spinner fa-spin text-4xl text-blue-500"></i>
            <p class="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const response = await fetch(`${API_BASE}/blog/articles`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();
    
    if (data.success) {
      const articles = data.data;
      const listEl = document.getElementById('blog-list');
      
      if (articles.length === 0) {
        listEl.innerHTML = `
          <div class="text-center py-8">
            <i class="fas fa-inbox text-4xl text-gray-400"></i>
            <p class="mt-4 text-gray-600">公開されている記事がありません</p>
          </div>
        `;
      } else {
        listEl.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${articles.map(article => `
              <div class="border rounded-lg overflow-hidden hover:shadow-lg transition">
                <div class="p-4">
                  <h3 class="font-bold text-lg mb-2 text-gray-800">${escapeHtml(article.title)}</h3>
                  <p class="text-sm text-gray-600 mb-4 line-clamp-3">
                    ${escapeHtml(article.meta_description || article.content?.substring(0, 100) || '')}...
                  </p>
                  <div class="flex justify-between items-center text-xs text-gray-500 mb-3">
                    <span><i class="far fa-calendar mr-1"></i>${new Date(article.published_at || article.created_at).toLocaleDateString('ja-JP')}</span>
                    ${article.target_keywords ? `<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded">${escapeHtml(article.target_keywords.split(',')[0])}</span>` : ''}
                  </div>
                  <a href="/blog/${article.id}" target="_blank" class="block w-full text-center bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition">
                    <i class="fas fa-external-link-alt mr-2"></i>記事を見る
                  </a>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Load blog articles error:', error);
    document.getElementById('blog-list').innerHTML = `
      <div class="text-center py-8 text-red-600">
        <i class="fas fa-exclamation-circle text-4xl"></i>
        <p class="mt-4">記事の読み込みに失敗しました</p>
      </div>
    `;
  }
}

// ===================================
// 内部リンク管理画面
// ===================================
// 注意: showInternalLinks関数は削除しました
// 内部リンク管理は別ファイル (internal-links.js) で実装されています

// ===================================
// 設定画面
// ===================================
async function showSettings() {
  updateSidebarActive('settings');
  
  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = `
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">
        <i class="fas fa-cog mr-2"></i>設定
      </h1>
      
      <!-- タブナビゲーション -->
      <div class="bg-white rounded-t-lg shadow mb-0">
        <div class="flex border-b">
          <button onclick="switchSettingsTab('api-keys')" id="settings-tab-api-keys" class="settings-tab-button px-6 py-3 font-semibold text-blue-600 border-b-2 border-blue-600">
            <i class="fas fa-key mr-2"></i>API Keys
          </button>
          <button onclick="switchSettingsTab('prompts')" id="settings-tab-prompts" class="settings-tab-button px-6 py-3 font-semibold text-gray-600 hover:text-blue-600">
            <i class="fas fa-file-alt mr-2"></i>プロンプト
          </button>
          <button onclick="switchSettingsTab('models')" id="settings-tab-models" class="settings-tab-button px-6 py-3 font-semibold text-gray-600 hover:text-blue-600">
            <i class="fas fa-brain mr-2"></i>AIモデル
          </button>
          <button onclick="switchSettingsTab('decoration')" id="settings-tab-decoration" class="settings-tab-button px-6 py-3 font-semibold text-gray-600 hover:text-blue-600">
            <i class="fas fa-paint-brush mr-2"></i>装飾
          </button>
          <button onclick="switchSettingsTab('user-info')" id="settings-tab-user-info" class="settings-tab-button px-6 py-3 font-semibold text-gray-600 hover:text-blue-600">
            <i class="fas fa-user mr-2"></i>ユーザー情報
          </button>
        </div>
      </div>

      <!-- タブコンテンツ -->
      <div class="bg-white rounded-b-lg shadow p-6">
        
        <!-- API Keys タブ -->
        <div id="settings-content-api-keys" class="settings-tab-content">
          <h2 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-robot mr-2"></i>AI API設定
          </h2>
          <p class="text-sm text-gray-600 mb-4">
            記事生成にはOpenAIまたはAnthropic (Claude) のAPIキーが必要です。どちらか一方、または両方を設定できます。
          </p>
          
          <!-- OpenAI -->
          <div class="mb-6 p-4 border rounded-lg">
            <h3 class="font-bold text-gray-800 mb-2 flex items-center">
              <i class="fas fa-brain text-green-600 mr-2"></i>
              OpenAI (GPT-4o-mini)
            </h3>
            <div class="mb-3">
              <label class="block text-gray-700 text-sm font-bold mb-2">
                OpenAI APIキー
              </label>
              <input type="password" id="openai-api-key" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="sk-...">
              <p class="text-sm text-gray-600 mt-2">
                <i class="fas fa-info-circle"></i>
                <a href="https://platform.openai.com/api-keys" target="_blank" class="text-blue-600 hover:underline">こちら</a>から取得できます。
              </p>
            </div>
            <button onclick="saveApiKey('openai')" class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700">
              <i class="fas fa-save mr-2"></i>OpenAI APIキーを保存
            </button>
            <div id="openai-status" class="mt-3"></div>
          </div>

          <!-- Anthropic -->
          <div class="mb-4 p-4 border rounded-lg">
            <h3 class="font-bold text-gray-800 mb-2 flex items-center">
              <i class="fas fa-robot text-purple-600 mr-2"></i>
              Anthropic (Claude 3.5 Sonnet)
            </h3>
            <div class="mb-3">
              <label class="block text-gray-700 text-sm font-bold mb-2">
                Anthropic APIキー
              </label>
              <input type="password" id="anthropic-api-key" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="sk-ant-...">
              <p class="text-sm text-gray-600 mt-2">
                <i class="fas fa-info-circle"></i>
                <a href="https://console.anthropic.com/settings/keys" target="_blank" class="text-blue-600 hover:underline">こチら</a>から取得できます。
              </p>
            </div>
            <button onclick="saveApiKey('anthropic')" class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">
              <i class="fas fa-save mr-2"></i>Anthropic APIキーを保存
            </button>
            <div id="anthropic-status" class="mt-3"></div>
          </div>
        </div>

        <!-- プロンプトタブ -->
        <div id="settings-content-prompts" class="settings-tab-content hidden">
          <h2 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-file-alt mr-2"></i>プロンプト管理
          </h2>
          <p class="text-sm text-gray-600 mb-4">
            AI生成に使用するプロンプトをカスタマイズできます。
          </p>
          
          <div id="prompts-section">
            <div class="text-center py-8">
              <i class="fas fa-spinner fa-spin text-4xl text-blue-500"></i>
              <p class="mt-4 text-gray-600">読み込み中...</p>
            </div>
          </div>
        </div>

        <!-- AIモデルタブ -->
        <div id="settings-content-models" class="settings-tab-content hidden">
          <h2 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-brain mr-2"></i>AIモデル設定
          </h2>
          <p class="text-sm text-gray-600 mb-4">
            各機能で使用するAIモデルを選択できます。高品質なモデルほど精度が高くなりますが、コストも高くなります。
          </p>
          
          <div id="models-section">
            <div class="text-center py-8">
              <i class="fas fa-spinner fa-spin text-4xl text-blue-500"></i>
              <p class="mt-4 text-gray-600">読み込み中...</p>
            </div>
          </div>
        </div>

        <!-- 装飾テンプレートタブ -->
        <div id="settings-content-decoration" class="settings-tab-content hidden">
          <h2 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-paint-brush mr-2"></i>装飾スタイル設定
          </h2>
          <p class="text-sm text-gray-600 mb-4">
            記事の装飾スタイルをカラーピッカーとスタイル選択で簡単にカスタマイズできます。
          </p>
          
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p class="text-blue-800 text-sm">
              <i class="fas fa-info-circle mr-2"></i>
              <strong>装飾スタイル設定について</strong><br>
              各要素の色やスタイルを選択するだけで、記事の見た目を統一的にカスタマイズできます。変更はリアルタイムでプレビューに反映されます。
            </p>
          </div>

          <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <!-- 設定パネル -->
            <div class="xl:col-span-2 space-y-6">
              
              <!-- 見出しスタイル -->
              <div class="bg-white rounded-lg border p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <i class="fas fa-heading text-blue-600 mr-2"></i>見出しスタイル
                </h3>
                
                <div class="space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">H2見出し色</label>
                      <input type="color" id="heading-h2-color" value="#111827" class="w-full h-10 rounded cursor-pointer">
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">H2下線色</label>
                      <input type="color" id="heading-h2-border" value="#e5e7eb" class="w-full h-10 rounded cursor-pointer">
                    </div>
                  </div>
                  
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">H3見出し色</label>
                      <input type="color" id="heading-h3-color" value="#1f2937" class="w-full h-10 rounded cursor-pointer">
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">H3背景スタイル</label>
                      <select id="heading-h3-style" class="w-full px-3 py-2 border rounded-lg">
                        <option value="none">なし</option>
                        <option value="left-border">左ボーダー</option>
                        <option value="background">背景色</option>
                        <option value="underline">下線</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ボックススタイル -->
              <div class="bg-white rounded-lg border p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <i class="fas fa-box text-green-600 mr-2"></i>ボックススタイル
                </h3>
                
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">💡 ポイントボックス</label>
                    <div class="grid grid-cols-3 gap-3">
                      <div>
                        <label class="text-xs text-gray-600">背景色</label>
                        <input type="color" id="box-point-bg" value="#eff6ff" class="w-full h-10 rounded cursor-pointer">
                      </div>
                      <div>
                        <label class="text-xs text-gray-600">ボーダー色</label>
                        <input type="color" id="box-point-border" value="#3b82f6" class="w-full h-10 rounded cursor-pointer">
                      </div>
                      <div>
                        <label class="text-xs text-gray-600">テキスト色</label>
                        <input type="color" id="box-point-text" value="#1e40af" class="w-full h-10 rounded cursor-pointer">
                      </div>
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">⚠️ 注意ボックス</label>
                    <div class="grid grid-cols-3 gap-3">
                      <div>
                        <label class="text-xs text-gray-600">背景色</label>
                        <input type="color" id="box-warning-bg" value="#fffbeb" class="w-full h-10 rounded cursor-pointer">
                      </div>
                      <div>
                        <label class="text-xs text-gray-600">ボーダー色</label>
                        <input type="color" id="box-warning-border" value="#f59e0b" class="w-full h-10 rounded cursor-pointer">
                      </div>
                      <div>
                        <label class="text-xs text-gray-600">テキスト色</label>
                        <input type="color" id="box-warning-text" value="#92400e" class="w-full h-10 rounded cursor-pointer">
                      </div>
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">✅ メリットボックス</label>
                    <div class="grid grid-cols-3 gap-3">
                      <div>
                        <label class="text-xs text-gray-600">背景色</label>
                        <input type="color" id="box-success-bg" value="#f0fdf4" class="w-full h-10 rounded cursor-pointer">
                      </div>
                      <div>
                        <label class="text-xs text-gray-600">ボーダー色</label>
                        <input type="color" id="box-success-border" value="#10b981" class="w-full h-10 rounded cursor-pointer">
                      </div>
                      <div>
                        <label class="text-xs text-gray-600">テキスト色</label>
                        <input type="color" id="box-success-text" value="#065f46" class="w-full h-10 rounded cursor-pointer">
                      </div>
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">ボックススタイル</label>
                    <select id="box-style" class="w-full px-3 py-2 border rounded-lg">
                      <option value="border">ボーダーのみ</option>
                      <option value="background">背景色 + ボーダー</option>
                      <option value="shadow">背景色 + シャドウ</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- ボタンスタイル -->
              <div class="bg-white rounded-lg border p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <i class="fas fa-hand-pointer text-purple-600 mr-2"></i>ボタンスタイル
                </h3>
                
                <div class="space-y-4">
                  <div class="grid grid-cols-3 gap-3">
                    <div>
                      <label class="text-sm font-medium text-gray-700 mb-2">背景色</label>
                      <input type="color" id="button-bg" value="#3b82f6" class="w-full h-10 rounded cursor-pointer">
                    </div>
                    <div>
                      <label class="text-sm font-medium text-gray-700 mb-2">テキスト色</label>
                      <input type="color" id="button-text" value="#ffffff" class="w-full h-10 rounded cursor-pointer">
                    </div>
                    <div>
                      <label class="text-sm font-medium text-gray-700 mb-2">ホバー色</label>
                      <input type="color" id="button-hover" value="#2563eb" class="w-full h-10 rounded cursor-pointer">
                    </div>
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">ボタンスタイル</label>
                    <select id="button-style" class="w-full px-3 py-2 border rounded-lg">
                      <option value="solid">ソリッド</option>
                      <option value="outline">アウトライン</option>
                      <option value="gradient">グラデーション</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- テーブルスタイル -->
              <div class="bg-white rounded-lg border p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <i class="fas fa-table text-orange-600 mr-2"></i>テーブルスタイル
                </h3>
                
                <div class="space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">ヘッダー背景色</label>
                      <input type="color" id="table-header-bg" value="#f9fafb" class="w-full h-10 rounded cursor-pointer">
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">ヘッダーテキスト色</label>
                      <input type="color" id="table-header-text" value="#374151" class="w-full h-10 rounded cursor-pointer">
                    </div>
                  </div>
                  
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">ボーダー色</label>
                      <input type="color" id="table-border" value="#e5e7eb" class="w-full h-10 rounded cursor-pointer">
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-2">ストライプ背景色</label>
                      <input type="color" id="table-stripe-bg" value="#f9fafb" class="w-full h-10 rounded cursor-pointer">
                    </div>
                  </div>

                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">テーブルスタイル</label>
                    <select id="table-style" class="w-full px-3 py-2 border rounded-lg">
                      <option value="default">デフォルト</option>
                      <option value="striped">ストライプ</option>
                      <option value="bordered">ボーダー強調</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- 強調スタイル -->
              <div class="bg-white rounded-lg border p-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <i class="fas fa-highlighter text-yellow-600 mr-2"></i>強調スタイル
                </h3>
                
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">マーカー色</label>
                    <input type="color" id="marker-color" value="#fde047" class="w-full h-10 rounded cursor-pointer">
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">マーカースタイル</label>
                    <select id="marker-style" class="w-full px-3 py-2 border rounded-lg">
                      <option value="underline">下線マーカー</option>
                      <option value="background">背景マーカー</option>
                      <option value="bold">太字のみ</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>

            <!-- プレビューパネル -->
            <div class="xl:col-span-1">
              <div class="sticky top-4">
                <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center">
                  <i class="fas fa-eye text-gray-600 mr-2"></i>プレビュー
                </h3>
                <div id="decoration-style-preview" class="bg-white border rounded-lg p-6 max-h-[800px] overflow-y-auto article-content">
                  <!-- プレビュー内容はJavaScriptで動的に生成 -->
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button onclick="loadDecorationStyles()" class="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700">
              <i class="fas fa-sync-alt mr-2"></i>再読み込み
            </button>
            <button onclick="saveDecorationStyles()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              <i class="fas fa-save mr-2"></i>保存
            </button>
            <button onclick="resetDecorationStyles()" class="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700">
              <i class="fas fa-undo mr-2"></i>デフォルトに戻す
            </button>
          </div>
          
          <div id="decoration-status" class="mt-4"></div>
        </div>

        <!-- ユーザー情報タブ -->
        <div id="settings-content-user-info" class="settings-tab-content hidden">
          <h2 class="text-xl font-bold text-gray-800 mb-4">
            <i class="fas fa-user mr-2"></i>ユーザー情報
          </h2>
          <div class="space-y-2">
            <p><strong>メールアドレス:</strong> ${escapeHtml(currentUser?.email || '')}</p>
            <p><strong>名前:</strong> ${escapeHtml(currentUser?.name || '')}</p>
            <p><strong>役割:</strong> ${escapeHtml(currentUser?.role || '')}</p>
          </div>
        </div>

      </div>
    </div>
  `;

  // 既存のAPIキーを読み込む
  loadCurrentApiKey();
  // プロンプトを読み込む（遅延ロード）
  // loadUserPrompts();
  // AIモデル設定を読み込む（遅延ロード）
  // loadModelSettings();
}

// 設定画面のタブ切り替え
function switchSettingsTab(tab) {
  // タブボタンのアクティブ状態を更新
  const buttons = document.querySelectorAll('.settings-tab-button');
  buttons.forEach(btn => {
    btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
    btn.classList.add('text-gray-600', 'hover:text-blue-600');
  });
  
  const activeButton = document.getElementById(`settings-tab-${tab}`);
  if (activeButton) {
    activeButton.classList.remove('text-gray-600', 'hover:text-blue-600');
    activeButton.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
  }
  
  // タブコンテンツの表示切り替え
  const contents = document.querySelectorAll('.settings-tab-content');
  contents.forEach(content => content.classList.add('hidden'));
  
  const activeContent = document.getElementById(`settings-content-${tab}`);
  if (activeContent) {
    activeContent.classList.remove('hidden');
  }
  
  // タブごとの初期化処理
  if (tab === 'prompts') {
    loadUserPrompts();
  } else if (tab === 'models') {
    // AIモデル設定を読み込んでHTMLを挿入
    loadModelSettings().then(html => {
      const modelsSection = document.getElementById('models-section');
      if (modelsSection) {
        modelsSection.innerHTML = html;
      }
    });
  } else if (tab === 'decoration') {
    loadDecorationStyles();
    setupDecorationInputListeners();
  }
}

async function loadCurrentApiKey() {
  try {
    const response = await fetch(`${API_BASE}/settings/api-keys`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();
    
    if (data.success && data.data.length > 0) {
      const openaiKey = data.data.find(k => k.provider === 'openai');
      const anthropicKey = data.data.find(k => k.provider === 'anthropic');
      
      if (openaiKey) {
        document.getElementById('openai-status').innerHTML = `
          <div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
            <i class="fas fa-check-circle mr-2"></i>
            OpenAI APIキーが設定されています
          </div>
        `;
      }
      
      if (anthropicKey) {
        document.getElementById('anthropic-status').innerHTML = `
          <div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
            <i class="fas fa-check-circle mr-2"></i>
            Anthropic APIキーが設定されています
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Load API key error:', error);
  }
}

async function saveApiKey(provider) {
  const inputId = provider === 'openai' ? 'openai-api-key' : 'anthropic-api-key';
  const statusId = provider === 'openai' ? 'openai-status' : 'anthropic-status';
  const apiKey = document.getElementById(inputId).value.trim();
  const statusEl = document.getElementById(statusId);

  if (!apiKey) {
    statusEl.innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        <i class="fas fa-exclamation-circle mr-2"></i>
        APIキーを入力してください
      </div>
    `;
    return;
  }

  // バリデーション
  if (provider === 'openai' && !apiKey.startsWith('sk-')) {
    statusEl.innerHTML = `
      <div class="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
        <i class="fas fa-exclamation-triangle mr-2"></i>
        OpenAI APIキーは 'sk-' で始まる必要があります
      </div>
    `;
    return;
  }

  if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
    statusEl.innerHTML = `
      <div class="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
        <i class="fas fa-exclamation-triangle mr-2"></i>
        Anthropic APIキーは 'sk-ant-' で始まる必要があります
      </div>
    `;
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/settings/api-keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: provider,
        api_key: apiKey
      })
    });

    const data = await response.json();
    
    if (data.success) {
      const providerName = provider === 'openai' ? 'OpenAI' : 'Anthropic';
      statusEl.innerHTML = `
        <div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          <i class="fas fa-check-circle mr-2"></i>
          ${providerName} APIキーを保存しました
        </div>
      `;
      // 入力欄をクリア
      document.getElementById(inputId).value = '';
    } else {
      statusEl.innerHTML = `
        <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          <i class="fas fa-exclamation-circle mr-2"></i>
          ${escapeHtml(data.error || 'APIキーの保存に失敗しました')}
        </div>
      `;
    }
  } catch (error) {
    console.error('Save API key error:', error);
    statusEl.innerHTML = `
      <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        <i class="fas fa-exclamation-circle mr-2"></i>
        APIキーの保存に失敗しました
      </div>
    `;
  }
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

// タブ切り替え
function switchTab(tab) {
  // タブボタンのスタイル更新
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active', 'border-b-2', 'border-blue-600', 'text-blue-600');
    btn.classList.add('text-gray-600');
  });
  
  const activeBtn = document.getElementById(`tab-${tab}`);
  if (activeBtn) {
    activeBtn.classList.add('active', 'border-b-2', 'border-blue-600', 'text-blue-600');
    activeBtn.classList.remove('text-gray-600');
  }
  
  // コンテンツの表示切り替え
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  
  const activeContent = document.getElementById(`content-${tab}`);
  if (activeContent) {
    activeContent.classList.remove('hidden');
  }
  
  // プレビュータブの場合、Markdownをレンダリング
  if (tab === 'preview') {
    renderPreview();
  }
}

// Markdownプレビューのレンダリング
function renderPreview() {
  const content = document.getElementById('article-edit').value;
  const previewEl = document.getElementById('article-preview-content');
  
  if (previewEl) {
    // 簡易Markdownレンダリング (marked.jsなしで基本的な変換)
    let html = content
      // 見出し
      .replace(/^### (.*$)/gim, '<h3 class="text-2xl font-bold mt-6 mb-4">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-3xl font-bold mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-4xl font-bold mt-8 mb-4">$1</h1>')
      // 太字
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold">$1</strong>')
      // イタリック
      .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>')
      // リンク
      .replace(/\[([^\]]+)\]\(([^\)]+)\)/gim, '<a href="$2" class="text-blue-600 hover:underline">$1</a>')
      // リスト
      .replace(/^\* (.*$)/gim, '<li class="ml-6 list-disc">$1</li>')
      .replace(/^- (.*$)/gim, '<li class="ml-6 list-disc">$1</li>')
      // 段落
      .split('\n\n')
      .map(p => p.trim() ? `<p class="mb-4 leading-relaxed">${p}</p>` : '')
      .join('\n');
    
    previewEl.innerHTML = html;
    
    // プレビュー編集機能を有効化
    enablePreviewEditing();
  }
}

// 文字数カウント更新
function updateCharCount() {
  const textarea = document.getElementById('article-edit');
  const countEl = document.getElementById('char-count');
  if (textarea && countEl) {
    countEl.textContent = textarea.value.length;
  }
}

// メタディスクリプションの文字数カウント
function updateMetaDescCount() {
  const textarea = document.getElementById('meta-description');
  const countEl = document.getElementById('meta-desc-count');
  if (textarea && countEl) {
    countEl.textContent = textarea.value.length;
  }
}

// SEO項目の再生成
async function regenerateSEO() {
  if (!confirm('SEO項目を再生成しますか？現在の内容は上書きされます。')) {
    return;
  }
  
  const content = document.getElementById('article-edit').value;
  if (!content) {
    alert('記事本文を入力してください');
    return;
  }
  
  // ローディング表示
  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>生成中...';
  btn.disabled = true;
  
  try {
    await generateSEOFields();
    
    // フィールドを更新
    document.getElementById('seo-title').value = contentFlow.seo_title;
    document.getElementById('meta-description').value = contentFlow.meta_description;
    document.getElementById('target-keywords').value = contentFlow.target_keywords;
    
    // カウント更新
    document.getElementById('seo-title-count').textContent = contentFlow.seo_title.length;
    document.getElementById('meta-desc-count').textContent = contentFlow.meta_description.length;
    
    alert('SEO項目を再生成しました');
  } catch (error) {
    alert('SEO項目の再生成に失敗しました');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// ===================================
// 参照データ管理画面
// ===================================
async function showReferenceData() {
  updateSidebarActive('reference');
  
  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = `
    <div class="max-w-6xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800">
          <i class="fas fa-database text-purple-600 mr-2"></i>
          参照データ管理
        </h1>
        <button onclick="showAddReferenceData()" class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-bold">
          <i class="fas fa-plus mr-2"></i>新規追加
        </button>
      </div>
      
      <!-- カテゴリーフィルター -->
      <div class="bg-white rounded-lg shadow p-4 mb-6">
        <div class="flex gap-2">
          <button onclick="filterReferenceData('all')" class="filter-btn active px-4 py-2 rounded-lg bg-purple-100 text-purple-800 font-semibold">
            すべて
          </button>
          <button onclick="filterReferenceData('article')" class="filter-btn px-4 py-2 rounded-lg hover:bg-gray-100">
            過去記事
          </button>
          <button onclick="filterReferenceData('snippet')" class="filter-btn px-4 py-2 rounded-lg hover:bg-gray-100">
            スニペット
          </button>
          <button onclick="filterReferenceData('template')" class="filter-btn px-4 py-2 rounded-lg hover:bg-gray-100">
            テンプレート
          </button>
          <button onclick="filterReferenceData('other')" class="filter-btn px-4 py-2 rounded-lg hover:bg-gray-100">
            その他
          </button>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow p-6">
        <div id="reference-list">
          <div class="text-center py-8">
            <i class="fas fa-spinner fa-spin text-4xl text-purple-500"></i>
            <p class="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>
    </div>
  `;

  loadReferenceData();
}

let currentReferenceFilter = 'all';

async function filterReferenceData(category) {
  currentReferenceFilter = category;
  
  // フィルターボタンのスタイル更新
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active', 'bg-purple-100', 'text-purple-800', 'font-semibold');
    btn.classList.add('hover:bg-gray-100');
  });
  event.target.classList.add('active', 'bg-purple-100', 'text-purple-800', 'font-semibold');
  event.target.classList.remove('hover:bg-gray-100');
  
  await loadReferenceData(category === 'all' ? null : category);
}

async function loadReferenceData(category = null) {
  try {
    const url = category 
      ? `${API_BASE}/reference?category=${category}`
      : `${API_BASE}/reference`;
      
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();
    
    if (data.success) {
      const referenceList = data.data;
      const listEl = document.getElementById('reference-list');
      
      if (referenceList.length === 0) {
        listEl.innerHTML = `
          <div class="text-center py-12">
            <i class="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
            <p class="text-gray-600 text-lg">参照データがまだありません</p>
            <button onclick="showAddReferenceData()" class="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">
              <i class="fas fa-plus mr-2"></i>最初のデータを追加
            </button>
          </div>
        `;
      } else {
        listEl.innerHTML = `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${referenceList.map(ref => `
              <div class="border rounded-lg p-4 hover:shadow-lg transition">
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-bold text-lg text-gray-800">${escapeHtml(ref.title)}</h3>
                  <span class="text-xs px-2 py-1 rounded ${getCategoryColor(ref.category)}">
                    ${getCategoryLabel(ref.category)}
                  </span>
                </div>
                ${ref.description ? `
                  <p class="text-sm text-gray-600 mb-3">${escapeHtml(ref.description)}</p>
                ` : ''}
                <div class="text-xs text-gray-500 mb-3">
                  ${new Date(ref.created_at).toLocaleDateString('ja-JP')}
                </div>
                ${ref.tags ? `
                  <div class="flex flex-wrap gap-1 mb-3">
                    ${ref.tags.split(',').map(tag => `
                      <span class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">${escapeHtml(tag.trim())}</span>
                    `).join('')}
                  </div>
                ` : ''}
                <div class="flex gap-2">
                  <button onclick="viewReferenceData(${ref.id})" class="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600">
                    <i class="fas fa-eye mr-1"></i>表示
                  </button>
                  <button onclick="editReferenceData(${ref.id})" class="flex-1 bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600">
                    <i class="fas fa-edit mr-1"></i>編集
                  </button>
                  <button onclick="deleteReferenceData(${ref.id})" class="bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Load reference data error:', error);
    alert('参照データの読み込みに失敗しました');
  }
}

function getCategoryColor(category) {
  const colors = {
    'article': 'bg-blue-100 text-blue-800',
    'snippet': 'bg-green-100 text-green-800',
    'template': 'bg-yellow-100 text-yellow-800',
    'other': 'bg-gray-100 text-gray-800'
  };
  return colors[category] || colors['other'];
}

function getCategoryLabel(category) {
  const labels = {
    'article': '過去記事',
    'snippet': 'スニペット',
    'template': 'テンプレート',
    'other': 'その他'
  };
  return labels[category] || 'その他';
}

function showAddReferenceData() {
  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = `
    <div class="max-w-4xl mx-auto">
      <div class="mb-6">
        <button onclick="showReferenceData()" class="text-purple-600 hover:underline">
          <i class="fas fa-arrow-left mr-2"></i>戻る
        </button>
      </div>
      
      <div class="bg-white rounded-lg shadow-lg p-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">
          <i class="fas fa-plus-circle text-purple-600 mr-2"></i>
          新しい参照データを追加
        </h2>
        
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-bold mb-2">タイトル <span class="text-red-500">*</span></label>
          <input type="text" id="ref-title" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500" placeholder="データのタイトル">
        </div>
        
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-bold mb-2">カテゴリー</label>
          <select id="ref-category" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500">
            <option value="article">過去記事</option>
            <option value="snippet">スニペット</option>
            <option value="template">テンプレート</option>
            <option value="other">その他</option>
          </select>
        </div>
        
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-bold mb-2">説明</label>
          <textarea id="ref-description" rows="2" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500" placeholder="このデータの簡単な説明"></textarea>
        </div>
        
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-bold mb-2">タグ <span class="text-xs text-gray-500">(カンマ区切り)</span></label>
          <input type="text" id="ref-tags" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500" placeholder="例: SEO, マーケティング, 事例">
        </div>
        
        <div class="mb-4">
          <label class="block text-gray-700 text-sm font-bold mb-2">参照元URL</label>
          <input type="url" id="ref-source-url" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500" placeholder="https://...">
        </div>
        
        <div class="mb-6">
          <label class="block text-gray-700 text-sm font-bold mb-2">コンテンツ <span class="text-red-500">*</span></label>
          <textarea id="ref-content" rows="15" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm" placeholder="過去の記事やテキストデータをここに保存"></textarea>
        </div>
        
        <div class="flex gap-4">
          <button onclick="showReferenceData()" class="flex-1 bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400">
            <i class="fas fa-times mr-2"></i>キャンセル
          </button>
          <button onclick="saveReferenceData()" class="flex-1 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700">
            <i class="fas fa-save mr-2"></i>保存
          </button>
        </div>
      </div>
    </div>
  `;
}

async function saveReferenceData(id = null) {
  const title = document.getElementById('ref-title').value.trim();
  const content = document.getElementById('ref-content').value.trim();
  const category = document.getElementById('ref-category').value;
  const description = document.getElementById('ref-description').value.trim();
  const tags = document.getElementById('ref-tags').value.trim();
  const sourceUrl = document.getElementById('ref-source-url').value.trim();
  
  if (!title || !content) {
    alert('タイトルとコンテンツを入力してください');
    return;
  }
  
  try {
    const url = id ? `${API_BASE}/reference/${id}` : `${API_BASE}/reference`;
    const method = id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title,
        content,
        category,
        description: description || null,
        tags: tags || null,
        source_url: sourceUrl || null
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(id ? '参照データを更新しました' : '参照データを保存しました');
      showReferenceData();
    } else {
      alert(data.error || '保存に失敗しました');
    }
  } catch (error) {
    console.error('Save reference data error:', error);
    alert('保存に失敗しました');
  }
}

async function viewReferenceData(id) {
  try {
    const response = await fetch(`${API_BASE}/reference/${id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const ref = data.data;
      const contentArea = document.getElementById('content-area');
      contentArea.innerHTML = `
        <div class="max-w-4xl mx-auto">
          <div class="mb-6">
            <button onclick="showReferenceData()" class="text-purple-600 hover:underline">
              <i class="fas fa-arrow-left mr-2"></i>戻る
            </button>
          </div>
          
          <div class="bg-white rounded-lg shadow-lg p-8">
            <div class="flex justify-between items-start mb-6">
              <h2 class="text-3xl font-bold text-gray-800">${escapeHtml(ref.title)}</h2>
              <span class="text-sm px-3 py-1 rounded ${getCategoryColor(ref.category)}">
                ${getCategoryLabel(ref.category)}
              </span>
            </div>
            
            ${ref.description ? `
              <p class="text-gray-600 mb-4">${escapeHtml(ref.description)}</p>
            ` : ''}
            
            ${ref.tags ? `
              <div class="flex flex-wrap gap-2 mb-4">
                ${ref.tags.split(',').map(tag => `
                  <span class="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded">${escapeHtml(tag.trim())}</span>
                `).join('')}
              </div>
            ` : ''}
            
            ${ref.source_url ? `
              <div class="mb-4">
                <a href="${escapeHtml(ref.source_url)}" target="_blank" class="text-blue-600 hover:underline text-sm">
                  <i class="fas fa-external-link-alt mr-1"></i>${escapeHtml(ref.source_url)}
                </a>
              </div>
            ` : ''}
            
            <div class="border-t pt-6 mb-6">
              <div class="bg-gray-50 p-6 rounded-lg">
                <pre class="whitespace-pre-wrap font-sans">${escapeHtml(ref.content)}</pre>
              </div>
            </div>
            
            <div class="text-sm text-gray-500 mb-6">
              作成日: ${new Date(ref.created_at).toLocaleString('ja-JP')}
              ${ref.updated_at !== ref.created_at ? `<br>更新日: ${new Date(ref.updated_at).toLocaleString('ja-JP')}` : ''}
            </div>
            
            <div class="flex gap-4">
              <button onclick="editReferenceData(${ref.id})" class="flex-1 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700">
                <i class="fas fa-edit mr-2"></i>編集
              </button>
              <button onclick="copyReferenceContent(${ref.id})" class="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700">
                <i class="fas fa-copy mr-2"></i>コピー
              </button>
              <button onclick="deleteReferenceData(${ref.id})" class="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700">
                <i class="fas fa-trash mr-2"></i>削除
              </button>
            </div>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('View reference data error:', error);
    alert('データの読み込みに失敗しました');
  }
}

async function editReferenceData(id) {
  try {
    const response = await fetch(`${API_BASE}/reference/${id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const ref = data.data;
      const contentArea = document.getElementById('content-area');
      contentArea.innerHTML = `
        <div class="max-w-4xl mx-auto">
          <div class="mb-6">
            <button onclick="viewReferenceData(${id})" class="text-purple-600 hover:underline">
              <i class="fas fa-arrow-left mr-2"></i>戻る
            </button>
          </div>
          
          <div class="bg-white rounded-lg shadow-lg p-8">
            <h2 class="text-2xl font-bold text-gray-800 mb-6">
              <i class="fas fa-edit text-purple-600 mr-2"></i>
              参照データを編集
            </h2>
            
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">タイトル <span class="text-red-500">*</span></label>
              <input type="text" id="ref-title" value="${escapeHtml(ref.title)}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500">
            </div>
            
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">カテゴリー</label>
              <select id="ref-category" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500">
                <option value="article" ${ref.category === 'article' ? 'selected' : ''}>過去記事</option>
                <option value="snippet" ${ref.category === 'snippet' ? 'selected' : ''}>スニペット</option>
                <option value="template" ${ref.category === 'template' ? 'selected' : ''}>テンプレート</option>
                <option value="other" ${ref.category === 'other' ? 'selected' : ''}>その他</option>
              </select>
            </div>
            
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">説明</label>
              <textarea id="ref-description" rows="2" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500">${escapeHtml(ref.description || '')}</textarea>
            </div>
            
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">タグ <span class="text-xs text-gray-500">(カンマ区切り)</span></label>
              <input type="text" id="ref-tags" value="${escapeHtml(ref.tags || '')}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500">
            </div>
            
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">参照元URL</label>
              <input type="url" id="ref-source-url" value="${escapeHtml(ref.source_url || '')}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500">
            </div>
            
            <div class="mb-6">
              <label class="block text-gray-700 text-sm font-bold mb-2">コンテンツ <span class="text-red-500">*</span></label>
              <textarea id="ref-content" rows="15" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-purple-500 font-mono text-sm">${escapeHtml(ref.content)}</textarea>
            </div>
            
            <div class="flex gap-4">
              <button onclick="viewReferenceData(${id})" class="flex-1 bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400">
                <i class="fas fa-times mr-2"></i>キャンセル
              </button>
              <button onclick="saveReferenceData(${id})" class="flex-1 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700">
                <i class="fas fa-save mr-2"></i>更新
              </button>
            </div>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Edit reference data error:', error);
    alert('データの読み込みに失敗しました');
  }
}

async function deleteReferenceData(id) {
  if (!confirm('この参照データを削除しますか？この操作は取り消せません。')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE}/reference/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('参照データを削除しました');
      showReferenceData();
    } else {
      alert(data.error || '削除に失敗しました');
    }
  } catch (error) {
    console.error('Delete reference data error:', error);
    alert('削除に失敗しました');
  }
}

async function copyReferenceContent(id) {
  try {
    const response = await fetch(`${API_BASE}/reference/${id}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      navigator.clipboard.writeText(data.data.content).then(() => {
        alert('コンテンツをクリップボードにコピーしました');
      });
    }
  } catch (error) {
    console.error('Copy reference content error:', error);
    alert('コピーに失敗しました');
  }
}

// ===================================
// AIモデル設定（設定画面に追加）
// ===================================
async function loadModelSettings() {
  try {
    const [availableResp, prefsResp] = await Promise.all([
      fetch(`${API_BASE}/models/available`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }),
      fetch(`${API_BASE}/models/preferences`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      })
    ]);

    const available = await availableResp.json();
    const prefs = await prefsResp.json();

    if (available.success && prefs.success) {
      const models = available.data;
      const preferences = prefs.data;

      const useCases = [
        { id: 'outline', name: '記事構成生成', icon: 'list' },
        { id: 'article', name: '記事本文生成', icon: 'file-alt' },
        { id: 'rewrite', name: 'リライト', icon: 'redo' },
        { id: 'seo', name: 'SEO項目生成', icon: 'search' },
        { id: 'assist', name: 'AIアシスタント', icon: 'magic' }
      ];

      let html = '<div class="space-y-6">';
      
      // 動作確認済みモデルの表示
      html += '<div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">';
      html += '<p class="text-green-800 text-sm mb-2"><i class="fas fa-check-circle mr-2"></i>';
      html += '<strong>このAPIキーで確実に動作するモデル:</strong></p>';
      html += '<ul class="text-green-800 text-sm list-disc ml-6 space-y-1">';
      html += '<li><strong>Claude 3 Opus</strong>: 最高性能。長文・複雑な内容に最適 ✅</li>';
      html += '<li><strong>Claude 3 Haiku</strong>: 高速・低コスト。シンプルな記事向け ✅</li>';
      html += '<li><strong>GPT-4o / GPT-4o Mini</strong>: OpenAIの最新モデル ✅</li>';
      html += '</ul>';
      html += '</div>';
      
      // ヒントセクション
      html += '<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">';
      html += '<p class="text-blue-800 text-sm mb-2"><i class="fas fa-lightbulb mr-2"></i>';
      html += '<strong>推奨設定:</strong></p>';
      html += '<ul class="text-blue-800 text-sm list-disc ml-6 space-y-1">';
      html += '<li><strong>高品質な記事</strong>: Claude 3 Opus（記事構成・本文生成に最適）</li>';
      html += '<li><strong>コスト重視</strong>: Claude 3 Haiku（SEO生成・アシスタントに最適）</li>';
      html += '<li><strong>バランス型</strong>: GPT-4o Mini</li>';
      html += '</ul>';
      html += '</div>';
      
      // エラー時の対処法
      html += '<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">';
      html += '<p class="text-yellow-800 text-sm"><i class="fas fa-exclamation-triangle mr-2"></i>';
      html += '<strong>「モデルが見つかりません」エラーが出る場合:</strong> そのモデルはこのAPIキーでは利用できません。';
      html += '上記の「✅確実に動作するモデル」から選択してください。';
      html += '</p></div>';

      useCases.forEach(useCase => {
        const pref = preferences.find(p => p.use_case === useCase.id);
        const currentProvider = pref?.provider || 'anthropic';
        const currentModel = pref?.model_name || 'claude-3-haiku-20240307';

        html += `<div class="border rounded-lg p-4">`;
        html += `<h3 class="font-bold text-lg mb-4"><i class="fas fa-${useCase.icon} text-blue-600 mr-2"></i>${useCase.name}</h3>`;
        html += `<div class="grid grid-cols-2 gap-4">`;
        html += `<div>`;
        html += `<label class="block text-sm font-semibold mb-2">プロバイダー</label>`;
        html += `<select id="provider-${useCase.id}" class="w-full px-3 py-2 border rounded" onchange="updateModelOptions('${useCase.id}')">`;
        html += `<option value="openai" ${currentProvider === 'openai' ? 'selected' : ''}>OpenAI</option>`;
        html += `<option value="anthropic" ${currentProvider === 'anthropic' ? 'selected' : ''}>Anthropic (Claude)</option>`;
        html += `</select>`;
        html += `</div>`;
        html += `<div>`;
        html += `<label class="block text-sm font-semibold mb-2">モデル</label>`;
        html += `<select id="model-${useCase.id}" class="w-full px-3 py-2 border rounded">`;
        
        const provider = currentProvider;
        const modelList = models[provider] || [];
        modelList.forEach(model => {
          html += `<option value="${model.id}" ${model.id === currentModel ? 'selected' : ''}>${model.name}</option>`;
        });
        
        html += `</select>`;
        html += `</div>`;
        html += `</div>`;
        html += `<button onclick="saveModelPreference('${useCase.id}')" class="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">`;
        html += `<i class="fas fa-save mr-2"></i>保存`;
        html += `</button>`;
        html += `<span id="status-${useCase.id}" class="ml-3 text-sm"></span>`;
        html += `</div>`;
      });

      html += '</div>';
      return html;
    }
  } catch (error) {
    console.error('Load model settings error:', error);
    return '<p class="text-red-600">モデル設定の読み込みに失敗しました</p>';
  }
}

function updateModelOptions(useCase) {
  const provider = document.getElementById(`provider-${useCase}`).value;
  // モデルリストを更新（簡略化のため省略 - 実装時に完全版）
}

async function saveModelPreference(useCase) {
  const provider = document.getElementById(`provider-${useCase}`).value;
  const modelName = document.getElementById(`model-${useCase}`).value;
  const statusEl = document.getElementById(`status-${useCase}`);

  try {
    const response = await fetch(`${API_BASE}/models/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ use_case: useCase, provider, model_name: modelName })
    });

    const data = await response.json();
    if (data.success) {
      statusEl.innerHTML = '<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>保存しました</span>';
      setTimeout(() => { statusEl.innerHTML = ''; }, 3000);
    } else {
      statusEl.innerHTML = '<span class="text-red-600"><i class="fas fa-times-circle mr-1"></i>エラー</span>';
    }
  } catch (error) {
    console.error('Save model preference error:', error);
    statusEl.innerHTML = '<span class="text-red-600"><i class="fas fa-times-circle mr-1"></i>保存失敗</span>';
  }
}

// プレビュー画面での編集機能
function enablePreviewEditing() {
  const previewContent = document.getElementById('article-preview-content');
  if (previewContent) {
    previewContent.setAttribute('contenteditable', 'true');
    previewContent.style.border = '2px dashed #3b82f6';
    previewContent.style.padding = '1rem';
    previewContent.style.minHeight = '300px';
    
    // 編集時にMarkdownを更新
    previewContent.addEventListener('blur', () => {
      const htmlContent = previewContent.innerHTML;
      // 簡易的にHTMLからMarkdownに変換（実際にはTurndownなどを使用）
      const markdownContent = htmlToMarkdown(htmlContent);
      const editTextarea = document.getElementById('article-edit');
      if (editTextarea) {
        editTextarea.value = markdownContent;
      }
    });
  }
}

function htmlToMarkdown(html) {
  // 簡易的な変換（実際の実装ではより高度なライブラリを使用）
  let md = html;
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<[^>]+>/g, ''); // Remove remaining tags
  return md.trim();
}

// ===================================
// テキスト選択AI修正機能
// ===================================

let aiAssistButton = null;

// テキスト選択時にAIアシストボタンを表示
function initTextSelection() {
  document.addEventListener('mouseup', handleTextSelection);
  document.addEventListener('touchend', handleTextSelection);
}

function handleTextSelection(e) {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  // 選択テキストがない、または既にボタンが表示中の場合
  if (!selectedText || selectedText.length < 3) {
    hideAIAssistButton();
    return;
  }
  
  // 対象の要素内かチェック（outline-edit, article-edit, article-preview-content）
  const targetElements = ['outline-edit', 'article-edit', 'article-preview-content'];
  const isInTarget = targetElements.some(id => {
    const element = document.getElementById(id);
    return element && element.contains(selection.anchorNode);
  });
  
  if (!isInTarget) {
    hideAIAssistButton();
    return;
  }
  
  // ボタンを表示
  showAIAssistButton(e.pageX, e.pageY, selectedText, selection);
}

function showAIAssistButton(x, y, text, selection) {
  hideAIAssistButton(); // 既存のボタンを削除
  
  aiAssistButton = document.createElement('div');
  aiAssistButton.id = 'ai-assist-button';
  aiAssistButton.className = 'fixed z-50 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-all transform hover:scale-105';
  aiAssistButton.style.left = `${x}px`;
  aiAssistButton.style.top = `${y - 50}px`;
  aiAssistButton.innerHTML = '<i class="fas fa-magic mr-2"></i>AIで改善';
  
  aiAssistButton.onclick = () => {
    showAIAssistDialog(text, selection);
  };
  
  document.body.appendChild(aiAssistButton);
  
  // 3秒後に自動で消える
  setTimeout(() => {
    if (aiAssistButton && aiAssistButton.parentNode) {
      aiAssistButton.classList.add('opacity-0');
      setTimeout(hideAIAssistButton, 300);
    }
  }, 3000);
}

function hideAIAssistButton() {
  if (aiAssistButton && aiAssistButton.parentNode) {
    aiAssistButton.remove();
    aiAssistButton = null;
  }
}

// チャット履歴を保持
let chatHistory = [];

function showAIAssistDialog(selectedText, selection) {
  try {
    console.log('showAIAssistDialog called with:', selectedText);
    hideAIAssistButton();
    
    // 既にチャットパネルが開いている場合は閉じる
    const existingPanel = document.getElementById('ai-chat-panel');
    if (existingPanel) {
      existingPanel.remove();
    }
    
    // チャット履歴をリセット
    chatHistory = [];
    
    // テキストをエスケープ
    const escapedText = escapeHtml(selectedText || '');
    console.log('Text escaped successfully');
    
    // サイドパネル（チャット形式）を作成
    const panel = document.createElement('div');
    panel.id = 'ai-chat-panel';
    panel.className = 'fixed right-0 top-0 h-full w-96 bg-white shadow-2xl flex flex-col transform transition-transform duration-300';
    panel.style.cssText = 'z-index: 9999; transform: translateX(100%);';
    
    console.log('Panel created:', panel);
    
    panel.innerHTML = `
    <!-- ヘッダー -->
    <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 flex items-center justify-between">
      <div>
        <h3 class="text-lg font-bold flex items-center">
          <i class="fas fa-magic mr-2"></i>AIアシスタント
        </h3>
        <p class="text-xs text-purple-100 mt-1">チャットで修正依頼</p>
      </div>
      <button onclick="closeAIAssistDialog()" class="text-white hover:text-purple-200 transition">
        <i class="fas fa-times text-2xl"></i>
      </button>
    </div>
    
    <!-- 選択されたテキスト表示 -->
    <div class="bg-yellow-50 border-b border-yellow-200 p-3">
      <p class="text-xs text-yellow-800 font-semibold mb-1">
        <i class="fas fa-quote-left mr-1"></i>選択中のテキスト:
      </p>
      <div class="bg-white p-2 rounded border border-yellow-300 max-h-24 overflow-y-auto">
        <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">${escapedText}</p>
      </div>
    </div>
    
    <!-- チャットエリア -->
    <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
      <div class="text-center text-sm text-gray-500 py-8">
        <i class="fas fa-comments text-4xl text-gray-300 mb-3"></i>
        <p>修正したい内容をチャットで伝えてください</p>
        <p class="text-xs mt-2">例: 「もっと簡潔に」「専門用語を減らして」</p>
      </div>
    </div>
    
    <!-- 入力エリア -->
    <div class="border-t bg-white p-4">
      <div class="flex gap-2">
        <input 
          type="text" 
          id="chat-input" 
          class="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:border-purple-500 text-sm"
          placeholder="修正内容を入力... (例: もっと簡潔に)"
          onkeypress="if(event.key==='Enter') sendChatMessage()"
        >
        <button 
          onclick="sendChatMessage()" 
          class="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition"
        >
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
      <div class="mt-2 flex gap-2 flex-wrap">
        <button onclick="quickPrompt('より簡潔に')" class="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200">
          ✂️ 簡潔に
        </button>
        <button onclick="quickPrompt('より詳しく')" class="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200">
          📝 詳しく
        </button>
        <button onclick="quickPrompt('カジュアルな表現に')" class="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200">
          😊 カジュアル
        </button>
        <button onclick="quickPrompt('ビジネス的に')" class="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200">
          💼 ビジネス
        </button>
      </div>
    </div>
  `;
  
    document.body.appendChild(panel);
    console.log('Panel appended to body');
    
    // パネルが実際にDOMに存在するか確認
    const addedPanel = document.getElementById('ai-chat-panel');
    console.log('Panel in DOM:', addedPanel);
    
    // 選択範囲を保存
    window.currentSelection = selection;
    window.currentSelectedText = selectedText;
    
    // アニメーションでスライドイン
    setTimeout(() => {
      panel.style.transform = 'translateX(0)';
      console.log('Panel animated in, transform:', panel.style.transform);
    }, 10);
    
    // 入力フォーカス
    setTimeout(() => {
      const input = document.getElementById('chat-input');
      if (input) {
        input.focus();
        console.log('Input focused');
      } else {
        console.error('chat-input not found!');
      }
    }, 350);
    
  } catch (error) {
    console.error('Error in showAIAssistDialog:', error);
    alert('チャットパネルの表示中にエラーが発生しました: ' + error.message);
  }
}

function getSelectionRange() {
  return window.currentSelection;
}

function closeAIAssistDialog() {
  const panel = document.getElementById('ai-chat-panel');
  if (panel) {
    panel.style.transform = 'translateX(100%)';
    setTimeout(() => panel.remove(), 300);
  }
  window.currentSelection = null;
  window.currentSelectedText = null;
  chatHistory = [];
}

// クイックプロンプト
function quickPrompt(instruction) {
  document.getElementById('chat-input').value = instruction;
  sendChatMessage();
}

// チャットメッセージ送信
async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const instruction = input.value.trim();
  
  if (!instruction) {
    return;
  }
  
  // ユーザーメッセージを表示
  addChatMessage('user', instruction);
  input.value = '';
  
  // AIの応答を待機
  const thinkingId = addChatMessage('assistant', '<i class="fas fa-spinner fa-spin mr-2"></i>考え中...', true);
  
  try {
    const response = await fetch(`${API_BASE}/generate/assist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        selected_text: window.currentSelectedText,
        instruction: instruction,
        context: contentFlow.article || ''
      })
    });
    
    const data = await response.json();
    
    // "考え中"メッセージを削除
    removeChatMessage(thinkingId);
    
    if (data.success) {
      const improvedText = data.data.improved;
      
      // グローバル変数に保存（ボタンから参照するため）
      window.pendingImprovement = {
        text: improvedText,
        instruction: instruction
      };
      
      // AIの提案を表示
      addChatMessage('assistant', `
        <div class="space-y-2">
          <p class="text-sm text-gray-600 mb-2">以下のように修正しました：</p>
          <div class="bg-white p-3 rounded border border-green-200 text-sm">
            ${escapeHtml(improvedText)}
          </div>
          <div class="flex gap-2 mt-3">
            <button onclick="applyChatSuggestion(false)" 
                    class="flex-1 bg-green-600 text-white text-xs px-3 py-2 rounded hover:bg-green-700">
              <i class="fas fa-check mr-1"></i>適用
            </button>
            <button onclick="applyChatSuggestion(true)" 
                    class="flex-1 bg-blue-600 text-white text-xs px-3 py-2 rounded hover:bg-blue-700">
              <i class="fas fa-redo mr-1"></i>適用して続ける
            </button>
          </div>
        </div>
      `);
      
      // 現在のテキストを更新（次の修正のため）
      window.currentSelectedText = improvedText;
      chatHistory.push({ instruction, result: improvedText });
      
    } else {
      removeChatMessage(thinkingId);
      addChatMessage('assistant', `
        <div class="text-red-600 text-sm">
          <i class="fas fa-exclamation-circle mr-2"></i>
          エラーが発生しました: ${escapeHtml(data.error || '不明なエラー')}
        </div>
      `);
    }
    
  } catch (error) {
    removeChatMessage(thinkingId);
    console.error('Chat AI assist error:', error);
    addChatMessage('assistant', `
      <div class="text-red-600 text-sm">
        <i class="fas fa-exclamation-circle mr-2"></i>
        通信エラーが発生しました
      </div>
    `);
  }
}

// チャットメッセージを追加
let messageIdCounter = 0;
function addChatMessage(role, content, isTemp = false) {
  const messagesDiv = document.getElementById('chat-messages');
  const messageId = `msg-${messageIdCounter++}`;
  
  const messageDiv = document.createElement('div');
  messageDiv.id = messageId;
  messageDiv.className = role === 'user' 
    ? 'flex justify-end' 
    : 'flex justify-start';
  
  const bubble = document.createElement('div');
  bubble.className = role === 'user'
    ? 'bg-purple-600 text-white px-4 py-2 rounded-lg max-w-xs text-sm'
    : 'bg-white border border-gray-200 px-4 py-2 rounded-lg max-w-sm text-sm shadow-sm';
  
  bubble.innerHTML = content;
  messageDiv.appendChild(bubble);
  messagesDiv.appendChild(messageDiv);
  
  // スクロールを最下部に
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  
  return messageId;
}

// チャットメッセージを削除
function removeChatMessage(messageId) {
  const msg = document.getElementById(messageId);
  if (msg) {
    msg.remove();
  }
}

// チャット提案を適用
function applyChatSuggestion(continueChat) {
  // グローバル変数から取得
  if (!window.pendingImprovement) {
    alert('適用するデータが見つかりません。');
    return;
  }
  
  const improvedText = window.pendingImprovement.text;
  const instruction = window.pendingImprovement.instruction;
  const selection = window.currentSelection;
  
  if (!selection) {
    alert('選択範囲が失われました。もう一度テキストを選択してください。');
    return;
  }
  
  // 選択範囲を置き換え
  try {
    const range = selection.getRangeAt(0);
    const targetElement = range.startContainer.parentElement || range.startContainer;
    
    // textarea または contenteditable の判定
    let isTextarea = false;
    let editElement = null;
    
    if (targetElement.tagName === 'TEXTAREA') {
      isTextarea = true;
      editElement = targetElement;
    } else {
      // contenteditableの親要素を探す
      let parent = targetElement;
      while (parent && !parent.getAttribute('contenteditable')) {
        parent = parent.parentElement;
      }
      if (parent) {
        editElement = parent;
      }
    }
    
    if (isTextarea) {
      // textareaの場合
      const textarea = editElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = textarea.value.substring(0, start);
      const after = textarea.value.substring(end);
      textarea.value = before + improvedText + after;
      
      // カーソル位置を更新
      const newCursorPos = start + improvedText.length;
      textarea.selectionStart = newCursorPos;
      textarea.selectionEnd = newCursorPos;
      
      // 変更を反映
      if (textarea.id === 'outline-edit') {
        contentFlow.outline = textarea.value;
      } else if (textarea.id === 'article-edit') {
        contentFlow.article = textarea.value;
        updateCharCount();
      }
      
    } else if (editElement) {
      // contenteditableの場合
      range.deleteContents();
      const textNode = document.createTextNode(improvedText);
      range.insertNode(textNode);
      
      // カーソルをテキストの末尾に移動
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // プレビューの場合はMarkdownに反映
      if (editElement.id === 'article-preview-content') {
        const markdownContent = htmlToMarkdown(editElement.innerHTML);
        const editTextarea = document.getElementById('article-edit');
        if (editTextarea) {
          editTextarea.value = markdownContent;
          contentFlow.article = markdownContent;
        }
      }
    }
    
    // 成功メッセージ
    showToast('✅ テキストを置き換えました', 'success');
    
    // 適用して続ける場合はチャットを開いたまま
    if (continueChat) {
      // 新しいテキストを選択状態にする
      window.currentSelectedText = improvedText;
      addChatMessage('assistant', `
        <div class="text-sm text-gray-600">
          <i class="fas fa-check-circle text-green-600 mr-2"></i>
          適用しました！続けて修正できます。
        </div>
      `);
    } else {
      // チャットを閉じる
      setTimeout(() => closeAIAssistDialog(), 500);
    }
    
  } catch (error) {
    console.error('Apply suggestion error:', error);
    showToast('❌ 適用に失敗しました', 'error');
  }
}

// トースト通知
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300`;
  toast.style.transform = 'translateY(-100px)';
  toast.innerHTML = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.transform = 'translateY(0)';
  }, 10);
  
  setTimeout(() => {
    toast.style.transform = 'translateY(-100px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// 古いprocessAIAssist関数とapplyAIAssistResult関数は削除済み（チャット形式に置き換え）

// ===================================
// 装飾スタイル管理
// ===================================

// デフォルトスタイル設定
const defaultDecorationStyles = {
  heading: {
    h2Color: '#111827',
    h2Border: '#e5e7eb',
    h3Color: '#1f2937',
    h3Style: 'left-border'
  },
  box: {
    point: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
    success: { bg: '#f0fdf4', border: '#10b981', text: '#065f46' },
    style: 'background'
  },
  button: {
    bg: '#3b82f6',
    text: '#ffffff',
    hover: '#2563eb',
    style: 'solid'
  },
  table: {
    headerBg: '#f9fafb',
    headerText: '#374151',
    border: '#e5e7eb',
    stripeBg: '#f9fafb',
    style: 'default'
  },
  marker: {
    color: '#fde047',
    style: 'underline'
  }
};

let currentDecorationStyles = { ...defaultDecorationStyles };

// 装飾スタイルを読み込む
async function loadDecorationStyles() {
  try {
    const response = await fetch(`${API_BASE}/decoration-template`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.data && data.data.template_content) {
      try {
        currentDecorationStyles = JSON.parse(data.data.template_content);
        applyStylesToInputs();
        updateDecorationPreview();
      } catch (e) {
        console.log('旧形式のテンプレート、デフォルトを使用');
        currentDecorationStyles = { ...defaultDecorationStyles };
        applyStylesToInputs();
        updateDecorationPreview();
      }
    } else {
      console.log('装飾テンプレートが見つかりません、デフォルトを使用');
      currentDecorationStyles = { ...defaultDecorationStyles };
      applyStylesToInputs();
      updateDecorationPreview();
    }
  } catch (error) {
    console.error('Load decoration styles error:', error);
    currentDecorationStyles = { ...defaultDecorationStyles };
    applyStylesToInputs();
    updateDecorationPreview();
  }
}

// スタイル設定を入力フィールドに反映
function applyStylesToInputs() {
  // 見出し
  document.getElementById('heading-h2-color').value = currentDecorationStyles.heading.h2Color;
  document.getElementById('heading-h2-border').value = currentDecorationStyles.heading.h2Border;
  document.getElementById('heading-h3-color').value = currentDecorationStyles.heading.h3Color;
  document.getElementById('heading-h3-style').value = currentDecorationStyles.heading.h3Style;
  
  // ボックス
  document.getElementById('box-point-bg').value = currentDecorationStyles.box.point.bg;
  document.getElementById('box-point-border').value = currentDecorationStyles.box.point.border;
  document.getElementById('box-point-text').value = currentDecorationStyles.box.point.text;
  document.getElementById('box-warning-bg').value = currentDecorationStyles.box.warning.bg;
  document.getElementById('box-warning-border').value = currentDecorationStyles.box.warning.border;
  document.getElementById('box-warning-text').value = currentDecorationStyles.box.warning.text;
  document.getElementById('box-success-bg').value = currentDecorationStyles.box.success.bg;
  document.getElementById('box-success-border').value = currentDecorationStyles.box.success.border;
  document.getElementById('box-success-text').value = currentDecorationStyles.box.success.text;
  document.getElementById('box-style').value = currentDecorationStyles.box.style;
  
  // ボタン
  document.getElementById('button-bg').value = currentDecorationStyles.button.bg;
  document.getElementById('button-text').value = currentDecorationStyles.button.text;
  document.getElementById('button-hover').value = currentDecorationStyles.button.hover;
  document.getElementById('button-style').value = currentDecorationStyles.button.style;
  
  // テーブル
  document.getElementById('table-header-bg').value = currentDecorationStyles.table.headerBg;
  document.getElementById('table-header-text').value = currentDecorationStyles.table.headerText;
  document.getElementById('table-border').value = currentDecorationStyles.table.border;
  document.getElementById('table-stripe-bg').value = currentDecorationStyles.table.stripeBg;
  document.getElementById('table-style').value = currentDecorationStyles.table.style;
  
  // マーカー
  document.getElementById('marker-color').value = currentDecorationStyles.marker.color;
  document.getElementById('marker-style').value = currentDecorationStyles.marker.style;
}

// 入力フィールドからスタイルを収集
function collectStylesFromInputs() {
  return {
    heading: {
      h2Color: document.getElementById('heading-h2-color').value,
      h2Border: document.getElementById('heading-h2-border').value,
      h3Color: document.getElementById('heading-h3-color').value,
      h3Style: document.getElementById('heading-h3-style').value
    },
    box: {
      point: {
        bg: document.getElementById('box-point-bg').value,
        border: document.getElementById('box-point-border').value,
        text: document.getElementById('box-point-text').value
      },
      warning: {
        bg: document.getElementById('box-warning-bg').value,
        border: document.getElementById('box-warning-border').value,
        text: document.getElementById('box-warning-text').value
      },
      success: {
        bg: document.getElementById('box-success-bg').value,
        border: document.getElementById('box-success-border').value,
        text: document.getElementById('box-success-text').value
      },
      style: document.getElementById('box-style').value
    },
    button: {
      bg: document.getElementById('button-bg').value,
      text: document.getElementById('button-text').value,
      hover: document.getElementById('button-hover').value,
      style: document.getElementById('button-style').value
    },
    table: {
      headerBg: document.getElementById('table-header-bg').value,
      headerText: document.getElementById('table-header-text').value,
      border: document.getElementById('table-border').value,
      stripeBg: document.getElementById('table-stripe-bg').value,
      style: document.getElementById('table-style').value
    },
    marker: {
      color: document.getElementById('marker-color').value,
      style: document.getElementById('marker-style').value
    }
  };
}

// 装飾スタイルを保存する
async function saveDecorationStyles() {
  try {
    currentDecorationStyles = collectStylesFromInputs();
    
    const response = await fetch(`${API_BASE}/decoration-template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        template_content: JSON.stringify(currentDecorationStyles, null, 2)
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const statusDiv = document.getElementById('decoration-status');
      statusDiv.innerHTML = '<p class="text-green-600 text-sm"><i class="fas fa-check-circle mr-1"></i>装飾スタイルを保存しました</p>';
      setTimeout(() => { statusDiv.innerHTML = ''; }, 3000);
      updateDecorationPreview();
    } else {
      alert(data.error || '保存に失敗しました');
    }
  } catch (error) {
    console.error('Save decoration styles error:', error);
    alert('保存に失敗しました');
  }
}

// 装飾プレビューを更新
function updateDecorationPreview() {
  const styles = currentDecorationStyles || collectStylesFromInputs();
  
  // プレビューHTML
  const previewHTML = `
    <style id="decoration-preview-styles">
      #decoration-style-preview h2 {
        color: ${styles.heading.h2Color};
        border-bottom: 2px solid ${styles.heading.h2Border};
        padding-bottom: 8px;
        margin-bottom: 16px;
      }
      
      #decoration-style-preview h3 {
        color: ${styles.heading.h3Color};
        ${styles.heading.h3Style === 'left-border' ? `border-left: 4px solid ${styles.heading.h3Color}; padding-left: 12px;` : ''}
        ${styles.heading.h3Style === 'background' ? `background: ${hexToRgba(styles.heading.h3Color, 0.1)}; padding: 8px 12px; border-radius: 4px;` : ''}
        ${styles.heading.h3Style === 'underline' ? `border-bottom: 2px solid ${styles.heading.h3Color}; padding-bottom: 4px;` : ''}
      }
      
      #decoration-style-preview .box-point {
        background: ${styles.box.point.bg};
        border: 2px solid ${styles.box.point.border};
        color: ${styles.box.point.text};
        padding: 16px;
        border-radius: 8px;
        margin: 16px 0;
        ${styles.box.style === 'shadow' ? 'box-shadow: 0 4px 6px rgba(0,0,0,0.1);' : ''}
      }
      
      #decoration-style-preview .box-warning {
        background: ${styles.box.warning.bg};
        border: 2px solid ${styles.box.warning.border};
        color: ${styles.box.warning.text};
        padding: 16px;
        border-radius: 8px;
        margin: 16px 0;
        ${styles.box.style === 'shadow' ? 'box-shadow: 0 4px 6px rgba(0,0,0,0.1);' : ''}
      }
      
      #decoration-style-preview .box-success {
        background: ${styles.box.success.bg};
        border: 2px solid ${styles.box.success.border};
        color: ${styles.box.success.text};
        padding: 16px;
        border-radius: 8px;
        margin: 16px 0;
        ${styles.box.style === 'shadow' ? 'box-shadow: 0 4px 6px rgba(0,0,0,0.1);' : ''}
      }
      
      #decoration-style-preview .preview-button {
        background: ${styles.button.bg};
        color: ${styles.button.text};
        padding: 12px 24px;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        font-weight: 600;
        ${styles.button.style === 'outline' ? `background: transparent; color: ${styles.button.bg}; border: 2px solid ${styles.button.bg};` : ''}
        ${styles.button.style === 'gradient' ? `background: linear-gradient(135deg, ${styles.button.bg}, ${styles.button.hover});` : ''}
      }
      
      #decoration-style-preview .preview-button:hover {
        background: ${styles.button.hover};
      }
      
      #decoration-style-preview table {
        border: 1px solid ${styles.table.border};
        border-collapse: collapse;
        width: 100%;
        margin: 16px 0;
      }
      
      #decoration-style-preview th {
        background: ${styles.table.headerBg};
        color: ${styles.table.headerText};
        padding: 12px;
        border: 1px solid ${styles.table.border};
        font-weight: 600;
      }
      
      #decoration-style-preview td {
        padding: 12px;
        border: 1px solid ${styles.table.border};
      }
      
      ${styles.table.style === 'striped' ? `
      #decoration-style-preview tr:nth-child(even) {
        background: ${styles.table.stripeBg};
      }` : ''}
      
      ${styles.table.style === 'bordered' ? `
      #decoration-style-preview table {
        border: 2px solid ${styles.table.border};
      }` : ''}
      
      #decoration-style-preview .marker {
        font-weight: 600;
        ${styles.marker.style === 'underline' ? `background: linear-gradient(transparent 65%, ${hexToRgba(styles.marker.color, 0.5)} 65%); padding: 0 3px;` : ''}
        ${styles.marker.style === 'background' ? `background: ${hexToRgba(styles.marker.color, 0.3)}; padding: 2px 6px; border-radius: 3px;` : ''}
      }
    </style>
    
    <h2>見出しスタイル (H2)</h2>
    <p>これはH2見出しのプレビューです。下線の色も確認できます。</p>
    
    <h3>見出しスタイル (H3)</h3>
    <p>これはH3見出しのプレビューです。選択したスタイルが適用されます。</p>
    
    <div class="box-point">
      <strong>💡 ポイント</strong><br>
      ここに重要な情報が入ります。背景色とボーダー色をカスタマイズできます。
    </div>
    
    <div class="box-warning">
      <strong>⚠️ 注意</strong><br>
      注意事項や警告メッセージがここに表示されます。
    </div>
    
    <div class="box-success">
      <strong>✅ メリット</strong><br>
      メリットやおすすめポイントがここに表示されます。
    </div>
    
    <p>重要な部分は<span class="marker">マーカーで強調</span>できます。</p>
    
    <button class="preview-button">ボタンスタイル</button>
    
    <table>
      <thead>
        <tr>
          <th>項目</th>
          <th>内容</th>
          <th>備考</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>項目1</td>
          <td>説明1</td>
          <td>補足1</td>
        </tr>
        <tr>
          <td>項目2</td>
          <td>説明2</td>
          <td>補足2</td>
        </tr>
        <tr>
          <td>項目3</td>
          <td>説明3</td>
          <td>補足3</td>
        </tr>
      </tbody>
    </table>
  `;
  
  document.getElementById('decoration-style-preview').innerHTML = previewHTML;
}

// HEX色をRGBAに変換
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 入力フィールドにイベントリスナーを設定（リアルタイムプレビュー）
function setupDecorationInputListeners() {
  const inputIds = [
    'heading-h2-color', 'heading-h2-border', 'heading-h3-color', 'heading-h3-style',
    'box-point-bg', 'box-point-border', 'box-point-text',
    'box-warning-bg', 'box-warning-border', 'box-warning-text',
    'box-success-bg', 'box-success-border', 'box-success-text', 'box-style',
    'button-bg', 'button-text', 'button-hover', 'button-style',
    'table-header-bg', 'table-header-text', 'table-border', 'table-stripe-bg', 'table-style',
    'marker-color', 'marker-style'
  ];
  
  inputIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', () => {
        currentDecorationStyles = collectStylesFromInputs();
        updateDecorationPreview();
      });
      element.addEventListener('change', () => {
        currentDecorationStyles = collectStylesFromInputs();
        updateDecorationPreview();
      });
    }
  });
}

// 旧プレビュー関数（互換性のため残す）
function previewDecorationTemplate() {
  const templateContent = document.getElementById('decoration-template').value;
  
  if (!templateContent) {
    document.getElementById('decoration-preview').innerHTML = `
      <p class="text-gray-400 text-center py-12">
        <i class="fas fa-exclamation-circle text-4xl mb-4"></i><br>
        テンプレート内容が空です
      </p>
    `;
    return;
  }
  
  // シンプルなMarkdownパーサー（基本的な記法のみ対応）
  let html = templateContent
    // コードブロック
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // 見出し
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // 太字
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // イタリック
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // インラインコード
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 水平線
    .replace(/^---$/gim, '<hr>')
    // リンク
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // 画像
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
    // 引用ブロック（複数行対応）
    .replace(/^> (.*)$/gim, function(match, p1) {
      return '<blockquote_line>' + p1 + '</blockquote_line>';
    });
  
  // 引用ブロックを結合
  html = html.replace(/(<blockquote_line>.*?<\/blockquote_line>\n?)+/g, function(match) {
    const lines = match.match(/<blockquote_line>(.*?)<\/blockquote_line>/g);
    const content = lines.map(line => line.replace(/<\/?blockquote_line>/g, '')).join('<br>');
    return '<blockquote><p>' + content + '</p></blockquote>';
  });
  
  // 番号付きリスト
  const olMatches = html.match(/^\d+\. .*$/gim);
  if (olMatches) {
    const olItems = olMatches.map(item => '<li>' + item.replace(/^\d+\. /, '') + '</li>').join('');
    html = html.replace(/^\d+\. .*$/gim, '').replace(/(<li>.*<\/li>)+/, '<ol>$&</ol>');
    html = html.replace(/(<li>.*?<\/li>)+/g, function(match) {
      return '<ol>' + match + '</ol>';
    });
  }
  
  // 箇条書きリスト
  const ulMatches = html.match(/^- .*$/gim);
  if (ulMatches) {
    html = html.replace(/^- (.*)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>\n?)+/g, function(match) {
      return '<ul>' + match + '</ul>';
    });
  }
  
  // 表の処理
  const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
  html = html.replace(tableRegex, function(match, header, rows) {
    const headerCells = header.split('|').filter(cell => cell.trim()).map(cell => 
      '<th>' + cell.trim() + '</th>'
    ).join('');
    
    const rowLines = rows.trim().split('\n');
    const bodyRows = rowLines.map(row => {
      const cells = row.split('|').filter(cell => cell.trim()).map(cell => 
        '<td>' + cell.trim() + '</td>'
      ).join('');
      return '<tr>' + cells + '</tr>';
    }).join('');
    
    return '<table><thead><tr>' + headerCells + '</tr></thead><tbody>' + bodyRows + '</tbody></table>';
  });
  
  // 段落
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  
  // 改行
  html = html.replace(/\n/g, '<br>');
  
  // 空の段落を削除
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>\s*<br>\s*<\/p>/g, '');
  
  document.getElementById('decoration-preview').innerHTML = html;
  
  // プレビュー表示のフィードバック
  const statusDiv = document.getElementById('decoration-status');
  statusDiv.innerHTML = '<p class="text-green-600 text-sm"><i class="fas fa-check-circle mr-1"></i>プレビューを更新しました</p>';
  setTimeout(() => { statusDiv.innerHTML = ''; }, 2000);
}

// デフォルトスタイルに戻す
async function resetDecorationStyles() {
  if (!confirm('デフォルトスタイルに戻しますか？\n現在の設定は失われます。')) {
    return;
  }
  
  currentDecorationStyles = { ...defaultDecorationStyles };
  applyStylesToInputs();
  updateDecorationPreview();
  
  const statusDiv = document.getElementById('decoration-status');
  statusDiv.innerHTML = '<p class="text-blue-600 text-sm"><i class="fas fa-info-circle mr-1"></i>デフォルトスタイルを読み込みました。「保存」ボタンで確定してください。</p>';
  setTimeout(() => { statusDiv.innerHTML = ''; }, 5000);
}

// 旧リセット関数（互換性のため残す）
async function resetDecorationTemplate() {
  if (!confirm('デフォルトテンプレートに戻しますか？\n現在の内容は失われます。')) {
    return;
  }
  
  const defaultTemplate = `# 記事装飾ルール - スタイルガイド

このテンプレートは、AIが記事を生成する際に参照する装飾ルールです。読みやすく、視覚的に魅力的な記事を作成するために、以下の装飾を適切に使用してください。

---

## 1. 箇条書き（リスト）

重要なポイントを列挙する際は箇条書きを活用します。

**使用例：**

- **ポイント1**: 重要な情報を簡潔に記載
- **ポイント2**: 読者が理解しやすい表現を使用
- **ポイント3**: 具体例を交えて説明

**番号付きリスト（手順や順序がある場合）：**

1. **ステップ1**: 最初に行うこと
2. **ステップ2**: 次に実行する作業
3. **ステップ3**: 最後の確認作業

---

## 2. 重要な文章の強調（太字マーカー）

重要なキーワードやポイントは**太字**で強調し、読者の目を引きます。

**使用例：**

この方法により、**作業効率が3倍向上**し、**コストを50%削減**できます。

---

## 3. ボックス（引用ブロック）

注意点、ヒント、補足情報などをボックスで囲み、視覚的に目立たせます。

### ポイント・ヒントボックス（💡）

> 💡 **ポイント**
> 
> ここに重要なヒントや補足情報を記載します。読者にとって役立つ追加情報を提供しましょう。

### 注意・警告ボックス（⚠️）

> ⚠️ **注意事項**
> 
> ここに注意すべき内容や警告を記載します。間違いやすいポイントを事前に伝えることで、トラブルを防ぎます。

### メリット・おすすめポイント（✅）

> ✅ **メリット**
> 
> この方法のメリットや利点を具体的に説明します。読者が行動を起こすきっかけとなる情報です。

### 一般的な引用・補足情報

> **補足情報**
> 
> 一般的な補足説明や引用文はこの形式で記載します。

---

## 4. 表（テーブル）

比較、仕様、データの整理には表を使用します。

**比較表の例：**

| 項目 | プランA | プランB | プランC |
|------|---------|---------|---------|
| 価格 | 1,000円 | 3,000円 | 5,000円 |
| 機能数 | 基本機能 | 標準機能 | 全機能 |
| サポート | メール | メール・電話 | 24時間対応 |
| おすすめ度 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**仕様表の例：**

| 項目 | 内容 |
|------|------|
| サイズ | 幅100cm × 奥行50cm × 高さ80cm |
| 重量 | 15kg |
| 素材 | 天然木（オーク材） |
| カラー | ナチュラル / ダークブラウン |
| 価格 | 29,800円（税込） |

---

## 5. その他の装飾ルール

### リンク
重要なリンクは文脈に自然に組み込みます：
[詳細はこちら](https://example.com)

### インラインコード
技術用語やコマンドは\`code\`で囲みます。

### 画像の挿入
視覚的な説明が必要な場合は画像を使用：
![説明文](画像URL)

---

## 装飾使用のガイドライン

1. **適度に使用する**: 装飾を使いすぎると逆に読みにくくなります
2. **一貫性を保つ**: 同じ種類の情報には同じ装飾を使用
3. **読者目線で**: 読者が理解しやすく、視覚的に快適な記事を目指す
4. **重要度に応じて**: 本当に重要な部分だけを強調する

---

このルールに従って、読みやすく、視覚的に魅力的な記事を作成してください。`;

  document.getElementById('decoration-template').value = defaultTemplate;
  
  const statusDiv = document.getElementById('decoration-status');
  statusDiv.innerHTML = '<p class="text-blue-600 text-sm"><i class="fas fa-info-circle mr-1"></i>デフォルトテンプレートを読み込みました。「保存」ボタンで確定してください。</p>';
  setTimeout(() => { statusDiv.innerHTML = ''; }, 5000);
}

// 初期化時にテキスト選択機能を有効化
document.addEventListener('DOMContentLoaded', () => {
  initTextSelection();
});

// ===================================
// アイキャッチ画像選択機能
// ===================================

// アイキャッチ画像選択モーダルを開く
async function openOgImageSelector() {
  try {
    // 画像ライブラリを取得
    const response = await fetch(`${API_BASE}/image-library`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      alert('画像ライブラリの取得に失敗しました');
      return;
    }
    
    const images = data.data || [];
    
    if (images.length === 0) {
      alert('画像ライブラリに画像がありません。先に画像ライブラリから画像をアップロードしてください。');
      return;
    }
    
    // モーダルHTML生成
    const modal = document.createElement('div');
    modal.id = 'og-image-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h3 class="text-xl font-bold">
            <i class="fas fa-images mr-2 text-blue-600"></i>アイキャッチ画像を選択
          </h3>
          <button onclick="closeOgImageModal()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        
        <div class="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
          ${images.map(img => `
            <div class="cursor-pointer hover:opacity-80 transition" 
                 onclick="selectOgImage('${img.image_url}', '${escapeHtml(img.image_name)}')">
              <img src="${img.image_url}" 
                   alt="${escapeHtml(img.image_name)}" 
                   class="w-full h-48 object-cover rounded-lg border-2 border-gray-300 hover:border-blue-500">
              <p class="text-sm text-gray-600 mt-2 truncate">${escapeHtml(img.image_name)}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
  } catch (error) {
    console.error('Open OG image selector error:', error);
    alert('画像選択モーダルの表示に失敗しました');
  }
}

// アイキャッチ画像選択モーダルを閉じる
function closeOgImageModal() {
  const modal = document.getElementById('og-image-modal');
  if (modal) {
    modal.remove();
  }
}

// アイキャッチ画像を選択
function selectOgImage(imageUrl, imageName) {
  contentFlow.og_image_url = imageUrl;
  
  // プレビュー更新
  const preview = document.getElementById('og-image-preview');
  if (preview) {
    preview.innerHTML = `
      <img src="${imageUrl}" alt="${escapeHtml(imageName)}" 
           class="w-32 h-32 object-cover rounded-lg border-2 border-gray-300">
    `;
  }
  
  // モーダルを閉じる
  closeOgImageModal();
  
  // ボタンを更新
  renderArticleStep();
  
  showToast('アイキャッチ画像を設定しました');
}

// アイキャッチ画像を削除
function removeOgImage() {
  if (!confirm('アイキャッチ画像を削除しますか？\n※最初のH2見出しの画像が自動的に使用されます')) {
    return;
  }
  
  contentFlow.og_image_url = '';
  
  // プレビュー更新
  const preview = document.getElementById('og-image-preview');
  if (preview) {
    preview.innerHTML = `
      <div class="w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
        <i class="fas fa-image text-gray-400 text-3xl"></i>
      </div>
    `;
  }
  
  // ボタンを更新
  renderArticleStep();
  
  showToast('アイキャッチ画像を削除しました');
}

// ===================================
// 記事編集エリアへの画像挿入機能
// ===================================

/**
 * 記事編集用に画像ライブラリモーダルを開く
 */
async function openImageLibraryForArticle() {
  try {
    // 画像ライブラリから画像を取得
    const response = await fetch(`${API_BASE}/image-library`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();
    if (!data.success) {
      showToast('画像の読み込みに失敗しました', 'error');
      return;
    }

    const images = data.data || [];
    
    // モーダルを作成
    const modal = document.createElement('div');
    modal.id = 'article-image-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    };

    modal.innerHTML = `
      <div class="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto m-4" onclick="event.stopPropagation()">
        <div class="sticky top-0 bg-white border-b p-6 z-10">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-images mr-2 text-blue-600"></i>
              画像を選択
            </h2>
            <button onclick="document.getElementById('article-image-modal').remove()" class="text-gray-500 hover:text-gray-700">
              <i class="fas fa-times text-2xl"></i>
            </button>
          </div>
          <div class="flex gap-4">
            <button onclick="showImageLibraryUploadSection()" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              <i class="fas fa-upload mr-2"></i>新しい画像をアップロード
            </button>
          </div>
          <div id="upload-section" class="hidden mt-4 p-4 bg-gray-50 rounded-lg">
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">画像ファイル</label>
              <input type="file" id="article-image-file" accept="image/*" class="w-full px-4 py-2 border rounded-lg">
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">画像名 (英数字、ハイフン、アンダースコアのみ)</label>
              <input type="text" id="article-image-name" class="w-full px-4 py-2 border rounded-lg" placeholder="my-image">
            </div>
            <div class="mb-4">
              <label class="block text-gray-700 text-sm font-bold mb-2">ALTテキスト</label>
              <input type="text" id="article-image-alt" class="w-full px-4 py-2 border rounded-lg" placeholder="画像の説明">
            </div>
            <div class="flex gap-2">
              <button onclick="uploadAndInsertImage()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                <i class="fas fa-check mr-2"></i>アップロードして挿入
              </button>
              <button onclick="document.getElementById('upload-section').classList.add('hidden')" class="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400">
                キャンセル
              </button>
            </div>
          </div>
        </div>
        
        <div class="p-6">
          ${images.length === 0 ? `
            <div class="text-center py-12">
              <i class="fas fa-images text-6xl text-gray-300 mb-4"></i>
              <p class="text-gray-600">画像ライブラリが空です</p>
              <button onclick="showImageLibraryUploadSection()" class="mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
                <i class="fas fa-upload mr-2"></i>最初の画像をアップロード
              </button>
            </div>
          ` : `
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              ${images.map(img => `
                <div class="border rounded-lg overflow-hidden hover:shadow-lg transition cursor-pointer" onclick="insertImageToArticle('${img.image_url}', '${img.alt_text || img.image_name}')">
                  <img src="${img.image_url}" alt="${img.alt_text || img.image_name}" class="w-full h-48 object-cover">
                  <div class="p-3 bg-white">
                    <p class="text-sm font-medium text-gray-800 truncate">${img.image_name}</p>
                    ${img.alt_text ? `<p class="text-xs text-gray-500 truncate">${img.alt_text}</p>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

  } catch (error) {
    console.error('Open image library error:', error);
    showToast('画像ライブラリを開けませんでした', 'error');
  }
}

/**
 * アップロードセクションを表示
 */
function showImageLibraryUploadSection() {
  const uploadSection = document.getElementById('upload-section');
  if (uploadSection) {
    uploadSection.classList.remove('hidden');
  }
}

/**
 * 画像をアップロードして記事に挿入
 */
async function uploadAndInsertImage() {
  const fileInput = document.getElementById('article-image-file');
  const imageName = document.getElementById('article-image-name').value.trim();
  const altText = document.getElementById('article-image-alt').value.trim();

  if (!fileInput.files[0]) {
    showToast('画像ファイルを選択してください', 'error');
    return;
  }

  if (!imageName) {
    showToast('画像名を入力してください', 'error');
    return;
  }

  // 画像名のバリデーション
  if (!/^[a-zA-Z0-9_-]+$/.test(imageName)) {
    showToast('画像名は英数字、ハイフン、アンダースコアのみ使用できます', 'error');
    return;
  }

  const file = fileInput.files[0];
  
  // 画像をBase64に変換
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const base64Data = e.target.result;

      const response = await fetch(`${API_BASE}/image-library`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          image_name: imageName,
          image_data: base64Data,
          alt_text: altText || imageName,
          width: 800,
          height: 450
        })
      });

      const data = await response.json();

      if (data.success) {
        showToast('画像をアップロードしました', 'success');
        
        // 画像を記事に挿入
        insertImageToArticle(data.data.image_url, altText || imageName);
        
        // モーダルを閉じる
        document.getElementById('article-image-modal').remove();
      } else {
        showToast(data.error || '画像のアップロードに失敗しました', 'error');
      }
    } catch (error) {
      console.error('Upload image error:', error);
      showToast('画像のアップロードに失敗しました', 'error');
    }
  };

  reader.readAsDataURL(file);
}

/**
 * 選択した画像を記事に挿入
 */
function insertImageToArticle(imageUrl, altText) {
  const textarea = document.getElementById('article-edit');
  if (!textarea) {
    showToast('記事編集エリアが見つかりません', 'error');
    return;
  }

  // カーソル位置を取得
  const cursorPos = textarea.selectionStart;
  const textBefore = textarea.value.substring(0, cursorPos);
  const textAfter = textarea.value.substring(cursorPos);

  // Markdown形式で画像を挿入
  const imageMarkdown = `\n\n![${altText}](${imageUrl})\n\n`;
  textarea.value = textBefore + imageMarkdown + textAfter;

  // カーソル位置を画像の後ろに移動
  const newCursorPos = cursorPos + imageMarkdown.length;
  textarea.setSelectionRange(newCursorPos, newCursorPos);
  textarea.focus();

  // contentFlowを更新
  contentFlow.article = textarea.value;

  // 文字数カウントを更新
  updateCharCount();

  // モーダルを閉じる
  const modal = document.getElementById('article-image-modal');
  if (modal) {
    modal.remove();
  }

  showToast('画像を挿入しました', 'success');
}

