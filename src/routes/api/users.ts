// ===================================
// ユーザー管理APIルート
// ===================================

import { Hono } from 'hono';
import type { Env, APIResponse, User } from '../../types';
import { hashPassword } from '../../lib/auth';
import { getUserById } from '../../lib/db';
import { authMiddleware } from '../../middleware/auth';

const users = new Hono<{ Bindings: Env }>();

// すべてのルートで認証必須
users.use('/*', authMiddleware);

/**
 * GET /api/users - ユーザー一覧取得（管理者のみ）
 */
users.get('/', async (c) => {
  try {
    const jwtPayload = c.get('user');
    const currentUser = await getUserById(c.env.DB, jwtPayload.userId);

    // 管理者権限チェック
    if (!currentUser || currentUser.role !== 'admin') {
      return c.json<APIResponse>({
        success: false,
        error: 'Admin access required'
      }, 403);
    }

    // ユーザー一覧取得（パスワードハッシュは除外）
    const result = await c.env.DB.prepare(`
      SELECT id, email, name, role, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    return c.json<APIResponse>({
      success: true,
      data: result.results || []
    });

  } catch (error: any) {
    console.error('Get users error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to get users'
    }, 500);
  }
});

/**
 * GET /api/users/:id - ユーザー詳細取得（管理者のみ）
 */
users.get('/:id', async (c) => {
  try {
    const jwtPayload = c.get('user');
    const currentUser = await getUserById(c.env.DB, jwtPayload.userId);

    // 管理者権限チェック
    if (!currentUser || currentUser.role !== 'admin') {
      return c.json<APIResponse>({
        success: false,
        error: 'Admin access required'
      }, 403);
    }

    const userId = parseInt(c.req.param('id'));
    if (isNaN(userId)) {
      return c.json<APIResponse>({
        success: false,
        error: 'Invalid user ID'
      }, 400);
    }

    const user = await c.env.DB.prepare(`
      SELECT id, email, name, role, created_at, updated_at
      FROM users
      WHERE id = ?
    `).bind(userId).first();

    if (!user) {
      return c.json<APIResponse>({
        success: false,
        error: 'User not found'
      }, 404);
    }

    return c.json<APIResponse>({
      success: true,
      data: user
    });

  } catch (error: any) {
    console.error('Get user error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to get user'
    }, 500);
  }
});

/**
 * POST /api/users - ユーザー作成（管理者のみ）
 */
users.post('/', async (c) => {
  try {
    const jwtPayload = c.get('user');
    const currentUser = await getUserById(c.env.DB, jwtPayload.userId);

    // 管理者権限チェック
    if (!currentUser || currentUser.role !== 'admin') {
      return c.json<APIResponse>({
        success: false,
        error: 'Admin access required'
      }, 403);
    }

    const { email, password, name, role } = await c.req.json();

    // バリデーション
    if (!email || !password || !name || !role) {
      return c.json<APIResponse>({
        success: false,
        error: 'Email, password, name, and role are required'
      }, 400);
    }

    if (password.length < 8) {
      return c.json<APIResponse>({
        success: false,
        error: 'Password must be at least 8 characters'
      }, 400);
    }

    if (role !== 'admin' && role !== 'editor') {
      return c.json<APIResponse>({
        success: false,
        error: 'Role must be either "admin" or "editor"'
      }, 400);
    }

    // メールアドレス重複チェック
    const existingUser = await c.env.DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(email).first();

    if (existingUser) {
      return c.json<APIResponse>({
        success: false,
        error: 'Email already exists'
      }, 400);
    }

    // パスワードハッシュ化
    const passwordHash = await hashPassword(password);

    // ユーザー作成
    const result = await c.env.DB.prepare(`
      INSERT INTO users (email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(email, passwordHash, name, role).run();

    if (!result.success) {
      return c.json<APIResponse>({
        success: false,
        error: 'Failed to create user'
      }, 500);
    }

    const userId = result.meta.last_row_id;

    // デフォルトプロンプトを作成
    try {
      // Outline用デフォルトプロンプト
      await c.env.DB.prepare(`
        INSERT INTO prompts (user_id, type, name, body, params, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        'outline',
        'デフォルト記事構成プロンプト',
        `キーワード「{{keyword}}」に関する記事の構成案を作成してください。

要件:
- 記事の文字数: {{max_chars}}文字程度
- トーン: {{tone}}
- SEOを意識した見出し構成
- 読者にとって価値のある内容

以下のJSON形式で出力してください:
{
  "title": "記事タイトル",
  "sections": [
    {
      "heading": "見出し1",
      "points": ["ポイント1", "ポイント2"]
    }
  ]
}`,
        '{"max_chars": 3000, "tone": "professional"}',
        1
      ).run();

      // Article Draft用デフォルトプロンプト
      await c.env.DB.prepare(`
        INSERT INTO prompts (user_id, type, name, body, params, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        'article_draft',
        'デフォルト記事執筆プロンプト',
        `キーワード「{{keyword}}」に関する記事を執筆してください。

記事構成:
{{outline}}

要件:
- 記事の文字数: {{max_chars}}文字程度
- トーン: {{tone}}
- SEOを意識しつつ自然な文章
- Markdown形式で出力
- 見出しは ## や ### を使用

記事内容:`,
        '{"max_chars": 3000, "tone": "professional"}',
        1
      ).run();
    } catch (promptError) {
      console.error('Failed to create default prompts:', promptError);
      // プロンプト作成失敗してもユーザー作成は成功とする
    }

    return c.json<APIResponse>({
      success: true,
      data: {
        id: userId,
        email,
        name,
        role
      },
      message: 'User created successfully'
    }, 201);

  } catch (error: any) {
    console.error('Create user error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to create user'
    }, 500);
  }
});

/**
 * PUT /api/users/:id - ユーザー更新（管理者のみ）
 */
users.put('/:id', async (c) => {
  try {
    const jwtPayload = c.get('user');
    const currentUser = await getUserById(c.env.DB, jwtPayload.userId);

    // 管理者権限チェック
    if (!currentUser || currentUser.role !== 'admin') {
      return c.json<APIResponse>({
        success: false,
        error: 'Admin access required'
      }, 403);
    }

    const userId = parseInt(c.req.param('id'));
    if (isNaN(userId)) {
      return c.json<APIResponse>({
        success: false,
        error: 'Invalid user ID'
      }, 400);
    }

    const { email, password, name, role } = await c.req.json();

    // バリデーション
    if (!email || !name || !role) {
      return c.json<APIResponse>({
        success: false,
        error: 'Email, name, and role are required'
      }, 400);
    }

    if (role !== 'admin' && role !== 'editor') {
      return c.json<APIResponse>({
        success: false,
        error: 'Role must be either "admin" or "editor"'
      }, 400);
    }

    // ユーザー存在チェック
    const existingUser = await c.env.DB.prepare(`
      SELECT id FROM users WHERE id = ?
    `).bind(userId).first();

    if (!existingUser) {
      return c.json<APIResponse>({
        success: false,
        error: 'User not found'
      }, 404);
    }

    // メールアドレス重複チェック（自分以外）
    const duplicateEmail = await c.env.DB.prepare(`
      SELECT id FROM users WHERE email = ? AND id != ?
    `).bind(email, userId).first();

    if (duplicateEmail) {
      return c.json<APIResponse>({
        success: false,
        error: 'Email already exists'
      }, 400);
    }

    // パスワード更新がある場合
    if (password && password.trim() !== '') {
      if (password.length < 8) {
        return c.json<APIResponse>({
          success: false,
          error: 'Password must be at least 8 characters'
        }, 400);
      }

      const passwordHash = await hashPassword(password);
      await c.env.DB.prepare(`
        UPDATE users
        SET email = ?, password_hash = ?, name = ?, role = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(email, passwordHash, name, role, userId).run();
    } else {
      // パスワード更新なし
      await c.env.DB.prepare(`
        UPDATE users
        SET email = ?, name = ?, role = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind(email, name, role, userId).run();
    }

    return c.json<APIResponse>({
      success: true,
      data: {
        id: userId,
        email,
        name,
        role
      },
      message: 'User updated successfully'
    });

  } catch (error: any) {
    console.error('Update user error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to update user'
    }, 500);
  }
});

/**
 * DELETE /api/users/:id - ユーザー削除（管理者のみ）
 */
users.delete('/:id', async (c) => {
  try {
    const jwtPayload = c.get('user');
    const currentUser = await getUserById(c.env.DB, jwtPayload.userId);

    // 管理者権限チェック
    if (!currentUser || currentUser.role !== 'admin') {
      return c.json<APIResponse>({
        success: false,
        error: 'Admin access required'
      }, 403);
    }

    const userId = parseInt(c.req.param('id'));
    if (isNaN(userId)) {
      return c.json<APIResponse>({
        success: false,
        error: 'Invalid user ID'
      }, 400);
    }

    // 自分自身は削除できない
    if (userId === currentUser.id) {
      return c.json<APIResponse>({
        success: false,
        error: 'Cannot delete your own account'
      }, 400);
    }

    // ユーザー存在チェック
    const existingUser = await c.env.DB.prepare(`
      SELECT id FROM users WHERE id = ?
    `).bind(userId).first();

    if (!existingUser) {
      return c.json<APIResponse>({
        success: false,
        error: 'User not found'
      }, 404);
    }

    // ユーザー削除
    await c.env.DB.prepare(`
      DELETE FROM users WHERE id = ?
    `).bind(userId).run();

    // 関連データも削除（プロンプト、記事など）
    await c.env.DB.prepare(`
      DELETE FROM prompts WHERE user_id = ?
    `).bind(userId).run();

    // 記事は削除せず、user_idをNULLに設定（オプション）
    // await c.env.DB.prepare(`
    //   UPDATE articles SET user_id = NULL WHERE user_id = ?
    // `).bind(userId).run();

    return c.json<APIResponse>({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete user error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to delete user'
    }, 500);
  }
});

export default users;
