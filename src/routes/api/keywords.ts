// ===================================
// キーワード管理APIルート
// ===================================

import { Hono } from 'hono';
import type { Env, APIResponse } from '../../types';
import { authMiddleware } from '../../middleware/auth';
import { getKeywordsByUserId } from '../../lib/db';

const keywords = new Hono<{ Bindings: Env }>();

keywords.use('*', authMiddleware);

/**
 * GET /api/keywords - キーワード一覧取得
 */
keywords.get('/', async (c) => {
  try {
    const user = c.get('user');

    const keywordList = await getKeywordsByUserId(c.env.DB, user.userId);

    return c.json<APIResponse>({
      success: true,
      data: keywordList
    });

  } catch (error: any) {
    console.error('Get keywords error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch keywords'
    }, 500);
  }
});

/**
 * POST /api/keywords - キーワード作成
 */
keywords.post('/', async (c) => {
  try {
    const user = c.get('user');
    const { keyword, search_intent, notes } = await c.req.json();

    if (!keyword) {
      return c.json<APIResponse>({
        success: false,
        error: 'Keyword is required'
      }, 400);
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO keywords (user_id, keyword, search_intent, notes) VALUES (?, ?, ?, ?)'
    ).bind(user.userId, keyword, search_intent || null, notes || null).run();

    const newKeyword = await c.env.DB.prepare(
      'SELECT * FROM keywords WHERE id = ?'
    ).bind(result.meta?.last_row_id).first();

    return c.json<APIResponse>({
      success: true,
      data: newKeyword,
      message: 'Keyword created successfully'
    }, 201);

  } catch (error: any) {
    console.error('Create keyword error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to create keyword'
    }, 500);
  }
});

/**
 * DELETE /api/keywords/:id - キーワード削除
 */
keywords.delete('/:id', async (c) => {
  try {
    const keywordId = parseInt(c.req.param('id'));
    const user = c.get('user');

    // キーワード取得
    const keyword = await c.env.DB.prepare(
      'SELECT * FROM keywords WHERE id = ?'
    ).bind(keywordId).first();

    if (!keyword) {
      return c.json<APIResponse>({
        success: false,
        error: 'Keyword not found'
      }, 404);
    }

    // ユーザー権限チェック
    if (keyword.user_id !== user.userId && user.role !== 'admin') {
      return c.json<APIResponse>({
        success: false,
        error: 'Access denied'
      }, 403);
    }

    await c.env.DB.prepare('DELETE FROM keywords WHERE id = ?').bind(keywordId).run();

    return c.json<APIResponse>({
      success: true,
      message: 'Keyword deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete keyword error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to delete keyword'
    }, 500);
  }
});

export default keywords;
