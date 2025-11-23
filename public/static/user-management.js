// ===================================
// ユーザー管理機能
// ===================================

let usersData = [];

/**
 * ユーザー管理画面を表示
 */
async function showUserManagement() {
  setActivePage('users');
  
  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = `
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800">
          <i class="fas fa-users mr-2"></i>ユーザー管理
        </h1>
        <button onclick="showCreateUserForm()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200">
          <i class="fas fa-plus mr-2"></i>新規ユーザー作成
        </button>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-6">
        <div id="users-list-container">
          <div class="flex justify-center items-center py-12">
            <i class="fas fa-spinner fa-spin text-4xl text-gray-400"></i>
          </div>
        </div>
      </div>
    </div>
  `;

  await loadUsers();
}

/**
 * ユーザー一覧を読み込み
 */
async function loadUsers() {
  try {
    const response = await fetch(`${API_BASE}/users`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();

    if (data.success) {
      usersData = data.data || [];
      renderUsersList();
    } else {
      document.getElementById('users-list-container').innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-exclamation-circle text-4xl text-red-500 mb-4"></i>
          <p class="text-gray-600">${data.error || 'ユーザー一覧の取得に失敗しました'}</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Load users error:', error);
    document.getElementById('users-list-container').innerHTML = `
      <div class="text-center py-12">
        <i class="fas fa-exclamation-circle text-4xl text-red-500 mb-4"></i>
        <p class="text-gray-600">ユーザー一覧の取得に失敗しました</p>
      </div>
    `;
  }
}

/**
 * ユーザー一覧を表示
 */
function renderUsersList() {
  const container = document.getElementById('users-list-container');
  
  if (usersData.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <i class="fas fa-users text-4xl text-gray-300 mb-4"></i>
        <p class="text-gray-600">ユーザーがいません</p>
      </div>
    `;
    return;
  }

  const currentUserId = currentUser ? currentUser.id : null;

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名前</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">メールアドレス</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">権限</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">登録日</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          ${usersData.map(user => `
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${user.id}
                ${user.id === currentUserId ? '<span class="ml-2 text-xs text-blue-600">(あなた)</span>' : ''}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${user.name}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                ${user.email}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                ${user.role === 'admin' 
                  ? '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800"><i class="fas fa-crown mr-1"></i>管理者</span>'
                  : '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"><i class="fas fa-pen mr-1"></i>編集者</span>'
                }
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                ${new Date(user.created_at).toLocaleDateString('ja-JP')}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="showEditUserForm(${user.id})" class="text-blue-600 hover:text-blue-900 mr-3">
                  <i class="fas fa-edit mr-1"></i>編集
                </button>
                ${user.id !== currentUserId 
                  ? `<button onclick="confirmDeleteUser(${user.id}, '${user.name}')" class="text-red-600 hover:text-red-900">
                      <i class="fas fa-trash mr-1"></i>削除
                    </button>`
                  : '<span class="text-gray-400"><i class="fas fa-lock mr-1"></i>削除不可</span>'
                }
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * ユーザー作成フォームを表示
 */
function showCreateUserForm() {
  const contentArea = document.getElementById('content-area');
  contentArea.innerHTML = `
    <div class="max-w-2xl mx-auto">
      <div class="mb-6">
        <button onclick="showUserManagement()" class="text-blue-600 hover:text-blue-800">
          <i class="fas fa-arrow-left mr-2"></i>ユーザー一覧に戻る
        </button>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">
          <i class="fas fa-user-plus mr-2"></i>新規ユーザー作成
        </h2>

        <form id="create-user-form" class="space-y-6">
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2">名前 <span class="text-red-500">*</span></label>
            <input type="text" id="create-user-name" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="山田太郎" required>
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2">メールアドレス <span class="text-red-500">*</span></label>
            <input type="email" id="create-user-email" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="user@example.com" required>
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2">パスワード (8文字以上) <span class="text-red-500">*</span></label>
            <input type="password" id="create-user-password" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="パスワード" required>
            <p class="text-xs text-gray-500 mt-1">セキュリティのため、8文字以上のパスワードを設定してください</p>
          </div>

          <div>
            <label class="block text-gray-700 text-sm font-bold mb-2">権限レベル <span class="text-red-500">*</span></label>
            <select id="create-user-role" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" required>
              <option value="editor">編集者 - 記事の作成・編集が可能</option>
              <option value="admin">管理者 - すべての機能にアクセス可能</option>
            </select>
          </div>

          <div id="create-user-message" class="text-sm text-center"></div>

          <div class="flex gap-4">
            <button type="submit" class="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition duration-200">
              <i class="fas fa-save mr-2"></i>作成
            </button>
            <button type="button" onclick="showUserManagement()" class="flex-1 bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400 transition duration-200">
              <i class="fas fa-times mr-2"></i>キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('create-user-form').addEventListener('submit', handleCreateUser);
}

/**
 * ユーザー作成処理
 */
async function handleCreateUser(e) {
  e.preventDefault();

  const name = document.getElementById('create-user-name').value;
  const email = document.getElementById('create-user-email').value;
  const password = document.getElementById('create-user-password').value;
  const role = document.getElementById('create-user-role').value;
  const messageEl = document.getElementById('create-user-message');

  if (!name || !email || !password || !role) {
    messageEl.textContent = 'すべての項目を入力してください';
    messageEl.className = 'text-sm text-center text-red-600';
    return;
  }

  if (password.length < 8) {
    messageEl.textContent = 'パスワードは8文字以上で入力してください';
    messageEl.className = 'text-sm text-center text-red-600';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ name, email, password, role })
    });

    const data = await response.json();

    if (data.success) {
      messageEl.textContent = 'ユーザーを作成しました';
      messageEl.className = 'text-sm text-center text-green-600';
      setTimeout(() => {
        showUserManagement();
      }, 1500);
    } else {
      messageEl.textContent = data.error || 'ユーザーの作成に失敗しました';
      messageEl.className = 'text-sm text-center text-red-600';
    }
  } catch (error) {
    console.error('Create user error:', error);
    messageEl.textContent = 'ユーザーの作成に失敗しました';
    messageEl.className = 'text-sm text-center text-red-600';
  }
}

/**
 * ユーザー編集フォームを表示
 */
async function showEditUserForm(userId) {
  try {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();

    if (!data.success) {
      alert(data.error || 'ユーザー情報の取得に失敗しました');
      return;
    }

    const user = data.data;
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
      <div class="max-w-2xl mx-auto">
        <div class="mb-6">
          <button onclick="showUserManagement()" class="text-blue-600 hover:text-blue-800">
            <i class="fas fa-arrow-left mr-2"></i>ユーザー一覧に戻る
          </button>
        </div>

        <div class="bg-white rounded-lg shadow-lg p-8">
          <h2 class="text-2xl font-bold text-gray-800 mb-6">
            <i class="fas fa-user-edit mr-2"></i>ユーザー編集
          </h2>

          <form id="edit-user-form" class="space-y-6">
            <input type="hidden" id="edit-user-id" value="${user.id}">

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">名前 <span class="text-red-500">*</span></label>
              <input type="text" id="edit-user-name" value="${user.name}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="山田太郎" required>
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">メールアドレス <span class="text-red-500">*</span></label>
              <input type="email" id="edit-user-email" value="${user.email}" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="user@example.com" required>
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">パスワード（変更する場合のみ入力）</label>
              <input type="password" id="edit-user-password" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" placeholder="新しいパスワード（オプション）">
              <p class="text-xs text-gray-500 mt-1">パスワードを変更しない場合は空欄のままにしてください</p>
            </div>

            <div>
              <label class="block text-gray-700 text-sm font-bold mb-2">権限レベル <span class="text-red-500">*</span></label>
              <select id="edit-user-role" class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500" required>
                <option value="editor" ${user.role === 'editor' ? 'selected' : ''}>編集者 - 記事の作成・編集が可能</option>
                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>管理者 - すべての機能にアクセス可能</option>
              </select>
            </div>

            <div id="edit-user-message" class="text-sm text-center"></div>

            <div class="flex gap-4">
              <button type="submit" class="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition duration-200">
                <i class="fas fa-save mr-2"></i>更新
              </button>
              <button type="button" onclick="showUserManagement()" class="flex-1 bg-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-400 transition duration-200">
                <i class="fas fa-times mr-2"></i>キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('edit-user-form').addEventListener('submit', handleEditUser);

  } catch (error) {
    console.error('Load user error:', error);
    alert('ユーザー情報の取得に失敗しました');
  }
}

/**
 * ユーザー更新処理
 */
async function handleEditUser(e) {
  e.preventDefault();

  const userId = document.getElementById('edit-user-id').value;
  const name = document.getElementById('edit-user-name').value;
  const email = document.getElementById('edit-user-email').value;
  const password = document.getElementById('edit-user-password').value;
  const role = document.getElementById('edit-user-role').value;
  const messageEl = document.getElementById('edit-user-message');

  if (!name || !email || !role) {
    messageEl.textContent = '名前、メールアドレス、権限は必須項目です';
    messageEl.className = 'text-sm text-center text-red-600';
    return;
  }

  if (password && password.length < 8) {
    messageEl.textContent = 'パスワードは8文字以上で入力してください';
    messageEl.className = 'text-sm text-center text-red-600';
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ name, email, password, role })
    });

    const data = await response.json();

    if (data.success) {
      messageEl.textContent = 'ユーザー情報を更新しました';
      messageEl.className = 'text-sm text-center text-green-600';
      setTimeout(() => {
        showUserManagement();
      }, 1500);
    } else {
      messageEl.textContent = data.error || 'ユーザー情報の更新に失敗しました';
      messageEl.className = 'text-sm text-center text-red-600';
    }
  } catch (error) {
    console.error('Update user error:', error);
    messageEl.textContent = 'ユーザー情報の更新に失敗しました';
    messageEl.className = 'text-sm text-center text-red-600';
  }
}

/**
 * ユーザー削除確認
 */
function confirmDeleteUser(userId, userName) {
  if (confirm(`本当に「${userName}」を削除しますか？\n\nこの操作は取り消せません。`)) {
    handleDeleteUser(userId);
  }
}

/**
 * ユーザー削除処理
 */
async function handleDeleteUser(userId) {
  try {
    const response = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();

    if (data.success) {
      alert('ユーザーを削除しました');
      await loadUsers();
    } else {
      alert(data.error || 'ユーザーの削除に失敗しました');
    }
  } catch (error) {
    console.error('Delete user error:', error);
    alert('ユーザーの削除に失敗しました');
  }
}
