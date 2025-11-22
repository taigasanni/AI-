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

    // OpenAI API呼び出し
    if (!c.env.OPENAI_API_KEY) {
      return c.json<APIResponse>({
        success: false,
        error: 'OpenAI API key not configured'
      }, 500);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`
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

    // OpenAI API呼び出し
    if (!c.env.OPENAI_API_KEY) {
      return c.json<APIResponse>({
        success: false,
        error: 'OpenAI API key not configured'
      }, 500);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`
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

export default generate;
