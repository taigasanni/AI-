// ===================================
// AI記事生成APIルート
// ===================================

import { Hono } from 'hono';
import type { Env, APIResponse } from '../../types';
import { authMiddleware } from '../../middleware/auth';
import { getProjectById, getActivePrompt } from '../../lib/db';

const generate = new Hono<{ Bindings: Env }>();

generate.use('*', authMiddleware);

/**
 * POST /api/generate/outline - 記事構成生成
 */
generate.post('/outline', async (c) => {
  try {
    const user = c.get('user');
    const { project_id, keyword, params } = await c.req.json();

    if (!project_id || !keyword) {
      return c.json<APIResponse>({
        success: false,
        error: 'Project ID and keyword are required'
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

    // アクティブなプロンプト取得
    const prompt = await getActivePrompt(c.env.DB, project_id, 'outline');
    if (!prompt) {
      return c.json<APIResponse>({
        success: false,
        error: 'No active outline prompt found for this project'
      }, 400);
    }

    // プロンプトパラメータのマージ
    const defaultParams = prompt.params ? JSON.parse(prompt.params) : {};
    const mergedParams = { ...defaultParams, ...params };

    // プロンプトテンプレートに変数を埋め込み
    let finalPrompt = prompt.body
      .replace(/\{\{keyword\}\}/g, keyword)
      .replace(/\{\{max_chars\}\}/g, mergedParams.max_chars || '3000')
      .replace(/\{\{tone\}\}/g, mergedParams.tone || 'professional');

    // ユーザーのOpenAI APIキーを取得
    const apiKeyResult = await c.env.DB.prepare(
      'SELECT api_key FROM api_settings WHERE user_id = ? AND provider = ? AND is_active = 1'
    ).bind(user.userId, 'openai').first<{ api_key: string }>();

    // フォールバック: 環境変数のAPIキー
    const apiKey = apiKeyResult?.api_key || c.env.OPENAI_API_KEY;

    if (!apiKey) {
      return c.json<APIResponse>({
        success: false,
        error: 'OpenAI API key not configured. Please set your API key in Settings.'
      }, 400);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional content planner specializing in SEO.'
          },
          {
            role: 'user',
            content: finalPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return c.json<APIResponse>({
        success: false,
        error: 'Failed to generate outline'
      }, 500);
    }

    const data = await response.json();
    const generatedText = data.choices[0]?.message?.content || '';

    // JSON形式で返却を試みる
    let parsedOutline;
    try {
      parsedOutline = JSON.parse(generatedText);
    } catch (e) {
      parsedOutline = { raw_text: generatedText };
    }

    return c.json<APIResponse>({
      success: true,
      data: {
        outline: parsedOutline,
        prompt_used: {
          type: prompt.type,
          version: prompt.version,
          name: prompt.name
        }
      }
    });

  } catch (error: any) {
    console.error('Generate outline error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to generate outline'
    }, 500);
  }
});

/**
 * POST /api/generate/article - 記事本文生成
 */
generate.post('/article', async (c) => {
  try {
    const user = c.get('user');
    const { project_id, keyword, outline, params } = await c.req.json();

    if (!project_id || !keyword) {
      return c.json<APIResponse>({
        success: false,
        error: 'Project ID and keyword are required'
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

    // アクティブなプロンプト取得
    const prompt = await getActivePrompt(c.env.DB, project_id, 'article_draft');
    if (!prompt) {
      return c.json<APIResponse>({
        success: false,
        error: 'No active article draft prompt found for this project'
      }, 400);
    }

    // プロンプトパラメータのマージ
    const defaultParams = prompt.params ? JSON.parse(prompt.params) : {};
    const mergedParams = { ...defaultParams, ...params };

    // アウトラインを文字列化
    const outlineStr = typeof outline === 'string' 
      ? outline 
      : JSON.stringify(outline, null, 2);

    // プロンプトテンプレートに変数を埋め込み
    let finalPrompt = prompt.body
      .replace(/\{\{keyword\}\}/g, keyword)
      .replace(/\{\{outline\}\}/g, outlineStr)
      .replace(/\{\{max_chars\}\}/g, mergedParams.max_chars || '3000')
      .replace(/\{\{tone\}\}/g, mergedParams.tone || 'professional');

    // ユーザーのOpenAI APIキーを取得
    const apiKeyResult = await c.env.DB.prepare(
      'SELECT api_key FROM api_settings WHERE user_id = ? AND provider = ? AND is_active = 1'
    ).bind(user.userId, 'openai').first<{ api_key: string }>();

    // フォールバック: 環境変数のAPIキー
    const apiKey = apiKeyResult?.api_key || c.env.OPENAI_API_KEY;

    if (!apiKey) {
      return c.json<APIResponse>({
        success: false,
        error: 'OpenAI API key not configured. Please set your API key in Settings.'
      }, 400);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional web content writer specializing in SEO articles.'
          },
          {
            role: 'user',
            content: finalPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return c.json<APIResponse>({
        success: false,
        error: 'Failed to generate article'
      }, 500);
    }

    const data = await response.json();
    const generatedArticle = data.choices[0]?.message?.content || '';

    return c.json<APIResponse>({
      success: true,
      data: {
        content: generatedArticle,
        prompt_used: {
          type: prompt.type,
          version: prompt.version,
          name: prompt.name
        }
      }
    });

  } catch (error: any) {
    console.error('Generate article error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to generate article'
    }, 500);
  }
});

/**
 * POST /api/generate/rewrite - 記事リライト
 */
generate.post('/rewrite', async (c) => {
  try {
    const user = c.get('user');
    const { keyword, original_content, instructions } = await c.req.json();

    if (!original_content) {
      return c.json<APIResponse>({
        success: false,
        error: 'Original content is required'
      }, 400);
    }

    // ユーザーのOpenAI APIキーを取得
    const apiKeyResult = await c.env.DB.prepare(
      'SELECT api_key FROM api_settings WHERE user_id = ? AND provider = ? AND is_active = 1'
    ).bind(user.userId, 'openai').first<{ api_key: string }>();

    // フォールバック: 環境変数のAPIキー
    const apiKey = apiKeyResult?.api_key || c.env.OPENAI_API_KEY;

    if (!apiKey) {
      return c.json<APIResponse>({
        success: false,
        error: 'OpenAI API key not configured. Please set your API key in Settings.'
      }, 400);
    }

    // リライトプロンプト
    const rewritePrompt = `あなたはプロのWebライター・編集者です。
以下の記事をより読みやすく、SEOに最適化された内容にリライトしてください。

${keyword ? `キーワード: ${keyword}` : ''}

${instructions ? `リライト指示: ${instructions}` : ''}

元の記事:
${original_content}

要件:
- 元の記事の主要なポイントと情報は保持する
- より読みやすく、魅力的な文章に改善
- SEOを意識しつつ、自然な文章にする
- 文章構造を改善し、段落を最適化
- Markdown形式で出力

リライト後の記事:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional web content editor and SEO specialist.'
          },
          {
            role: 'user',
            content: rewritePrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return c.json<APIResponse>({
        success: false,
        error: 'Failed to rewrite article'
      }, 500);
    }

    const data = await response.json();
    const rewrittenArticle = data.choices[0]?.message?.content || '';

    return c.json<APIResponse>({
      success: true,
      data: {
        content: rewrittenArticle
      }
    });

  } catch (error: any) {
    console.error('Rewrite error:', error);
    return c.json<APIResponse>({
      success: false,
      error: 'Failed to rewrite article'
    }, 500);
  }
});

export default generate;
