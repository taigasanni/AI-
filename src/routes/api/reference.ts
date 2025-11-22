// ===================================
// 参照データ管理APIルート
// ===================================

import { Hono } from 'hono';
import type { Env, APIResponse } from '../../types';
import { authMiddleware } from '../../middleware/auth';

const reference = new Hono<{ Bindings: Env }>();

reference.use('*', authMiddleware);

/**
 * GET /api/reference - 参照データ一覧取得
 */
reference.get('/', async (c) => {
  try {
    const user = c.get('user');
    const { category } = c.req.query();

    let query = 'SELECT * FROM reference_data WHERE user_id = ?';
    const params: any[] = [user.userId];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY created_at DESC';

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json<APIResponse>({
      success: true,
      data: result.results || []
    });

  } catch (error: any) {
    console.error('Get reference data error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch reference data'
    }, 500);
  }
});

/**
 * GET /api/reference/:id - 参照データ詳細取得
 */
reference.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const user = c.get('user');

    const data = await c.env.DB.prepare(
      'SELECT * FROM reference_data WHERE id = ? AND user_id = ?'
    ).bind(id, user.userId).first();

    if (!data) {
      return c.json<APIResponse>({
        success: false,
        error: 'Reference data not found'
      }, 404);
    }

    return c.json<APIResponse>({
      success: true,
      data
    });

  } catch (error: any) {
    console.error('Get reference data detail error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch reference data'
    }, 500);
  }
});

/**
 * POST /api/reference - 参照データ作成
 */
reference.post('/', async (c) => {
  try {
    const user = c.get('user');
    const {
      title,
      content,
      category,
      tags,
      description,
      source_url
    } = await c.req.json();

    if (!title || !content) {
      return c.json<APIResponse>({
        success: false,
        error: 'Title and content are required'
      }, 400);
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO reference_data (user_id, title, content, category, tags, description, source_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      user.userId,
      title,
      content,
      category || 'other',
      tags || null,
      description || null,
      source_url || null
    ).run();

    const newData = await c.env.DB.prepare(
      'SELECT * FROM reference_data WHERE id = ?'
    ).bind(result.meta?.last_row_id || 0).first();

    return c.json<APIResponse>({
      success: true,
      data: newData,
      message: 'Reference data created successfully'
    }, 201);

  } catch (error: any) {
    console.error('Create reference data error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to create reference data'
    }, 500);
  }
});

/**
 * PUT /api/reference/:id - 参照データ更新
 */
reference.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const user = c.get('user');
    const updateData = await c.req.json();

    // データ存在確認
    const existing = await c.env.DB.prepare(
      'SELECT * FROM reference_data WHERE id = ? AND user_id = ?'
    ).bind(id, user.userId).first();

    if (!existing) {
      return c.json<APIResponse>({
        success: false,
        error: 'Reference data not found'
      }, 404);
    }

    // 更新フィールド構築
    const fields: string[] = [];
    const values: any[] = [];

    if (updateData.title !== undefined) {
      fields.push('title = ?');
      values.push(updateData.title);
    }
    if (updateData.content !== undefined) {
      fields.push('content = ?');
      values.push(updateData.content);
    }
    if (updateData.category !== undefined) {
      fields.push('category = ?');
      values.push(updateData.category);
    }
    if (updateData.tags !== undefined) {
      fields.push('tags = ?');
      values.push(updateData.tags);
    }
    if (updateData.description !== undefined) {
      fields.push('description = ?');
      values.push(updateData.description);
    }
    if (updateData.source_url !== undefined) {
      fields.push('source_url = ?');
      values.push(updateData.source_url);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await c.env.DB.prepare(
      `UPDATE reference_data SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    const updatedData = await c.env.DB.prepare(
      'SELECT * FROM reference_data WHERE id = ?'
    ).bind(id).first();

    return c.json<APIResponse>({
      success: true,
      data: updatedData,
      message: 'Reference data updated successfully'
    });

  } catch (error: any) {
    console.error('Update reference data error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to update reference data'
    }, 500);
  }
});

/**
 * DELETE /api/reference/:id - 参照データ削除
 */
reference.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const user = c.get('user');

    // データ存在確認
    const existing = await c.env.DB.prepare(
      'SELECT * FROM reference_data WHERE id = ? AND user_id = ?'
    ).bind(id, user.userId).first();

    if (!existing) {
      return c.json<APIResponse>({
        success: false,
        error: 'Reference data not found'
      }, 404);
    }

    await c.env.DB.prepare(
      'DELETE FROM reference_data WHERE id = ?'
    ).bind(id).run();

    return c.json<APIResponse>({
      success: true,
      message: 'Reference data deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete reference data error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to delete reference data'
    }, 500);
  }
});

export default reference;
