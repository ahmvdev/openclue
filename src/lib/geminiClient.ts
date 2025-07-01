// Gemini 2.5系API対応AIクライアント
// 画像・テキスト・履歴・構造化出力(JSON)対応

export type GeminiModel = 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gemini-2.5-flash-lite';

export interface GeminiRequestOptions {
  apiKey: string;
  model?: GeminiModel;
  prompt: string;
  imageBase64?: string; // data:image/png;base64,...
  history?: string[];   // 直近の履歴や文脈
  outputFormat?: 'text' | 'json';
  language?: 'ja' | 'en'; // 追加: 出力言語指定
}

export async function callGeminiAPI(options: GeminiRequestOptions): Promise<string | object> {
  const {
    apiKey,
    model = 'gemini-2.5-flash',
    prompt,
    imageBase64,
    history = [],
    outputFormat = 'text',
    language,
  } = options;

  // プロンプト生成
  let fullPrompt = prompt;
  if (history.length > 0) {
    fullPrompt = `直近の履歴:\n${history.join('\n')}\n${prompt}`;
  }
  if (outputFormat === 'json') {
    fullPrompt += '\n回答は必ずJSON形式で返してください。';
  }
  // 言語指示を付与
  if (language === 'en') {
    fullPrompt = `Please answer in English.\n` + fullPrompt;
  } else if (language === 'ja') {
    fullPrompt = `必ず日本語で答えてください。\n` + fullPrompt;
  }

  // parts生成
  const parts: any[] = [];
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: imageBase64.replace(/^data:image\/png;base64,/, ''),
      },
    });
  }
  parts.push({ text: fullPrompt });

  // APIリクエスト
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [ { parts } ]
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(`Gemini APIエラー: ${errorData.error?.message || res.statusText}`);
  }
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (outputFormat === 'json') {
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Gemini応答のJSONパースに失敗しました');
    }
  }
  return text;
} 