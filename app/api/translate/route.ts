import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// OpenAI APIクライアントを初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ルートハンドラーの設定
export const config = {
  api: {
    responseLimit: '4mb',
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export async function POST(request: Request) {
  try {
    // リクエストボディからテキストを取得
    const { text, targetLang } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'テキストが無効です' }, { status: 400 });
    }

    // 翻訳対象の言語を設定
    const language = targetLang === 'ja' ? '日本語' : 'English';

    // OpenAI APIを使用して翻訳
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `あなたは優秀な翻訳者です。入力されたテキストを${language}に翻訳してください。翻訳のみを返し、余計な説明は不要です。`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    // 翻訳結果を返す
    return NextResponse.json({ 
      translation: response.choices[0].message.content
    });
  } catch (error) {
    console.error('翻訳APIエラー:', error);
    return NextResponse.json({ error: '翻訳に失敗しました' }, { status: 500 });
  }
} 