// ===================================
// AIモデル設定APIルート
// ===================================

import { Hono } from 'hono';
import type { Env, APIResponse } from '../../types';
import { authMiddleware } from '../../middleware/auth';

const models = new Hono<{ Bindings: Env }>();

models.use('*', authMiddleware);

// 利用可能なモデルリスト
// 注: Claude 3.5 SonnetとClaude 3 Sonnetは一部のアカウントでのみ利用可能
const AVAILABLE_MODELS = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o (最新・高性能)', description: '最新で最も高性能なモデル。複雑な記事生成に最適' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (高速・コスパ良)', description: '高速で低コスト。日常的な記事生成に最適' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: '高性能でバランスの取れたモデル' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (最速)', description: '最も高速で低コスト。シンプルな記事向け' }
  ],
  anthropic: [
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (最高性能・推奨)', description: '最も高性能。長文記事や複雑な内容に最適。このAPIキーで利用可能' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (高速・低コスト)', description: '最も高速で低コスト。シンプルな記事向け。確実に動作' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet v2 (最新・要確認)', description: '2024年10月版。一部アカウントでのみ利用可能' },
    { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet v1 (要確認)', description: '2024年6月版。一部アカウントでのみ利用可能' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet (要確認)', description: '一部アカウントでのみ利用可能' }
  ]
};

/**
 * GET /api/models/available - 利用可能なモデル一覧取得
 */
models.get('/available', async (c) => {
  return c.json<APIResponse>({
    success: true,
    data: AVAILABLE_MODELS
  });
});

/**
 * GET /api/models/preferences - ユーザーのモデル設定取得
 */
models.get('/preferences', async (c) => {
  try {
    const user = c.get('user');

    const preferences = await c.env.DB.prepare(
      'SELECT * FROM model_preferences WHERE user_id = ? ORDER BY use_case'
    ).bind(user.userId).all();

    return c.json<APIResponse>({
      success: true,
      data: preferences.results || []
    });

  } catch (error: any) {
    console.error('Get model preferences error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch model preferences'
    }, 500);
  }
});

/**
 * PUT /api/models/preferences - モデル設定更新
 */
models.put('/preferences', async (c) => {
  try {
    const user = c.get('user');
    const { use_case, provider, model_name } = await c.req.json();

    if (!use_case || !provider || !model_name) {
      return c.json<APIResponse>({
        success: false,
        error: 'use_case, provider, and model_name are required'
      }, 400);
    }

    // 既存設定を確認
    const existing = await c.env.DB.prepare(
      'SELECT * FROM model_preferences WHERE user_id = ? AND use_case = ?'
    ).bind(user.userId, use_case).first();

    if (existing) {
      // 更新
      await c.env.DB.prepare(
        'UPDATE model_preferences SET provider = ?, model_name = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND use_case = ?'
      ).bind(provider, model_name, user.userId, use_case).run();
    } else {
      // 新規作成
      await c.env.DB.prepare(
        'INSERT INTO model_preferences (user_id, provider, model_name, use_case) VALUES (?, ?, ?, ?)'
      ).bind(user.userId, provider, model_name, use_case).run();
    }

    const updated = await c.env.DB.prepare(
      'SELECT * FROM model_preferences WHERE user_id = ? AND use_case = ?'
    ).bind(user.userId, use_case).first();

    return c.json<APIResponse>({
      success: true,
      data: updated,
      message: 'Model preference updated successfully'
    });

  } catch (error: any) {
    console.error('Update model preference error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to update model preference'
    }, 500);
  }
});

/**
 * POST /api/models/preferences/reset - モデル設定をデフォルトに戻す
 */
models.post('/preferences/reset', async (c) => {
  try {
    const user = c.get('user');

    // 全設定を削除
    await c.env.DB.prepare(
      'DELETE FROM model_preferences WHERE user_id = ?'
    ).bind(user.userId).run();

    // デフォルト設定を再作成
    const useCases = ['outline', 'article', 'rewrite', 'seo', 'assist'];
    for (const useCase of useCases) {
      await c.env.DB.prepare(
        'INSERT INTO model_preferences (user_id, provider, model_name, use_case) VALUES (?, ?, ?, ?)'
      ).bind(user.userId, 'anthropic', 'claude-3-haiku-20240307', useCase).run();
    }

    return c.json<APIResponse>({
      success: true,
      message: 'Model preferences reset to default'
    });

  } catch (error: any) {
    console.error('Reset model preferences error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to reset model preferences'
    }, 500);
  }
});

export default models;
