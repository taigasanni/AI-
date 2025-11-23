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

// ヘルパー: 装飾テンプレートを取得
async function getDecorationTemplate(db: D1Database, userId: number): Promise<string> {
  const template = await db.prepare(
    'SELECT template_content FROM decoration_templates WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1'
  ).bind(userId).first<{ template_content: string }>();
  
  return template?.template_content || '';
}

// ヘルパー: ユーザーのAI設定を取得
async function getUserAIConfig(db: D1Database, userId: number, envVars: any, useCase: string = 'article') {
  // ユーザーのモデル設定を取得
  const modelPref = await db.prepare(
    'SELECT provider, model_name FROM model_preferences WHERE user_id = ? AND use_case = ? AND is_active = 1'
  ).bind(userId, useCase).first<{ provider: string; model_name: string }>();

  // ユーザーのAPIキーを取得
  const apiKeys = await db.prepare(
    'SELECT provider, api_key FROM api_settings WHERE user_id = ? AND is_active = 1'
  ).bind(userId).all<{ provider: string; api_key: string }>();

  let provider: 'openai' | 'anthropic' | null = null;
  let apiKey: string | null = null;
  let modelName: string | null = null;

  // モデル設定がある場合、そのプロバイダーのAPIキーを使用
  if (modelPref) {
    provider = modelPref.provider as 'openai' | 'anthropic';
    modelName = modelPref.model_name;
    
    const matchingKey = apiKeys.results?.find(k => k.provider === provider);
    if (matchingKey) {
      apiKey = matchingKey.api_key;
    }
  }

  // モデル設定がないか、APIキーが見つからない場合は、利用可能なAPIキーを使用
  if (!apiKey && apiKeys.results && apiKeys.results.length > 0) {
    const openaiKey = apiKeys.results.find(k => k.provider === 'openai');
    if (openaiKey) {
      provider = 'openai';
      apiKey = openaiKey.api_key;
      modelName = 'gpt-4o-mini'; // デフォルト
    } else {
      const anthropicKey = apiKeys.results.find(k => k.provider === 'anthropic');
      if (anthropicKey) {
        provider = 'anthropic';
        apiKey = anthropicKey.api_key;
        modelName = 'claude-3-haiku-20240307'; // デフォルト
      }
    }
  }

  // フォールバック: 環境変数
  if (!apiKey) {
    if (envVars.OPENAI_API_KEY) {
      provider = 'openai';
      apiKey = envVars.OPENAI_API_KEY;
      modelName = modelName || 'gpt-4o-mini';
    } else if (envVars.ANTHROPIC_API_KEY) {
      provider = 'anthropic';
      apiKey = envVars.ANTHROPIC_API_KEY;
      modelName = modelName || 'claude-3-haiku-20240307';
    }
  }

  return { provider, apiKey, modelName };
}

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

    // 文字数目標を取得
    const targetChars = mergedParams.max_chars || '3000';

    // プロンプトテンプレートに変数を埋め込み
    let finalPrompt = prompt.body
      .replace(/\{\{keyword\}\}/g, keyword)
      .replace(/\{\{max_chars\}\}/g, targetChars)
      .replace(/\{\{tone\}\}/g, mergedParams.tone || 'professional');

    // アウトラインに文字数目標を明示
    finalPrompt += `

## 文字数目標

最終的な記事の目標文字数: ${targetChars}文字

この文字数を達成できる、十分に詳細な構成を作成してください。
各セクションに具体的な内容と十分なボリュームを確保してください。`;

    // ユーザーのAI設定を取得
    const { provider, apiKey, modelName } = await getUserAIConfig(c.env.DB, user.userId, c.env, 'outline');

    if (!apiKey || !provider) {
      return c.json<APIResponse>({
        success: false,
        error: 'AI API key not configured. Please set your OpenAI or Anthropic API key in Settings.'
      }, 400);
    }

    console.log(`Using AI provider: ${provider}, model: ${modelName}`);

    const generatedText = await generateAIContent({
      provider,
      apiKey,
      model: modelName || undefined,
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
      error: error.message || 'Failed to generate outline'
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

    // 装飾テンプレートを取得
    const decorationTemplate = await getDecorationTemplate(c.env.DB, user.userId);

    // 文字数目標を取得
    const targetChars = mergedParams.max_chars || '3000';
    const minChars = Math.floor(parseInt(targetChars) * 0.9); // 目標の90%
    const maxChars = Math.floor(parseInt(targetChars) * 1.1); // 目標の110%

    // プロンプトテンプレートに変数を埋め込み
    let finalPrompt = prompt.body
      .replace(/\{\{keyword\}\}/g, keyword)
      .replace(/\{\{outline\}\}/g, outlineStr)
      .replace(/\{\{max_chars\}\}/g, targetChars)
      .replace(/\{\{tone\}\}/g, mergedParams.tone || 'professional');

    // 文字数厳守の強い指示を追加
    finalPrompt += `

## 重要: 文字数制約

以下の文字数制約を厳格に守ってください:

文字数要件:
- 目標文字数: ${targetChars}文字
- 最小文字数: ${minChars}文字（これ以下は不可）
- 最大文字数: ${maxChars}文字（これ以上は不可）
- 許容範囲: ${targetChars}文字の±10%

重要な注意事項:
1. 記事の文字数が${minChars}文字未満の場合は、以下を追加してください:
   - 各セクションに具体例や詳細説明を追加
   - 実践的なアドバイスやTipsを追加
   - FAQセクションを追加
   - まとめセクションを充実させる

2. 文字数を水増しするのではなく、価値ある情報を追加してください

3. 文字数が不足している場合は、より詳しい説明や追加情報で補ってください`;

    // 装飾テンプレートが存在する場合は追加
    if (decorationTemplate) {
      finalPrompt += '\n\n## 記事装飾ルール\n\n以下の装飾ルールに従って、視覚的に魅力的で読みやすい記事を作成してください：\n\n' + decorationTemplate;
    }

    // ユーザーのAI設定を取得
    const { provider, apiKey, modelName } = await getUserAIConfig(c.env.DB, user.userId, c.env, 'article');

    if (!apiKey || !provider) {
      return c.json<APIResponse>({
        success: false,
        error: 'AI API key not configured.'
      }, 400);
    }

    console.log(`Using AI provider: ${provider}, model: ${modelName}`);

    const generatedArticle = await generateAIContent({
      provider,
      apiKey,
      model: modelName || undefined,
      messages: [
        {
          role: 'system',
          content: 'You are a professional web content writer specializing in SEO articles. You MUST strictly follow the word count requirements provided in the user prompt.'
        },
        {
          role: 'user',
          content: finalPrompt
        }
      ],
      temperature: 0.7,
      maxTokens: 4096 // Claude 3 Haikuの最大値
    });

    // 生成された記事の文字数をカウント
    const charCount = generatedArticle.length;
    const targetCharsNum = parseInt(targetChars);
    const charCountPercentage = Math.round((charCount / targetCharsNum) * 100);
    
    // 文字数不足の警告チェック
    let warning = null;
    if (charCount < minChars) {
      warning = `⚠️ 生成された記事は${charCount}文字で、目標文字数${targetChars}文字に対して不足しています（達成率: ${charCountPercentage}%）。記事を編集して内容を追加することをお勧めします。`;
    } else if (charCount > maxChars) {
      warning = `⚠️ 生成された記事は${charCount}文字で、目標文字数${targetChars}文字を超過しています（達成率: ${charCountPercentage}%）。`;
    }

    return c.json<APIResponse>({
      success: true,
      data: {
        content: generatedArticle,
        charCount,
        targetChars: targetCharsNum,
        charCountPercentage,
        warning,
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
      error: error.message || 'Failed to generate article'
    }, 500);
  }
});

