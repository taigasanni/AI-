// ===================================
// 記事管理APIルート
// ===================================

import { Hono } from 'hono';
import type { Env, APIResponse } from '../../types';
import { authMiddleware } from '../../middleware/auth';
import { getArticlesByUserId, getArticleById } from '../../lib/db';

const articles = new Hono<{ Bindings: Env }>();

articles.use('*', authMiddleware);

/**
 * GET /api/articles - 記事一覧取得
 */
articles.get('/', async (c) => {
  try {
    const user = c.get('user');

    const articleList = await getArticlesByUserId(c.env.DB, user.userId);

    return c.json<APIResponse>({
      success: true,
      data: articleList
    });

  } catch (error: any) {
    console.error('Get articles error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch articles'
    }, 500);
  }
});

/**
 * GET /api/articles/:id - 記事詳細取得
 */
articles.get('/:id', async (c) => {
  try {
    const articleId = parseInt(c.req.param('id'));
    const user = c.get('user');

    const article = await getArticleById(c.env.DB, articleId);

    if (!article) {
      return c.json<APIResponse>({
        success: false,
        error: 'Article not found'
      }, 404);
    }

    // ユーザー権限チェック
    if (article.user_id !== user.userId && user.role !== 'admin') {
      return c.json<APIResponse>({
        success: false,
        error: 'Access denied'
      }, 403);
    }

    return c.json<APIResponse>({
      success: true,
      data: article
    });

  } catch (error: any) {
    console.error('Get article error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch article'
    }, 500);
  }
});

/**
 * POST /api/articles - 記事作成
 */
articles.post('/', async (c) => {
  try {
    const user = c.get('user');
    const {
      title,
      slug,
      status,
      content,
      meta_description,
      og_image_url,
      seo_title,
      target_keywords,
      keyword,
      outline
    } = await c.req.json();

    if (!title) {
      return c.json<APIResponse>({
        success: false,
        error: 'Title is required'
      }, 400);
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO articles (user_id, title, slug, status, content, meta_description, og_image_url, seo_title, target_keywords, keyword, outline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      user.userId,
      title,
      slug || null,
      status || 'draft',
      content || null,
      meta_description || null,
      og_image_url || null,
      seo_title || title,
      target_keywords || null,
      keyword || null,
      outline ? (typeof outline === 'string' ? outline : JSON.stringify(outline)) : null
    ).run();

    const newArticle = await getArticleById(c.env.DB, result.meta?.last_row_id || 0);

    return c.json<APIResponse>({
      success: true,
      data: newArticle,
      message: 'Article created successfully'
    }, 201);

  } catch (error: any) {
    console.error('Create article error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to create article'
    }, 500);
  }
});

/**
 * PUT /api/articles/:id - 記事更新
 */
articles.put('/:id', async (c) => {
  try {
    const articleId = parseInt(c.req.param('id'));
    const user = c.get('user');
    const updateData = await c.req.json();

    // 記事存在確認
    const article = await getArticleById(c.env.DB, articleId);
    if (!article) {
      return c.json<APIResponse>({
        success: false,
        error: 'Article not found'
      }, 404);
    }

    // ユーザー権限チェック
    if (article.user_id !== user.userId && user.role !== 'admin') {
      return c.json<APIResponse>({
        success: false,
        error: 'Access denied'
      }, 403);
    }

    // 更新フィールド構築
    const fields: string[] = [];
    const values: any[] = [];

    if (updateData.title !== undefined) {
      fields.push('title = ?');
      values.push(updateData.title);
    }
    if (updateData.slug !== undefined) {
      fields.push('slug = ?');
      values.push(updateData.slug);
    }
    if (updateData.status !== undefined) {
      fields.push('status = ?');
      values.push(updateData.status);
    }
    if (updateData.content !== undefined) {
      fields.push('content = ?');
      values.push(updateData.content);
    }
    if (updateData.meta_description !== undefined) {
      fields.push('meta_description = ?');
      values.push(updateData.meta_description);
    }
    if (updateData.og_image_url !== undefined) {
      fields.push('og_image_url = ?');
      values.push(updateData.og_image_url);
    }
    if (updateData.seo_title !== undefined) {
      fields.push('seo_title = ?');
      values.push(updateData.seo_title);
    }
    if (updateData.target_keywords !== undefined) {
      fields.push('target_keywords = ?');
      values.push(updateData.target_keywords);
    }
    if (updateData.keyword !== undefined) {
      fields.push('keyword = ?');
      values.push(updateData.keyword);
    }
    if (updateData.outline !== undefined) {
      fields.push('outline = ?');
      values.push(typeof updateData.outline === 'string' ? updateData.outline : JSON.stringify(updateData.outline));
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(articleId);

    await c.env.DB.prepare(
      `UPDATE articles SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    const updatedArticle = await getArticleById(c.env.DB, articleId);

    return c.json<APIResponse>({
      success: true,
      data: updatedArticle,
      message: 'Article updated successfully'
    });

  } catch (error: any) {
    console.error('Update article error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to update article'
    }, 500);
  }
});

/**
 * DELETE /api/articles/:id - 記事削除
 */
articles.delete('/:id', async (c) => {
  try {
    const articleId = parseInt(c.req.param('id'));
    const user = c.get('user');

    // 記事存在確認
    const article = await getArticleById(c.env.DB, articleId);
    if (!article) {
      return c.json<APIResponse>({
        success: false,
        error: 'Article not found'
      }, 404);
    }

    // ユーザー権限チェック
    if (article.user_id !== user.userId && user.role !== 'admin') {
      return c.json<APIResponse>({
        success: false,
        error: 'Access denied'
      }, 403);
    }

    await c.env.DB.prepare('DELETE FROM articles WHERE id = ?').bind(articleId).run();

    return c.json<APIResponse>({
      success: true,
      message: 'Article deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete article error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to delete article'
    }, 500);
  }
});

export default articles;
