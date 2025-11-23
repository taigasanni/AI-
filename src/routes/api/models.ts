// ===================================
// AIモデル設定APIルート
// ===================================

import { Hono } from 'hono';
import type { Env, APIResponse } from '../../types';
import { authMiddleware } from '../../middleware/auth';

const models = new Hono<{ Bindings: Env }>();

models.use('*', authMiddleware);

// 利用可能なモデルリスト
const AVAILABLE_MODELS = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o (最新・高性能)', description: '最新で最も高性能なモデル。複雑な記事生成に最適。最大4096トークン出力' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (高速・コスパ良)', description: '高速で低コスト。日常的な記事生成に最適。最大16384トークン出力' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: '高性能でバランスの取れたモデル。最大4096トークン出力' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (最速)', description: '最も高速で低コスト。シンプルな記事向け' }
  ],
  anthropic: [
    // Claude 4.x シリーズ（最新・長文対応）
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4 (最高性能・超長文対応)', description: '最高性能。最大32Kトークン出力（約24,000文字）。超長文記事に最適' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4 (推奨・長文対応)', description: '高性能でコスパ良。最大16Kトークン出力（約12,000文字）。長文記事に最適' },
    { id: 'claude-haiku-4-20250514', name: 'Claude Haiku 4 (高速・長文対応)', description: '高速で低コスト。最大16Kトークン出力（約12,000文字）。長文記事対応' },
    
    // Claude 3.5/3.7 シリーズ（最大8Kトークン出力）
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet v2', description: '2024年10月版。最大8Kトークン出力（約6,000文字）。バランスが良い' },
    { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet v1', description: '2024年6月版。最大8Kトークン出力（約6,000文字）' },
    { id: 'claude-sonnet-3-7-20250219', name: 'Claude Sonnet 3.7', description: '最大8Kトークン出力（約6,000文字）。高性能' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: '最大8Kトークン出力（約6,000文字）。高速' },
    
    // Claude 3 シリーズ（最大4Kトークン出力）
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: '最高性能。最大4Kトークン出力（約3,000文字）' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: '最大4Kトークン出力（約3,000文字）' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (デフォルト)', description: '最も高速で低コスト。確実に動作。最大4Kトークン出力（約3,000文字）' }
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

    // デフォルト設定を再作成（Claude 3.5 Sonnet v2を推奨）
    const useCases = ['outline', 'article', 'rewrite', 'seo', 'assist'];
    for (const useCase of useCases) {
      await c.env.DB.prepare(
        'INSERT INTO model_preferences (user_id, provider, model_name, use_case) VALUES (?, ?, ?, ?)'
      ).bind(user.userId, 'anthropic', 'claude-3-5-sonnet-20241022', useCase).run();
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
