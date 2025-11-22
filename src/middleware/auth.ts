// ===================================
// 認証ミドルウェア
// ===================================

import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import type { Env, JWTPayload } from '../types';
import { verifyJWT, extractToken } from '../lib/auth';
import { getUserById } from '../lib/db';

// Context型を拡張して認証情報を追加
declare module 'hono' {
  interface ContextVariableMap {
    user: JWTPayload;
  }
}

/**
 * JWT認証ミドルウェア
 */
export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = extractToken(authHeader);

  if (!token) {
    return c.json({ success: false, error: 'Authorization token required' }, 401);
  }

  const jwtSecret = c.env.JWT_SECRET;
  if (!jwtSecret) {
    return c.json({ success: false, error: 'Server configuration error' }, 500);
  }

  const payload = await verifyJWT(token, jwtSecret);
  if (!payload) {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }

  // ユーザーが存在するか確認
  const user = await getUserById(c.env.DB, payload.userId);
  if (!user) {
    return c.json({ success: false, error: 'User not found' }, 401);
  }

  // Contextに認証情報を保存
  c.set('user', payload);

  await next();
});

/**
 * 管理者権限チェックミドルウェア
 */
export const adminMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const user = c.get('user');
  
  if (!user || user.role !== 'admin') {
    return c.json({ success: false, error: 'Admin access required' }, 403);
  }

  await next();
});