/**
 * POST /api/generate/rewrite - 記事リライト
 */
generate.post('/rewrite', async (c) => {
  try {
    const user = c.get('user');
    const { keyword, original_content, instructions, params } = await c.req.json();

    if (!original_content) {
      return c.json<APIResponse>({
        success: false,
        error: 'Original content is required'
      }, 400);
    }

    // ユーザーのAI設定を取得
    const { provider, apiKey, modelName } = await getUserAIConfig(c.env.DB, user.userId, c.env, 'rewrite');

    if (!apiKey || !provider) {
      return c.json<APIResponse>({
        success: false,
        error: 'AI API key not configured.'
      }, 400);
    }

    console.log(`Using AI provider: ${provider}, model: ${modelName}`);

    const maxChars = params?.max_chars || 3000;
    const tone = params?.tone || 'professional';

    // リライトプロンプト
    const rewritePrompt = `あなたはプロのWebライター・編集者です。
以下の記事をより読みやすく、SEOに最適化された内容にリライトしてください。

${keyword ? `キーワード: ${keyword}` : ''}

${instructions ? `リライト指示: ${instructions}` : ''}

【文字数制約】
⚠️ リライト後の記事は必ず ${maxChars} 文字程度（±10%以内）にしてください。
- 目標文字数: ${maxChars} 文字
- 文体: ${tone}

元の記事:
${original_content}

要件:
- 元の記事の主要なポイントと情報は保持する
- より読みやすく、魅力的な文章に改善
- SEOを意識しつつ、自然な文章にする
- 文章構造を改善し、段落を最適化
- Markdown形式で出力
- 文字数 ${maxChars} を必ず守る

リライト後の記事:`;

    const rewrittenArticle = await generateAIContent({
      provider,
      apiKey,
      model: modelName || undefined,
      messages: [
        {
          role: 'system',
          content: 'You are a professional web content editor and SEO specialist. You MUST strictly follow the word count requirements.'
        },
        {
          role: 'user',
          content: rewritePrompt
        }
      ],
      temperature: 0.7,
      maxTokens: 4096
    });

    // 文字数カウントと警告
    const charCount = rewrittenArticle.length;
    const minChars = Math.floor(maxChars * 0.9);
    const maxCharsLimit = Math.floor(maxChars * 1.1);
    const charCountPercentage = Math.round((charCount / maxChars) * 100);
    
    let warning = null;
    if (charCount < minChars) {
      warning = `⚠️ リライト後の記事は${charCount}文字で、目標文字数${maxChars}文字に対して不足しています（達成率: ${charCountPercentage}%）。`;
    } else if (charCount > maxCharsLimit) {
      warning = `⚠️ リライト後の記事は${charCount}文字で、目標文字数${maxChars}文字を超過しています（達成率: ${charCountPercentage}%）。`;
    }

    return c.json<APIResponse>({
      success: true,
      data: {
        content: rewrittenArticle,
        charCount,
        targetChars: maxChars,
        charCountPercentage,
        warning
      }
    });

  } catch (error: any) {
    console.error('Rewrite error:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to rewrite article'
    }, 500);
  }
});

