// ===================================
// API設定管理ルート
// ===================================

import { Hono } from 'hono';
import type { Env, APIResponse } from '../../types';
import { authMiddleware } from '../../middleware/auth';

const settings = new Hono<{ Bindings: Env }>();

settings.use('*', authMiddleware);

/**
 * GET /api/settings/api-keys - APIキー一覧取得 (マスク表示)
 */
settings.get('/api-keys', async (c) => {
  try {
    const user = c.get('user');
    
    const result = await c.env.DB.prepare(
      'SELECT id, provider, is_active, created_at, updated_at FROM api_settings WHERE user_id = ?'
    ).bind(user.userId).all();

    const keys = result.results || [];
    
    // APIキーの先頭と末尾だけを表示
    const maskedKeys = keys.map((key: any) => ({
      ...key,
      has_key: true
    }));

    return c.json<APIResponse>({
      success: true,
      data: maskedKeys
    });

  } catch (error: any) {
    console.error('Get API keys error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to fetch API keys'
    }, 500);
  }
});

/**
 * POST /api/settings/api-keys - APIキー保存/更新
 */
settings.post('/api-keys', async (c) => {
  try {
    const user = c.get('user');
    const { provider, api_key } = await c.req.json();

    // バリデーション
    if (!provider || !api_key) {
      return c.json<APIResponse>({
        success: false,
        error: 'Provider and API key are required'
      }, 400);
    }

    if (!['openai', 'anthropic'].includes(provider)) {
      return c.json<APIResponse>({
        success: false,
        error: 'Invalid provider. Must be "openai" or "anthropic"'
      }, 400);
    }

    // 簡易バリデーション
    if (provider === 'openai' && !api_key.startsWith('sk-')) {
      return c.json<APIResponse>({
        success: false,
        error: 'Invalid OpenAI API key format. Should start with "sk-"'
      }, 400);
    }

    // 既存のキーを確認
    const existing = await c.env.DB.prepare(
      'SELECT id FROM api_settings WHERE user_id = ? AND provider = ?'
    ).bind(user.userId, provider).first();

    if (existing) {
      // 更新
      await c.env.DB.prepare(
        'UPDATE api_settings SET api_key = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND provider = ?'
      ).bind(api_key, user.userId, provider).run();
    } else {
      // 新規作成
      await c.env.DB.prepare(
        'INSERT INTO api_settings (user_id, provider, api_key) VALUES (?, ?, ?)'
      ).bind(user.userId, provider, api_key).run();
    }

    return c.json<APIResponse>({
      success: true,
      message: 'API key saved successfully'
    });

  } catch (error: any) {
    console.error('Save API key error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to save API key'
    }, 500);
  }
});

/**
 * DELETE /api/settings/api-keys/:provider - APIキー削除
 */
settings.delete('/api-keys/:provider', async (c) => {
  try {
    const user = c.get('user');
    const provider = c.req.param('provider');

    await c.env.DB.prepare(
      'DELETE FROM api_settings WHERE user_id = ? AND provider = ?'
    ).bind(user.userId, provider).run();

    return c.json<APIResponse>({
      success: true,
      message: 'API key deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete API key error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to delete API key'
    }, 500);
  }
});

/**
 * GET /api/settings/api-keys/:provider/test - APIキーのテスト
 */
settings.get('/api-keys/:provider/test', async (c) => {
  try {
    const user = c.get('user');
    const provider = c.req.param('provider');

    // ユーザーのAPIキーを取得
    const result = await c.env.DB.prepare(
      'SELECT api_key FROM api_settings WHERE user_id = ? AND provider = ? AND is_active = 1'
    ).bind(user.userId, provider).first<{ api_key: string }>();

    if (!result) {
      return c.json<APIResponse>({
        success: false,
        error: 'API key not found'
      }, 404);
    }

    // OpenAI APIのテスト
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${result.api_key}`
        }
      });

      if (response.ok) {
        return c.json<APIResponse>({
          success: true,
          message: 'OpenAI API key is valid'
        });
      } else {
        return c.json<APIResponse>({
          success: false,
          error: 'OpenAI API key is invalid'
        }, 400);
      }
    }

    // Anthropic APIのテスト
    if (provider === 'anthropic') {
      // Anthropic APIは単純なエンドポイントがないため、簡易チェック
      if (result.api_key.startsWith('sk-ant-')) {
        return c.json<APIResponse>({
          success: true,
          message: 'Anthropic API key format is valid'
        });
      } else {
        return c.json<APIResponse>({
          success: false,
          error: 'Anthropic API key format is invalid'
        }, 400);
      }
    }

    return c.json<APIResponse>({
      success: false,
      error: 'Unknown provider'
    }, 400);

  } catch (error: any) {
    console.error('Test API key error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to test API key'
    }, 500);
  }
});

export default settings;
