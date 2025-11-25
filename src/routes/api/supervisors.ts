import { Hono } from 'hono';
import type { Env, APIResponse } from '../../types';
import { authMiddleware } from '../../middleware/auth';

const supervisors = new Hono<{ Bindings: Env }>();

// 認証ミドルウェアを適用（公開エンドポイント以外）
// 公開エンドポイント: GET /article/:articleId は認証不要
supervisors.use('*', async (c, next) => {
  // 記事の監修者取得は認証不要（公開ページからアクセスするため）
  if (c.req.method === 'GET' && c.req.path.match(/\/article\/\d+$/)) {
    return next();
  }
  // その他のエンドポイントは認証必須
  return authMiddleware(c, next);
});

// 監修者一覧取得
supervisors.get('/', async (c) => {
  try {
    const user = c.get('user');

    const { results } = await c.env.DB.prepare(`
      SELECT * FROM supervisors 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).bind(user.userId).all();

    return c.json({ supervisors: results });
  } catch (error: any) {
    console.error('Get supervisors error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// 監修者詳細取得
supervisors.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    const supervisorId = c.req.param('id');

    const supervisor = await c.env.DB.prepare(`
      SELECT * FROM supervisors 
      WHERE id = ? AND user_id = ?
    `).bind(supervisorId, user.userId).first();

    if (!supervisor) {
      return c.json({ error: 'Supervisor not found' }, 404);
    }

    return c.json({ supervisor });
  } catch (error: any) {
    console.error('Get supervisor error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// 監修者作成
supervisors.post('/', async (c) => {
  try {
    const user = c.get('user');

    const { name, title, description, avatar_url, website_url, twitter_url, linkedin_url } = await c.req.json();

    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO supervisors (user_id, name, title, description, avatar_url, website_url, twitter_url, linkedin_url, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      user.userId,
      name,
      title || null,
      description || null,
      avatar_url || null,
      website_url || null,
      twitter_url || null,
      linkedin_url || null
    ).run();

    const newSupervisor = await c.env.DB.prepare(`
      SELECT * FROM supervisors WHERE id = ?
    `).bind(result.meta.last_row_id).first();

    return c.json({ supervisor: newSupervisor }, 201);
  } catch (error: any) {
    console.error('Create supervisor error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// 監修者更新
supervisors.put('/:id', async (c) => {
  try {
    const user = c.get('user');
    const supervisorId = c.req.param('id');

    const { name, title, description, avatar_url, website_url, twitter_url, linkedin_url, is_active } = await c.req.json();

    // 監修者が存在するか確認
    const existing = await c.env.DB.prepare(`
      SELECT * FROM supervisors WHERE id = ? AND user_id = ?
    `).bind(supervisorId, user.userId).first();

    if (!existing) {
      return c.json({ error: 'Supervisor not found' }, 404);
    }

    await c.env.DB.prepare(`
      UPDATE supervisors 
      SET name = ?, 
          title = ?, 
          description = ?, 
          avatar_url = ?, 
          website_url = ?, 
          twitter_url = ?, 
          linkedin_url = ?,
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).bind(
      name,
      title || null,
      description || null,
      avatar_url || null,
      website_url || null,
      twitter_url || null,
      linkedin_url || null,
      is_active !== undefined ? is_active : 1,
      supervisorId,
      user.userId
    ).run();

    const updated = await c.env.DB.prepare(`
      SELECT * FROM supervisors WHERE id = ?
    `).bind(supervisorId).first();

    return c.json({ supervisor: updated });
  } catch (error: any) {
    console.error('Update supervisor error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// 監修者削除
supervisors.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    const supervisorId = c.req.param('id');

    // 監修者が存在するか確認
    const existing = await c.env.DB.prepare(`
      SELECT * FROM supervisors WHERE id = ? AND user_id = ?
    `).bind(supervisorId, user.userId).first();

    if (!existing) {
      return c.json({ error: 'Supervisor not found' }, 404);
    }

    // 関連付けられた記事を削除
    await c.env.DB.prepare(`
      DELETE FROM article_supervisors WHERE supervisor_id = ?
    `).bind(supervisorId).run();

    // 監修者を削除
    await c.env.DB.prepare(`
      DELETE FROM supervisors WHERE id = ? AND user_id = ?
    `).bind(supervisorId, user.userId).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Delete supervisor error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// 記事に監修者を設定
supervisors.post('/article/:articleId', async (c) => {
  try {
    const user = c.get('user');
    const articleId = c.req.param('articleId');

    const { supervisor_id } = await c.req.json();

    if (!supervisor_id) {
      return c.json({ error: 'Supervisor ID is required' }, 400);
    }

    // 記事が存在するか確認
    const article = await c.env.DB.prepare(`
      SELECT * FROM articles WHERE id = ? AND user_id = ?
    `).bind(articleId, user.userId).first();

    if (!article) {
      return c.json({ error: 'Article not found' }, 404);
    }

    // 監修者が存在するか確認
    const supervisor = await c.env.DB.prepare(`
      SELECT * FROM supervisors WHERE id = ? AND user_id = ?
    `).bind(supervisor_id, user.userId).first();

    if (!supervisor) {
      return c.json({ error: 'Supervisor not found' }, 404);
    }

    // 既存の関連付けを削除
    await c.env.DB.prepare(`
      DELETE FROM article_supervisors WHERE article_id = ?
    `).bind(articleId).run();

    // 新しい関連付けを作成
    await c.env.DB.prepare(`
      INSERT INTO article_supervisors (article_id, supervisor_id)
      VALUES (?, ?)
    `).bind(articleId, supervisor_id).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Set article supervisor error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// 記事の監修者を削除
supervisors.delete('/article/:articleId', async (c) => {
  try {
    const user = c.get('user');
    const articleId = c.req.param('articleId');

    // 記事が存在するか確認
    const article = await c.env.DB.prepare(`
      SELECT * FROM articles WHERE id = ? AND user_id = ?
    `).bind(articleId, user.userId).first();

    if (!article) {
      return c.json({ error: 'Article not found' }, 404);
    }

    // 関連付けを削除
    await c.env.DB.prepare(`
      DELETE FROM article_supervisors WHERE article_id = ?
    `).bind(articleId).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Remove article supervisor error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// 記事の監修者を取得
supervisors.get('/article/:articleId', async (c) => {
  try {
    const articleId = c.req.param('articleId');

    const supervisor = await c.env.DB.prepare(`
      SELECT s.* FROM supervisors s
      INNER JOIN article_supervisors a_s ON s.id = a_s.supervisor_id
      WHERE a_s.article_id = ? AND s.is_active = 1
      LIMIT 1
    `).bind(articleId).first();

    return c.json({ supervisor: supervisor || null });
  } catch (error: any) {
    console.error('Get article supervisor error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default supervisors;
