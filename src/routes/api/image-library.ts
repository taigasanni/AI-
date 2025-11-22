// ===================================
// 画像ライブラリAPI
// Image Library API
// ===================================

import { Hono } from 'hono';
import type { Env } from '../../types';

const imageLibraryApi = new Hono<{ Bindings: Env }>();

/**
 * GET /api/image-library - 画像ライブラリ一覧を取得
 */
imageLibraryApi.get('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const images = await c.env.DB.prepare(
      `SELECT * FROM image_library ORDER BY created_at DESC`
    ).all();

    return c.json({
      success: true,
      data: images.results || []
    });

  } catch (error: any) {
    console.error('Get images error:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch images',
      message: error.message
    }, 500);
  }
});

/**
 * POST /api/image-library - 画像を追加
 */
imageLibraryApi.post('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const userId = 1; // 仮のユーザーID
    const body = await c.req.json();
    const { image_name, image_url, alt_text, width, height, file_size, mime_type } = body;

    if (!image_name || !image_url) {
      return c.json({
        success: false,
        error: 'Image name and URL are required'
      }, 400);
    }

    // 画像を挿入
    const result = await c.env.DB.prepare(
      `INSERT INTO image_library (user_id, image_name, image_url, alt_text, width, height, file_size, mime_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(userId, image_name, image_url, alt_text, width, height, file_size, mime_type).run();

    return c.json({
      success: true,
      data: {
        id: result.meta.last_row_id,
        image_name,
        image_url,
        alt_text
      }
    });

  } catch (error: any) {
    console.error('Add image error:', error);
    return c.json({
      success: false,
      error: 'Failed to add image',
      message: error.message
    }, 500);
  }
});

/**
 * PUT /api/image-library/:id - 画像情報を更新
 */
imageLibraryApi.put('/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const imageId = c.req.param('id');
    const body = await c.req.json();
    const { image_name, alt_text } = body;

    await c.env.DB.prepare(
      `UPDATE image_library 
       SET image_name = ?, alt_text = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(image_name, alt_text, imageId).run();

    return c.json({
      success: true,
      message: 'Image updated successfully'
    });

  } catch (error: any) {
    console.error('Update image error:', error);
    return c.json({
      success: false,
      error: 'Failed to update image',
      message: error.message
    }, 500);
  }
});

/**
 * DELETE /api/image-library/:id - 画像を削除
 */
imageLibraryApi.delete('/:id', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const imageId = c.req.param('id');

    await c.env.DB.prepare(
      `DELETE FROM image_library WHERE id = ?`
    ).bind(imageId).run();

    return c.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete image error:', error);
    return c.json({
      success: false,
      error: 'Failed to delete image',
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/image-library/headings - 見出しとその画像マッピングを取得
 */
imageLibraryApi.get('/headings', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const mappings = await c.env.DB.prepare(
      `SELECT hi.*, il.image_url, il.alt_text, il.width, il.height
       FROM heading_images hi
       JOIN image_library il ON hi.image_name = il.image_name
       ORDER BY hi.created_at DESC`
    ).all();

    return c.json({
      success: true,
      data: mappings.results || []
    });

  } catch (error: any) {
    console.error('Get heading mappings error:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch heading mappings',
      message: error.message
    }, 500);
  }
});

/**
 * POST /api/image-library/headings - 見出しと画像を紐付け
 */
imageLibraryApi.post('/headings', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { heading_text, image_name } = body;

    if (!heading_text || !image_name) {
      return c.json({
        success: false,
        error: 'Heading text and image name are required'
      }, 400);
    }

    // 既存の紐付けがあれば更新、なければ挿入
    await c.env.DB.prepare(
      `INSERT INTO heading_images (heading_text, image_name)
       VALUES (?, ?)
       ON CONFLICT(heading_text) DO UPDATE SET image_name = ?, created_at = CURRENT_TIMESTAMP`
    ).bind(heading_text, image_name, image_name).run();

    return c.json({
      success: true,
      message: 'Heading image mapping created successfully'
    });

  } catch (error: any) {
    console.error('Create heading mapping error:', error);
    return c.json({
      success: false,
      error: 'Failed to create heading mapping',
      message: error.message
    }, 500);
  }
});

/**
 * DELETE /api/image-library/headings/:heading - 見出しの画像紐付けを削除
 */
imageLibraryApi.delete('/headings/:heading', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const headingText = decodeURIComponent(c.req.param('heading'));

    await c.env.DB.prepare(
      `DELETE FROM heading_images WHERE heading_text = ?`
    ).bind(headingText).run();

    return c.json({
      success: true,
      message: 'Heading image mapping deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete heading mapping error:', error);
    return c.json({
      success: false,
      error: 'Failed to delete heading mapping',
      message: error.message
    }, 500);
  }
});

export default imageLibraryApi;
