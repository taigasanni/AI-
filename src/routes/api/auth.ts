// ===================================
// 認証APIルート
// ===================================

import { Hono } from 'hono';
import type { Env, APIResponse, User } from '../../types';
import { hashPassword, verifyPassword, generateJWT } from '../../lib/auth';
import { getUserByEmail, createUser, getUserById } from '../../lib/db';
import { authMiddleware } from '../../middleware/auth';

const auth = new Hono<{ Bindings: Env }>();

/**
 * POST /api/auth/register - ユーザー登録
 */
auth.post('/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    // バリデーション
    if (!email || !password || !name) {
      return c.json<APIResponse>({
        success: false,
        error: 'Email, password, and name are required'
      }, 400);
    }

    if (password.length < 8) {
      return c.json<APIResponse>({
        success: false,
        error: 'Password must be at least 8 characters'
      }, 400);
    }

    // メールアドレス重複チェック
    const existingUser = await getUserByEmail(c.env.DB, email);
    if (existingUser) {
      return c.json<APIResponse>({
        success: false,
        error: 'Email already exists'
      }, 400);
    }

    // パスワードハッシュ化
    const passwordHash = await hashPassword(password);

    // ユーザー作成
    const userId = await createUser(c.env.DB, email, passwordHash, name, 'editor');

    if (!userId) {
      return c.json<APIResponse>({
        success: false,
        error: 'Failed to create user'
      }, 500);
    }

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
      // プロンプト作成失敗してもユーザー登録は成功とする
    }

    // JWTトークン生成
    const token = await generateJWT(
      { userId, email, role: 'editor' },
      c.env.JWT_SECRET
    );

    return c.json<APIResponse>({
      success: true,
      data: {
        token,
        user: {
          id: userId,
          email,
          name,
          role: 'editor'
        }
      },
      message: 'User registered successfully'
    }, 201);

  } catch (error: any) {
    console.error('Register error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Registration failed'
    }, 500);
  }
});

/**
 * POST /api/auth/login - ログイン
 */
auth.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    // バリデーション
    if (!email || !password) {
      return c.json<APIResponse>({
        success: false,
        error: 'Email and password are required'
      }, 400);
    }

    // ユーザー取得
    const user = await getUserByEmail(c.env.DB, email);
    if (!user) {
      return c.json<APIResponse>({
        success: false,
        error: 'Invalid email or password'
      }, 401);
    }

    // パスワード検証
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return c.json<APIResponse>({
        success: false,
        error: 'Invalid email or password'
      }, 401);
    }

    // JWTトークン生成
    const token = await generateJWT(
      { userId: user.id, email: user.email, role: user.role },
      c.env.JWT_SECRET
    );

    return c.json<APIResponse>({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      },
      message: 'Login successful'
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Login failed'
    }, 500);
  }
});

/**
 * GET /api/auth/me - 現在のユーザー情報取得
 */
auth.get('/me', authMiddleware, async (c) => {
  try {
    const jwtPayload = c.get('user');
    const user = await getUserById(c.env.DB, jwtPayload.userId);

    if (!user) {
      return c.json<APIResponse>({
        success: false,
        error: 'User not found'
      }, 404);
    }

    return c.json<APIResponse>({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at
      }
    });

  } catch (error: any) {
    console.error('Get user error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to get user info'
    }, 500);
  }
});

/**
 * POST /api/auth/logout - ログアウト (クライアント側でトークン削除)
 */
auth.post('/logout', authMiddleware, async (c) => {
  return c.json<APIResponse>({
    success: true,
    message: 'Logout successful. Please remove token from client.'
  });
});

export default auth;
