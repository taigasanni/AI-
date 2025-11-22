// ===================================
// 記事管理APIルート
// ===================================

import { Hono } from 'hono';
import type { Env, APIResponse } from '../../types';
import { authMiddleware } from '../../middleware/auth';
import { getProjectById, getArticlesByProjectId, getArticleById } from '../../lib/db';

const articles = new Hono<{ Bindings: Env }>();

articles.use('*', authMiddleware);

/**
 * GET /api/articles?projectId=X - 記事一覧取得
 */
articles.get('/', async (c) => {
  try {
    const projectId = parseInt(c.req.query('projectId') || '0');
    const user = c.get('user');

    if (!projectId) {
      return c.json<APIResponse>({
        success: false,
        error: 'Project ID is required'
      }, 400);
    }

    // プロジェクトアクセス権限チェック
    const project = await getProjectById(c.env.DB, projectId);
    if (!project || (project.user_id !== user.userId && user.role !== 'admin')) {
      return c.json<APIResponse>({
        success: false,
        error: 'Access denied'
      }, 403);
    }

    const articleList = await getArticlesByProjectId(c.env.DB, projectId);

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

    // プロジェクトアクセス権限チェック
    const project = await getProjectById(c.env.DB, article.project_id);
    if (!project || (project.user_id !== user.userId && user.role !== 'admin')) {
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
      project_id,
      title,
      slug,
      status,
      content,
      meta_description,
      og_image_url
    } = await c.req.json();

    if (!project_id || !title) {
      return c.json<APIResponse>({
        success: false,
        error: 'Project ID and title are required'
      }, 400);
    }

    // プロジェクトアクセス権限チェック
    const project = await getProjectById(c.env.DB, project_id);
    if (!project || (project.user_id !== user.userId && user.role !== 'admin')) {
      return c.json<APIResponse>({
        success: false,
        error: 'Access denied'
      }, 403);
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO articles (project_id, title, slug, status, content, meta_description, og_image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      project_id,
      title,
      slug || null,
      status || 'draft',
      content || null,
      meta_description || null,
      og_image_url || null
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

    // プロジェクトアクセス権限チェック
    const project = await getProjectById(c.env.DB, article.project_id);
    if (!project || (project.user_id !== user.userId && user.role !== 'admin')) {
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

    // プロジェクトアクセス権限チェック
    const project = await getProjectById(c.env.DB, article.project_id);
    if (!project || (project.user_id !== user.userId && user.role !== 'admin')) {
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
