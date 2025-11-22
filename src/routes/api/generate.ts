// ===================================
// AI記事生成APIルート
// ===================================

import { Hono } from 'hono';
import type { Env, APIResponse } from '../../types';
import { authMiddleware } from '../../middleware/auth';
import { getActivePrompt } from '../../lib/db';
import { generateAIContent } from '../../lib/ai';

const generate = new Hono<{ Bindings: Env }>();

generate.use('*', authMiddleware);

/**
 * POST /api/generate/outline - 記事構成生成
 */
generate.post('/outline', async (c) => {
  try {
    const user = c.get('user');
    const { keyword, params } = await c.req.json();

    if (!keyword) {
      return c.json<APIResponse>({
        success: false,
        error: 'Keyword is required'
      }, 400);
    }

    // アクティブなプロンプト取得
    const prompt = await getActivePrompt(c.env.DB, user.userId, 'outline');
    if (!prompt) {
      return c.json<APIResponse>({
        success: false,
        error: 'No active outline prompt found. Please configure prompts in Settings.'
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

    // ユーザーのAI APIキーを取得（優先順位: OpenAI, Anthropic）
    const apiKeys = await c.env.DB.prepare(
      'SELECT provider, api_key FROM api_settings WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC'
    ).bind(user.userId).all<{ provider: string; api_key: string }>();

    let provider: 'openai' | 'anthropic' | null = null;
    let apiKey: string | null = null;

    // 優先順位でAPIキーを選択
    if (apiKeys.results && apiKeys.results.length > 0) {
      // OpenAIを優先
      const openaiKey = apiKeys.results.find(k => k.provider === 'openai');
      if (openaiKey) {
        provider = 'openai';
        apiKey = openaiKey.api_key;
      } else {
        // OpenAIがなければAnthropic
        const anthropicKey = apiKeys.results.find(k => k.provider === 'anthropic');
        if (anthropicKey) {
          provider = 'anthropic';
          apiKey = anthropicKey.api_key;
        }
      }
    }

    // フォールバック: 環境変数のAPIキー
    if (!apiKey) {
      if (c.env.OPENAI_API_KEY) {
        provider = 'openai';
        apiKey = c.env.OPENAI_API_KEY;
      } else if (c.env.ANTHROPIC_API_KEY) {
        provider = 'anthropic';
        apiKey = c.env.ANTHROPIC_API_KEY;
      }
    }

    if (!apiKey || !provider) {
      return c.json<APIResponse>({
        success: false,
        error: 'AI API key not configured. Please set your OpenAI or Anthropic API key in Settings.'
      }, 400);
    }

    const generatedText = await generateAIContent({
      provider,
      apiKey,
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
      maxTokens: 2000
    });

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
    const { keyword, outline, params } = await c.req.json();

    if (!keyword) {
      return c.json<APIResponse>({
        success: false,
        error: 'Keyword is required'
      }, 400);
    }

    // アクティブなプロンプト取得
    const prompt = await getActivePrompt(c.env.DB, user.userId, 'article_draft');
    if (!prompt) {
      return c.json<APIResponse>({
        success: false,
        error: 'No active article draft prompt found. Please configure prompts in Settings.'
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

    // ユーザーのAI APIキーを取得（優先順位: OpenAI, Anthropic）
    const apiKeys = await c.env.DB.prepare(
      'SELECT provider, api_key FROM api_settings WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC'
    ).bind(user.userId).all<{ provider: string; api_key: string }>();

    let provider: 'openai' | 'anthropic' | null = null;
    let apiKey: string | null = null;

    // 優先順位でAPIキーを選択
    if (apiKeys.results && apiKeys.results.length > 0) {
      // OpenAIを優先
      const openaiKey = apiKeys.results.find(k => k.provider === 'openai');
      if (openaiKey) {
        provider = 'openai';
        apiKey = openaiKey.api_key;
      } else {
        // OpenAIがなければAnthropic
        const anthropicKey = apiKeys.results.find(k => k.provider === 'anthropic');
        if (anthropicKey) {
          provider = 'anthropic';
          apiKey = anthropicKey.api_key;
        }
      }
    }

    // フォールバック: 環境変数のAPIキー
    if (!apiKey) {
      if (c.env.OPENAI_API_KEY) {
        provider = 'openai';
        apiKey = c.env.OPENAI_API_KEY;
      } else if (c.env.ANTHROPIC_API_KEY) {
        provider = 'anthropic';
        apiKey = c.env.ANTHROPIC_API_KEY;
      }
    }

    if (!apiKey || !provider) {
      return c.json<APIResponse>({
        success: false,
        error: 'AI API key not configured. Please set your OpenAI or Anthropic API key in Settings.'
      }, 400);
    }

    const generatedArticle = await generateAIContent({
      provider,
      apiKey,
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
      maxTokens: 4000
    });

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

    // ユーザーのAI APIキーを取得（優先順位: OpenAI, Anthropic）
    const apiKeys = await c.env.DB.prepare(
      'SELECT provider, api_key FROM api_settings WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC'
    ).bind(user.userId).all<{ provider: string; api_key: string }>();

    let provider: 'openai' | 'anthropic' | null = null;
    let apiKey: string | null = null;

    // 優先順位でAPIキーを選択
    if (apiKeys.results && apiKeys.results.length > 0) {
      // OpenAIを優先
      const openaiKey = apiKeys.results.find(k => k.provider === 'openai');
      if (openaiKey) {
        provider = 'openai';
        apiKey = openaiKey.api_key;
      } else {
        // OpenAIがなければAnthropic
        const anthropicKey = apiKeys.results.find(k => k.provider === 'anthropic');
        if (anthropicKey) {
          provider = 'anthropic';
          apiKey = anthropicKey.api_key;
        }
      }
    }

    // フォールバック: 環境変数のAPIキー
    if (!apiKey) {
      if (c.env.OPENAI_API_KEY) {
        provider = 'openai';
        apiKey = c.env.OPENAI_API_KEY;
      } else if (c.env.ANTHROPIC_API_KEY) {
        provider = 'anthropic';
        apiKey = c.env.ANTHROPIC_API_KEY;
      }
    }

    if (!apiKey || !provider) {
      return c.json<APIResponse>({
        success: false,
        error: 'AI API key not configured. Please set your OpenAI or Anthropic API key in Settings.'
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

    const rewrittenArticle = await generateAIContent({
      provider,
      apiKey,
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
      maxTokens: 4000
    });

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