/**
 * POST /api/generate/seo - SEO項目生成
 */
generate.post('/seo', async (c) => {
  try {
    const user = c.get('user');
    const { keyword, content } = await c.req.json();

    if (!keyword || !content) {
      return c.json<APIResponse>({
        success: false,
        error: 'Keyword and content are required'
      }, 400);
    }

    // ユーザーのAI設定を取得
    const { provider, apiKey, modelName } = await getUserAIConfig(c.env.DB, user.userId, c.env, 'seo');

    if (!apiKey || !provider) {
      return c.json<APIResponse>({
        success: false,
        error: 'AI API key not configured.'
      }, 400);
    }

    console.log(`Using AI provider: ${provider}, model: ${modelName}`);

    // SEO項目生成プロンプト
    const seoPrompt = `あなたはSEO専門家です。以下の記事内容を分析し、SEO最適化された項目を生成してください。

メインキーワード: ${keyword}

記事内容の要約:
${content.substring(0, 1000)}

以下のJSON形式で返してください:
{
  "seo_title": "SEO最適化されたタイトル(60文字以内、キーワードを含む)",
  "meta_description": "検索結果に表示されるメタディスクリプション(120-160文字、魅力的で行動を促す内容)",
  "target_keywords": "メインキーワード, 関連キーワード1, 関連キーワード2, 関連キーワード3"
}

要件:
- seo_titleは魅力的でクリックを誘うもの
- meta_descriptionは記事の価値を簡潔に伝え、検索ユーザーの興味を引くもの
- target_keywordsはカンマ区切りで3-5個のキーワード`;

    const generatedText = await generateAIContent({
      provider,
      apiKey,
      model: modelName || undefined,
      messages: [
        {
          role: 'system',
          content: 'You are an SEO specialist. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: seoPrompt
        }
      ],
      temperature: 0.7,
      maxTokens: 500
    });

    // JSON形式で返却を試みる
    let parsedSEO;
    try {
      parsedSEO = JSON.parse(generatedText);
    } catch (e) {
      // JSONパースに失敗した場合、デフォルト値を使用
      parsedSEO = {
        seo_title: `${keyword}について徹底解説`,
        meta_description: `${keyword}に関する詳しい情報をお届けします。初心者から上級者まで役立つ実践的な内容です。`,
        target_keywords: keyword
      };
    }

    return c.json<APIResponse>({
      success: true,
      data: parsedSEO
    });

  } catch (error: any) {
    console.error('Generate SEO error:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to generate SEO metadata'
    }, 500);
  }
});

/**
 * POST /api/generate/assist - AIアシスタント（部分リライト）
 */
generate.post('/assist', async (c) => {
  try {
    const user = c.get('user');
    const { selected_text, instruction, context } = await c.req.json();

    if (!selected_text) {
      return c.json<APIResponse>({
        success: false,
        error: 'Selected text is required'
      }, 400);
    }

    // ユーザーのAI設定を取得
    const { provider, apiKey, modelName } = await getUserAIConfig(c.env.DB, user.userId, c.env, 'assist');

    if (!apiKey || !provider) {
      return c.json<APIResponse>({
        success: false,
        error: 'AI API key not configured.'
      }, 400);
    }

    console.log(`Using AI provider: ${provider}, model: ${modelName}`);

    // AIアシスタントプロンプト
    const assistPrompt = `あなたはプロのライティングアシスタントです。

ユーザーの指示に従って、選択されたテキストを改善してください。

${context ? `記事全体の文脈:\n${context}\n\n` : ''}選択されたテキスト:
"${selected_text}"

ユーザーの指示:
${instruction || '文章をより読みやすく、明確に改善してください。'}

改善されたテキストのみを返してください。説明や前置きは不要です。`;

    const improvedText = await generateAIContent({
      provider,
      apiKey,
      model: modelName || undefined,
      messages: [
        {
          role: 'system',
          content: 'You are a professional writing assistant. Respond only with the improved text, no explanations.'
        },
        {
          role: 'user',
          content: assistPrompt
        }
      ],
      temperature: 0.7,
      maxTokens: 1000
    });

    return c.json<APIResponse>({
      success: true,
      data: {
        original: selected_text,
        improved: improvedText.trim()
      }
    });

  } catch (error: any) {
    console.error('AI assist error:', error);
    return c.json<APIResponse>({
      success: false,
      error: error.message || 'Failed to assist with AI'
    }, 500);
  }
});

export default generate;
