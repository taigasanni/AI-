/**
 * ===================================
 * 画像ライブラリ管理
 * Image Library Management
 * ===================================
 */

console.log('📸 Loading Image Library Module...');

// グローバル変数
let images = [];
let headingMappings = [];
let draggedImageName = null;

// ===================================
// 初期化
// ===================================
function showImageLibrary() {
  console.log('📋 Initializing Image Library...');
  
  updateSidebarActive('images');
  
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
          <i class="fas fa-images text-blue-600 mr-4"></i>
          画像ライブラリ管理
        </h1>
        <p class="text-gray-600 mt-2 text-lg">画像をアップロードして、H2見出しと紐付けて自動挿入</p>
      </div>

      <!-- ツールバー -->
      <div class="bg-white rounded-lg shadow-lg p-4 mb-6">
        <div class="flex justify-between items-center">
          <div class="flex space-x-4">
            <button onclick="refreshImageLibrary()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow">
              <i class="fas fa-sync-alt mr-2"></i>更新
            </button>
          </div>
        </div>
      </div>

      <!-- 2カラムレイアウト -->
      <div class="grid grid-cols-2 gap-6">
        <!-- 左側: 画像ライブラリ -->
        <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-xl p-6 border-4 border-purple-300">
          <div class="mb-4 pb-4 border-b-4 border-purple-400">
            <h2 class="text-2xl font-bold text-purple-900 flex items-center">
              <i class="fas fa-folder-open text-3xl mr-3"></i>
              画像ライブラリ
            </h2>
            <p class="text-purple-700 mt-2">画像をドラッグして右側の見出しにドロップ</p>
          </div>

          <!-- 画像アップロードエリア -->
          <div id="upload-area" class="mb-6 border-4 border-dashed border-purple-300 rounded-lg p-8 text-center bg-white hover:bg-purple-50 transition cursor-pointer">
            <i class="fas fa-cloud-upload-alt text-6xl text-purple-400 mb-4"></i>
            <p class="text-lg font-bold text-gray-700 mb-2">画像をドラッグ&ドロップ</p>
            <p class="text-sm text-gray-500">または クリックしてファイルを選択</p>
            <input type="file" id="file-input" accept="image/*" multiple class="hidden">
          </div>

          <!-- 画像一覧 -->
          <div id="images-container" class="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            <!-- 画像がここに表示されます -->
          </div>
        </div>

        <!-- 右側: H2見出し一覧 -->
        <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-xl p-6 border-4 border-green-300">
          <div class="mb-4 pb-4 border-b-4 border-green-400">
            <h2 class="text-2xl font-bold text-green-900 flex items-center">
              <i class="fas fa-heading text-3xl mr-3"></i>
              H2見出し一覧
            </h2>
            <p class="text-green-700 mt-2">左側の画像をここにドロップして紐付け</p>
          </div>

          <!-- 見出し一覧 -->
          <div id="headings-container" class="space-y-4 max-h-[700px] overflow-y-auto pr-2">
            <!-- 見出しがここに表示されます -->
          </div>
        </div>
      </div>

      <!-- 使い方 -->
      <div class="mt-6 bg-gradient-to-r from-purple-50 to-green-50 rounded-lg p-6 border-2 border-purple-300">
        <h3 class="font-bold text-xl text-gray-800 mb-4 flex items-center">
          <i class="fas fa-info-circle text-purple-600 text-2xl mr-3"></i>
          操作方法
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-700">
          <div class="bg-white p-4 rounded-lg shadow">
            <i class="fas fa-upload text-purple-600 mr-2 text-xl"></i>
            <strong>画像アップロード</strong>: ドラッグ&ドロップまたはクリックで選択
          </div>
          <div class="bg-white p-4 rounded-lg shadow">
            <i class="fas fa-hand-rock text-green-600 mr-2 text-xl"></i>
            <strong>紐付け</strong>: 左側の画像を右側の見出しにドラッグ&ドロップ
          </div>
          <div class="bg-white p-4 rounded-lg shadow">
            <i class="fas fa-magic text-blue-600 mr-2 text-xl"></i>
            <strong>自動挿入</strong>: 紐付けた画像がH2見出し配下に自動表示
          </div>
        </div>
      </div>
    </div>

    <!-- 画像編集モーダル -->
    <div id="image-edit-modal" class="hidden fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onclick="if(event.target.id==='image-edit-modal') closeImageEditModal()">
      <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4" onclick="event.stopPropagation()">
        <div class="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-2xl">
          <div class="flex justify-between items-center">
            <h3 class="text-2xl font-bold">
              <i class="fas fa-edit mr-3"></i>画像情報編集
            </h3>
            <button onclick="closeImageEditModal()" class="text-white hover:text-gray-200">
              <i class="fas fa-times text-3xl"></i>
            </button>
          </div>
        </div>
        <div class="p-8">
          <div class="space-y-6">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">画像名:</label>
              <input type="text" id="edit-image-name" class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200">
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">ALTテキスト:</label>
              <input type="text" id="edit-alt-text" class="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200">
            </div>
            <div>
              <img id="edit-image-preview" class="w-full rounded-lg" alt="プレビュー">
            </div>
          </div>
          <div class="flex justify-end space-x-4 mt-8">
            <button onclick="closeImageEditModal()" class="px-8 py-3 bg-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-400">
              キャンセル
            </button>
            <button onclick="confirmImageEdit()" class="px-8 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700">
              <i class="fas fa-check mr-2"></i>保存
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  setupUploadArea();
  loadImageLibrary();
}

