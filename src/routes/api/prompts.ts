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
 * POST /api/prompts - プロンプト作成
 */
prompts.post('/', async (c) => {
  try {
    const user = c.get('user');
    const { name, body, type, params } = await c.req.json();

    if (!name || !body || !type) {
      return c.json<APIResponse>({
        success: false,
        error: 'Name, body, and type are required'
      }, 400);
    }

    // プロンプト作成
    const result = await c.env.DB.prepare(
      `INSERT INTO prompts (user_id, name, body, type, params, is_active) 
       VALUES (?, ?, ?, ?, ?, 1)`
    ).bind(user.userId, name, body, type, params || null).run();

    const newPrompt = await c.env.DB.prepare(
      'SELECT * FROM prompts WHERE id = ?'
    ).bind(result.meta.last_row_id).first<Prompt>();

    return c.json<APIResponse>({
      success: true,
      data: newPrompt,
      message: 'Prompt created successfully'
    }, 201);

  } catch (error: any) {
    console.error('Create prompt error:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to create prompt'
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

/**
 * DELETE /api/prompts/:id - プロンプト削除
 */
prompts.delete('/:id', async (c) => {
  try {
    const promptId = parseInt(c.req.param('id'));
    const user = c.get('user');

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

    // 削除
    await c.env.DB.prepare(
      'DELETE FROM prompts WHERE id = ?'
    ).bind(promptId).run();

    return c.json<APIResponse>({
      success: true,
      message: 'Prompt deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete prompt error:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to delete prompt'
    }, 500);
  }
});

export default prompts;
