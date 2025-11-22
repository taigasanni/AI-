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