// ===================================
// アップロードエリアの設定
// ===================================
function setupUploadArea() {
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  
  uploadArea.onclick = () => fileInput.click();
  
  uploadArea.ondragover = (e) => {
    e.preventDefault();
    uploadArea.classList.add('border-purple-500', 'bg-purple-100');
  };
  
  uploadArea.ondragleave = () => {
    uploadArea.classList.remove('border-purple-500', 'bg-purple-100');
  };
  
  uploadArea.ondrop = (e) => {
    e.preventDefault();
    uploadArea.classList.remove('border-purple-500', 'bg-purple-100');
    const files = e.dataTransfer.files;
    handleFiles(files);
  };
  
  fileInput.onchange = (e) => {
    const files = e.target.files;
    handleFiles(files);
  };
}

// ===================================
// ファイル処理
// ===================================
async function handleFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      alert(`${file.name} は画像ファイルではありません`);
      continue;
    }
    
    try {
      // 画像を読み込んでBase64エンコード
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUrl = e.target.result;
        
        // 画像のメタデータを取得
        const img = new Image();
        img.onload = async () => {
          const imageName = generateImageName(file.name);
          const altText = generateAltText(file.name);
          
          // APIに送信
          await uploadImage({
            image_name: imageName,
            image_url: imageUrl,
            alt_text: altText,
            width: img.width,
            height: img.height,
            file_size: file.size,
            mime_type: file.type
          });
        };
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('File processing error:', error);
      alert(`${file.name} の処理に失敗しました`);
    }
  }
}

