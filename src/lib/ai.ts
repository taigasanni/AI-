// ===================================
// AI API統合ヘルパー
// ===================================

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIGenerateOptions {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * 複数のAIプロバイダーに対応した統一インターフェース
 */
export async function generateAIContent(options: AIGenerateOptions): Promise<string> {
  const { provider, apiKey, messages, temperature = 0.7, maxTokens = 4000 } = options;

  if (provider === 'openai') {
    return await generateWithOpenAI(apiKey, messages, temperature, maxTokens, options.model);
  } else if (provider === 'anthropic') {
    return await generateWithAnthropic(apiKey, messages, temperature, maxTokens, options.model);
  } else {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

/**
 * OpenAI API呼び出し
 */
async function generateWithOpenAI(
  apiKey: string,
  messages: AIMessage[],
  temperature: number,
  maxTokens: number,
  model?: string
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenAI API error:', errorData);
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Anthropic (Claude) API呼び出し
 */
async function generateWithAnthropic(
  apiKey: string,
  messages: AIMessage[],
  temperature: number,
  maxTokens: number,
  model?: string
): Promise<string> {
  // システムメッセージとユーザーメッセージを分離
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const userMessages = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role,
    content: m.content
  }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: maxTokens,
      temperature: temperature,
      system: systemMessage,
      messages: userMessages
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Anthropic API error:', errorData);
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}
