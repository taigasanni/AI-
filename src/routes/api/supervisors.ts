import { Hono } from 'hono';
import type { D1Database } from '@cloudflare/workers-types';

type Bindings = {
  DB: D1Database;
};

const supervisors = new Hono<{ Bindings: Bindings }>();

// 監修者一覧取得
supervisors.get('/', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { results } = await c.env.DB.prepare(`
      SELECT * FROM supervisors 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).bind(userId).all();

    return c.json({ supervisors: results });
  } catch (error: any) {
    console.error('Get supervisors error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// 監修者詳細取得
supervisors.get('/:id', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    const supervisorId = c.req.param('id');
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supervisor = await c.env.DB.prepare(`
      SELECT * FROM supervisors 
      WHERE id = ? AND user_id = ?
    `).bind(supervisorId, userId).first();

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
    const userId = c.req.header('X-User-Id');
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { name, title, description, avatar_url, website_url, twitter_url, linkedin_url } = await c.req.json();

    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO supervisors (user_id, name, title, description, avatar_url, website_url, twitter_url, linkedin_url, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(
      userId,
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
    const userId = c.req.header('X-User-Id');
    const supervisorId = c.req.param('id');
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { name, title, description, avatar_url, website_url, twitter_url, linkedin_url, is_active } = await c.req.json();

    // 監修者が存在するか確認
    const existing = await c.env.DB.prepare(`
      SELECT * FROM supervisors WHERE id = ? AND user_id = ?
    `).bind(supervisorId, userId).first();

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
      userId
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
    const userId = c.req.header('X-User-Id');
    const supervisorId = c.req.param('id');
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // 監修者が存在するか確認
    const existing = await c.env.DB.prepare(`
      SELECT * FROM supervisors WHERE id = ? AND user_id = ?
    `).bind(supervisorId, userId).first();

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
    `).bind(supervisorId, userId).run();

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Delete supervisor error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// 記事に監修者を設定
supervisors.post('/article/:articleId', async (c) => {
  try {
    const userId = c.req.header('X-User-Id');
    const articleId = c.req.param('articleId');
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { supervisor_id } = await c.req.json();

    if (!supervisor_id) {
      return c.json({ error: 'Supervisor ID is required' }, 400);
    }

    // 記事が存在するか確認
    const article = await c.env.DB.prepare(`
      SELECT * FROM articles WHERE id = ? AND user_id = ?
    `).bind(articleId, userId).first();

    if (!article) {
      return c.json({ error: 'Article not found' }, 404);
    }

    // 監修者が存在するか確認
    const supervisor = await c.env.DB.prepare(`
      SELECT * FROM supervisors WHERE id = ? AND user_id = ?
    `).bind(supervisor_id, userId).first();

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
    const userId = c.req.header('X-User-Id');
    const articleId = c.req.param('articleId');
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // 記事が存在するか確認
    const article = await c.env.DB.prepare(`
      SELECT * FROM articles WHERE id = ? AND user_id = ?
    `).bind(articleId, userId).first();

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
