// ===================================
// 装飾テンプレートAPIルート
// ===================================

import { Hono } from 'hono';
import type { Env, APIResponse } from '../../types';
import { authMiddleware } from '../../middleware/auth';

const decoration = new Hono<{ Bindings: Env }>();

decoration.use('*', authMiddleware);

/**
 * GET /api/decoration-template - 装飾テンプレート取得
 */
decoration.get('/', async (c) => {
  try {
    const user = c.get('user');

    const template = await c.env.DB.prepare(
      'SELECT * FROM decoration_templates WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1'
    ).bind(user.userId).first();

    return c.json<APIResponse>({
      success: true,
      data: template
    });

  } catch (error: any) {
    console.error('Get decoration template error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch decoration template'
    }, 500);
  }
});

/**
 * POST /api/decoration-template - 装飾テンプレート保存/更新
 */
decoration.post('/', async (c) => {
  try {
    const user = c.get('user');
    const { template_content } = await c.req.json();

    if (!template_content) {
      return c.json<APIResponse>({
        success: false,
        error: 'Template content is required'
      }, 400);
    }

    // 既存のテンプレートを無効化
    await c.env.DB.prepare(
      'UPDATE decoration_templates SET is_active = 0 WHERE user_id = ?'
    ).bind(user.userId).run();

    // 新しいテンプレートを作成
    await c.env.DB.prepare(
      `INSERT INTO decoration_templates (user_id, name, description, template_content, is_active)
       VALUES (?, ?, ?, ?, 1)`
    ).bind(
      user.userId,
      'カスタム装飾テンプレート',
      'ユーザーがカスタマイズした装飾ルール',
      template_content
    ).run();

    return c.json<APIResponse>({
      success: true,
      message: 'Decoration template saved successfully'
    });

  } catch (error: any) {
    console.error('Save decoration template error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to save decoration template'
    }, 500);
  }
});

export default decoration;
