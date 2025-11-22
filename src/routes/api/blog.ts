// ===================================
// ブログ（公開記事）APIルート
// ===================================

import { Hono } from 'hono';
import type { Env, APIResponse } from '../../types';
import { authMiddleware } from '../../middleware/auth';

const blog = new Hono<{ Bindings: Env }>();

blog.use('*', authMiddleware);

/**
 * GET /api/blog/articles - 公開記事一覧取得
 */
blog.get('/articles', async (c) => {
  try {
    const user = c.get('user');

    // 公開済みの記事のみを取得
    const articles = await c.env.DB.prepare(
      `SELECT id, title, content, meta_description, target_keywords, 
              published_at, created_at, updated_at
       FROM articles 
       WHERE user_id = ? AND status = 'published'
       ORDER BY published_at DESC, created_at DESC`
    ).bind(user.userId).all();

    return c.json<APIResponse>({
      success: true,
      data: articles.results || []
    });

  } catch (error: any) {
    console.error('Get blog articles error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch blog articles'
    }, 500);
  }
});

export default blog;
