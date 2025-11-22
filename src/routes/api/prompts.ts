// ===================================
// プロンプト管理APIルート
// ===================================

import { Hono } from 'hono';
import type { Env, APIResponse, Prompt } from '../../types';
import { authMiddleware } from '../../middleware/auth';

const prompts = new Hono<{ Bindings: Env }>();

prompts.use('*', authMiddleware);

/**
 * GET /api/prompts - プロンプト一覧取得
 */
prompts.get('/', async (c) => {
  try {
    const user = c.get('user');

    const promptList = await c.env.DB.prepare(
      'SELECT * FROM prompts WHERE user_id = ? ORDER BY type, created_at DESC'
    ).bind(user.userId).all<Prompt>();

    return c.json<APIResponse>({
      success: true,
      data: promptList.results || []
    });

  } catch (error: any) {
    console.error('Get prompts error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch prompts'
    }, 500);
  }
});

/**
 * PUT /api/prompts/:id - プロンプト更新
 */
prompts.put('/:id', async (c) => {
  try {
    const promptId = parseInt(c.req.param('id'));
    const user = c.get('user');
    const { name, body, params } = await c.req.json();

    // プロンプト存在確認
    const prompt = await c.env.DB.prepare(
      'SELECT * FROM prompts WHERE id = ?'
    ).bind(promptId).first<Prompt>();

    if (!prompt) {
      return c.json<APIResponse>({
        success: false,
        error: 'Prompt not found'
      }, 404);
    }

    // ユーザー権限チェック
    if (prompt.user_id !== user.userId && user.role !== 'admin') {
      return c.json<APIResponse>({
        success: false,
        error: 'Access denied'
      }, 403);
    }

    // 更新
    await c.env.DB.prepare(
      `UPDATE prompts 
       SET name = ?, body = ?, params = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`
    ).bind(name, body, params, promptId).run();

    const updatedPrompt = await c.env.DB.prepare(
      'SELECT * FROM prompts WHERE id = ?'
    ).bind(promptId).first<Prompt>();

    return c.json<APIResponse>({
      success: true,
      data: updatedPrompt,
      message: 'Prompt updated successfully'
    });

  } catch (error: any) {
    console.error('Update prompt error:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to update prompt'
    }, 500);
  }
});

export default prompts;
