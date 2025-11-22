// ===================================
// 内部リンク管理API
// ===================================

import { Hono } from 'hono';
import type { Env } from '../../types';
import { authMiddleware, type AuthContext } from '../../middleware/auth';
import { extractHeadings, cacheArticleHeadings, getArticleHeadings } from '../../utils/markdown-headings';

const internalLinksApi = new Hono<{ Bindings: Env }>();

// 全てのルートで認証を要求
internalLinksApi.use('/*', authMiddleware);

/**
 * GET /api/internal-links - 内部リンク一覧を取得
 */
internalLinksApi.get('/', async (c) => {
  try {
    const user = c.get('user') as AuthContext;

    const links = await c.env.DB.prepare(
      `SELECT 
        il.*,
        fa.title as from_article_title,
        ta.title as to_article_title
       FROM internal_links il
       LEFT JOIN articles fa ON il.from_article_id = fa.id
       LEFT JOIN articles ta ON il.to_article_id = ta.id
       WHERE il.user_id = ?
       ORDER BY il.created_at DESC`
    ).bind(user.userId).all();

    return c.json({
      success: true,
      data: links.results || []
    });

  } catch (error: any) {
    console.error('Get internal links error:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch internal links',
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/internal-links/article/:id - 特定記事の内部リンクを取得
 */
internalLinksApi.get('/article/:id', async (c) => {
  try {
    const user = c.get('user') as AuthContext;
    const articleId = c.req.param('id');

    const links = await c.env.DB.prepare(
      `SELECT 
        il.*,
        ta.title as to_article_title
       FROM internal_links il
       LEFT JOIN articles ta ON il.to_article_id = ta.id
       WHERE il.user_id = ? AND il.from_article_id = ?
       ORDER BY il.position ASC`
    ).bind(user.userId, articleId).all();

    return c.json({
      success: true,
      data: links.results || []
    });

  } catch (error: any) {
    console.error('Get article internal links error:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch article internal links',
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/internal-links/headings/:id - 記事の見出し一覧を取得
 */
internalLinksApi.get('/headings/:id', async (c) => {
  try {
    const user = c.get('user') as AuthContext;
    const articleId = parseInt(c.req.param('id'));

    // 記事が存在し、ユーザーのものか確認
    const article = await c.env.DB.prepare(
      'SELECT id, content FROM articles WHERE id = ? AND user_id = ?'
    ).bind(articleId, user.userId).first();

    if (!article) {
      return c.json({
        success: false,
        error: 'Article not found'
      }, 404);
    }

    // キャッシュから見出しを取得
    let headings = await getArticleHeadings(articleId, c.env.DB);

    // キャッシュがない場合は抽出して保存
    if (headings.length === 0 && article.content) {
      await cacheArticleHeadings(articleId, article.content as string, c.env.DB);
      headings = await getArticleHeadings(articleId, c.env.DB);
    }

    return c.json({
      success: true,
      data: headings
    });

  } catch (error: any) {
    console.error('Get article headings error:', error);
    return c.json({
      success: false,
      error: 'Failed to fetch article headings',
      message: error.message
    }, 500);
  }
});

/**
 * POST /api/internal-links - 内部リンクを作成
 */
internalLinksApi.post('/', async (c) => {
  try {
    const user = c.get('user') as AuthContext;
    const body = await c.req.json();

    const {
      from_article_id,
      from_heading,
      from_heading_id,
      to_article_id,
      to_heading,
      to_heading_id,
      link_text,
      position = 0
    } = body;

    // 必須フィールドのバリデーション
    if (!from_article_id || !from_heading || !to_article_id) {
      return c.json({
        success: false,
        error: 'Missing required fields'
      }, 400);
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO internal_links 
       (user_id, from_article_id, from_heading, from_heading_id, 
        to_article_id, to_heading, to_heading_id, link_text, position) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      user.userId,
      from_article_id,
      from_heading,
      from_heading_id || null,
      to_article_id,
      to_heading || null,
      to_heading_id || null,
      link_text || null,
      position
    ).run();

    return c.json({
      success: true,
      data: {
        id: result.meta.last_row_id,
        ...body
      }
    });

  } catch (error: any) {
    console.error('Create internal link error:', error);
    return c.json({
      success: false,
      error: 'Failed to create internal link',
      message: error.message
    }, 500);
  }
});

/**
 * PUT /api/internal-links/:id - 内部リンクを更新（部分更新対応）
 */
internalLinksApi.put('/:id', async (c) => {
  try {
    const user = c.get('user') as AuthContext;
    const linkId = c.req.param('id');
    const body = await c.req.json();

    // 既存のリンクを取得
    const existingLink = await c.env.DB.prepare(
      'SELECT * FROM internal_links WHERE id = ? AND user_id = ?'
    ).bind(linkId, user.userId).first();

    if (!existingLink) {
      return c.json({
        success: false,
        error: 'Link not found'
      }, 404);
    }

    // 部分更新をサポート
    const updateData = {
      from_heading: body.from_heading !== undefined ? body.from_heading : existingLink.from_heading,
      from_heading_id: body.from_heading_id !== undefined ? body.from_heading_id : existingLink.from_heading_id,
      to_article_id: body.to_article_id !== undefined ? body.to_article_id : existingLink.to_article_id,
      to_heading: body.to_heading !== undefined ? body.to_heading : existingLink.to_heading,
      to_heading_id: body.to_heading_id !== undefined ? body.to_heading_id : existingLink.to_heading_id,
      link_text: body.link_text !== undefined ? body.link_text : existingLink.link_text,
      position: body.position !== undefined ? body.position : existingLink.position,
      is_active: body.is_active !== undefined ? body.is_active : existingLink.is_active
    };

    await c.env.DB.prepare(
      `UPDATE internal_links 
       SET from_heading = ?, from_heading_id = ?, 
           to_article_id = ?, to_heading = ?, to_heading_id = ?,
           link_text = ?, position = ?, is_active = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    ).bind(
      updateData.from_heading,
      updateData.from_heading_id,
      updateData.to_article_id,
      updateData.to_heading,
      updateData.to_heading_id,
      updateData.link_text,
      updateData.position,
      updateData.is_active,
      linkId,
      user.userId
    ).run();

    return c.json({
      success: true,
      data: { id: linkId, ...body }
    });

  } catch (error: any) {
    console.error('Update internal link error:', error);
    return c.json({
      success: false,
      error: 'Failed to update internal link',
      message: error.message
    }, 500);
  }
});

/**
 * DELETE /api/internal-links/:id - 内部リンクを削除
 */
internalLinksApi.delete('/:id', async (c) => {
  try {
    const user = c.get('user') as AuthContext;
    const linkId = c.req.param('id');

    await c.env.DB.prepare(
      'DELETE FROM internal_links WHERE id = ? AND user_id = ?'
    ).bind(linkId, user.userId).run();

    return c.json({
      success: true,
      message: 'Internal link deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete internal link error:', error);
    return c.json({
      success: false,
      error: 'Failed to delete internal link',
      message: error.message
    }, 500);
  }
});

/**
 * POST /api/internal-links/refresh-headings/:id - 記事の見出しキャッシュを更新
 */
internalLinksApi.post('/refresh-headings/:id', async (c) => {
  try {
    const user = c.get('user') as AuthContext;
    const articleId = parseInt(c.req.param('id'));

    // 記事を取得
    const article = await c.env.DB.prepare(
      'SELECT id, content FROM articles WHERE id = ? AND user_id = ?'
    ).bind(articleId, user.userId).first();

    if (!article) {
      return c.json({
        success: false,
        error: 'Article not found'
      }, 404);
    }

    // 見出しキャッシュを更新
    await cacheArticleHeadings(articleId, article.content as string, c.env.DB);
    const headings = await getArticleHeadings(articleId, c.env.DB);

    return c.json({
      success: true,
      data: headings
    });

  } catch (error: any) {
    console.error('Refresh headings error:', error);
    return c.json({
      success: false,
      error: 'Failed to refresh headings',
      message: error.message
    }, 500);
  }
});

export default internalLinksApi;