// ===================================
// 画像名とALTテキストの自動生成
// ===================================
function generateImageName(filename) {
  // 拡張子を除去してケバブケースに変換
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  return nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateAltText(filename) {
  // ファイル名から日本語らしい説明を生成
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  return nameWithoutExt.replace(/[-_]/g, ' ') + 'の画像';
}

// ===================================
// 画像アップロード
// ===================================
async function uploadImage(imageData) {
  try {
    const response = await fetch('/api/image-library', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(imageData)
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    
    alert('✅ 画像をアップロードしました！');
    loadImageLibrary();
    
  } catch (error) {
    alert('❌ エラー: ' + error.message);
  }
}

// ===================================
// データ読み込み
// ===================================
async function loadImageLibrary() {
  try {
    // 画像一覧を取得
    const imagesRes = await fetch('/api/image-library', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const imagesData = await imagesRes.json();
    if (!imagesData.success) throw new Error('画像の取得に失敗');
    images = imagesData.data || [];
    
    // 見出しマッピングを取得
    const mappingsRes = await fetch('/api/image-library/headings', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const mappingsData = await mappingsRes.json();
    if (!mappingsData.success) throw new Error('マッピングの取得に失敗');
    headingMappings = mappingsData.data || [];
    
    // H2見出し一覧を取得（全記事から）
    const articlesRes = await fetch('/api/articles', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const articlesData = await articlesRes.json();
    if (!articlesData.success) throw new Error('記事の取得に失敗');
    
    const h2Headings = extractH2Headings(articlesData.data || []);
    
    renderImages();
    renderHeadings(h2Headings);
    
  } catch (error) {
    console.error('❌ Error:', error);
    alert('データの読み込みに失敗しました: ' + error.message);
  }
}

// ===================================
// H2見出しの抽出
// ===================================
function extractH2Headings(articles) {
  const headings = [];
  articles.forEach(article => {
    if (article.content) {
      const h2Matches = article.content.match(/^##\s+(.+)$/gm);
      if (h2Matches) {
        h2Matches.forEach(match => {
          const headingText = match.replace(/^##\s+/, '').trim();
          if (!headings.find(h => h.text === headingText)) {
            headings.push({
              text: headingText,
              articleTitle: article.title
            });
          }
        });
      }
    }
  });
  return headings;
}

// ===================================
// 画像一覧の描画
// ===================================
function renderImages() {
  const container = document.getElementById('images-container');
  if (!container) return;
  
  if (images.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-image text-5xl mb-4"></i>
        <p>画像がまだありません</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  
  images.forEach(image => {
    const imageCard = document.createElement('div');
    imageCard.className = 'bg-white rounded-lg shadow-lg p-4 cursor-move hover:shadow-xl transition-all';
    imageCard.draggable = true;
    
    imageCard.innerHTML = `
      <img src="${image.image_url}" alt="${image.alt_text}" class="w-full h-40 object-cover rounded-lg mb-3">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <p class="font-bold text-gray-900 truncate">${image.image_name}</p>
          <p class="text-sm text-gray-500 truncate">${image.alt_text || 'ALTなし'}</p>
        </div>
        <div class="flex space-x-2">
          <button onclick="editImage(${image.id})" class="text-blue-600 hover:text-blue-800 p-2">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="deleteImage(${image.id})" class="text-red-600 hover:text-red-800 p-2">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
    
    // ドラッグイベント
    imageCard.ondragstart = (e) => {
      draggedImageName = image.image_name;
      e.target.style.opacity = '0.5';
    };
    
    imageCard.ondragend = (e) => {
      e.target.style.opacity = '1';
      draggedImageName = null;
    };
    
    container.appendChild(imageCard);
  });
}

// ===================================
// 見出し一覧の描画
// ===================================
function renderHeadings(headings) {
  const container = document.getElementById('headings-container');
  if (!container) return;
  
  if (headings.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-heading text-5xl mb-4"></i>
        <p>H2見出しがありません</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  
  headings.forEach(heading => {
    const mapping = headingMappings.find(m => m.heading_text === heading.text);
    
    const headingCard = document.createElement('div');
    headingCard.className = 'bg-white rounded-lg shadow-lg p-4 hover:shadow-xl transition-all';
    
    headingCard.innerHTML = `
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <h3 class="font-bold text-lg text-gray-900 mb-1">${heading.text}</h3>
          <p class="text-sm text-gray-500">記事: ${heading.articleTitle}</p>
        </div>
      </div>
      ${mapping ? `
        <div class="mt-3 p-3 bg-green-50 border-l-4 border-green-500 rounded flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <img src="${mapping.image_url}" alt="${mapping.alt_text}" class="w-16 h-16 object-cover rounded">
            <div>
              <p class="font-semibold text-green-900">${mapping.image_name}</p>
              <p class="text-xs text-green-700">${mapping.alt_text}</p>
            </div>
          </div>
          <button onclick="removeHeadingMapping('${heading.text}')" class="text-red-600 hover:text-red-800 p-2">
            <i class="fas fa-times"></i>
          </button>
        </div>
      ` : `
        <div class="mt-3 p-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded text-center text-gray-500 text-sm">
          画像をここにドロップ
        </div>
      `}
    `;
    
    // ドロップイベント
    headingCard.ondragover = (e) => {
      e.preventDefault();
      headingCard.classList.add('ring-4', 'ring-green-400');
    };
    
    headingCard.ondragleave = () => {
      headingCard.classList.remove('ring-4', 'ring-green-400');
    };
    
    headingCard.ondrop = async (e) => {
      e.preventDefault();
      headingCard.classList.remove('ring-4', 'ring-green-400');
      
      if (draggedImageName) {
        await createHeadingMapping(heading.text, draggedImageName);
      }
    };
    
    container.appendChild(headingCard);
  });
}

// ===================================
// 見出しと画像の紐付け
// ===================================
async function createHeadingMapping(headingText, imageName) {
  try {
    const response = await fetch('/api/image-library/headings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        heading_text: headingText,
        image_name: imageName
      })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    
    alert('✅ 見出しと画像を紐付けました！');
    loadImageLibrary();
    
  } catch (error) {
    alert('❌ エラー: ' + error.message);
  }
}

// ===================================
// 紐付け削除
// ===================================
async function removeHeadingMapping(headingText) {
  if (!confirm('この紐付けを解除しますか？')) return;
  
  try {
    const response = await fetch(`/api/image-library/headings/${encodeURIComponent(headingText)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    
    alert('✅ 紐付けを解除しました');
    loadImageLibrary();
    
  } catch (error) {
    alert('❌ エラー: ' + error.message);
  }
}

// ===================================
// 画像編集
// ===================================
let currentEditingImageId = null;

function editImage(imageId) {
  const image = images.find(img => img.id === imageId);
  if (!image) return;
  
  currentEditingImageId = imageId;
  document.getElementById('edit-image-name').value = image.image_name;
  document.getElementById('edit-alt-text').value = image.alt_text || '';
  document.getElementById('edit-image-preview').src = image.image_url;
  document.getElementById('image-edit-modal').classList.remove('hidden');
}

function closeImageEditModal() {
  document.getElementById('image-edit-modal').classList.add('hidden');
  currentEditingImageId = null;
}

async function confirmImageEdit() {
  if (!currentEditingImageId) return;
  
  const imageName = document.getElementById('edit-image-name').value.trim();
  const altText = document.getElementById('edit-alt-text').value.trim();
  
  if (!imageName) {
    alert('画像名を入力してください');
    return;
  }
  
  try {
    const response = await fetch(`/api/image-library/${currentEditingImageId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ image_name: imageName, alt_text: altText })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    
    alert('✅ 画像情報を更新しました！');
    closeImageEditModal();
    loadImageLibrary();
    
  } catch (error) {
    alert('❌ エラー: ' + error.message);
  }
}

// ===================================
// 画像削除
// ===================================
async function deleteImage(imageId) {
  if (!confirm('この画像を削除しますか？\n紐付けも解除されます。')) return;
  
  try {
    const response = await fetch(`/api/image-library/${imageId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    
    alert('✅ 画像を削除しました');
    loadImageLibrary();
    
  } catch (error) {
    alert('❌ エラー: ' + error.message);
  }
}

// ===================================
// ユーティリティ
// ===================================
async function refreshImageLibrary() {
  await loadImageLibrary();
  alert('✅ 更新しました');
}

// グローバル登録
window.showImageLibrary = showImageLibrary;
window.refreshImageLibrary = refreshImageLibrary;
window.editImage = editImage;
window.deleteImage = deleteImage;
window.closeImageEditModal = closeImageEditModal;
window.confirmImageEdit = confirmImageEdit;
window.createHeadingMapping = createHeadingMapping;
window.removeHeadingMapping = removeHeadingMapping;

console.log('✅ Image Library Module Loaded!');
