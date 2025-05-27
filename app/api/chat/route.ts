import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// OpenAI APIクライアントを初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// エラー型の定義
interface ErrorWithResponse {
  message: string;
  stack?: string;
  response?: {
    status?: number;
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}

// エラーハンドリング用のヘルパー関数
function formatError(error: ErrorWithResponse) {
  let errorMessage = 'サーバーエラーが発生しました';
  let errorDetails = null;
  let statusCode = 500;

  if (error.response) {
    // OpenAI APIからのエラーレスポンス
    errorMessage = error.response.data?.error?.message || errorMessage;
    errorDetails = error.response.data;
    statusCode = error.response.status || statusCode;
  } else if (error.message) {
    // 一般的なエラーメッセージ
    errorMessage = error.message;
  }

  // 開発環境ではより詳細な情報を返す
  const isDev = process.env.NODE_ENV === 'development';
  
  return {
    response: NextResponse.json({
      error: errorMessage,
      details: isDev ? errorDetails : null,
      stack: isDev ? error.stack : null
    }, { status: statusCode }),
    logged: `APIエラー: ${errorMessage}${isDev && error.stack ? '\n' + error.stack : ''}`
  };
}

export async function POST(request: Request) {
  try {
    // リクエストボディからメッセージを取得
    const { messages } = await request.json();

    // パラメータの検証
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'メッセージが無効です' }, { status: 400 });
    }

    try {
      // OpenAI APIを呼び出し
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-nano-2025-04-14',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      // 応答を返す
      return NextResponse.json({ 
        message: response.choices[0].message,
        usage: response.usage
      });
    } catch (apiError) {
      // API呼び出しエラーを適切にハンドリング
      const formattedError = formatError(apiError as ErrorWithResponse);
      console.error(formattedError.logged);
      return formattedError.response;
    }
  } catch (error) {
    // リクエスト処理エラーをハンドリング
    const formattedError = formatError(error as ErrorWithResponse);
    console.error(formattedError.logged);
    return formattedError.response;
  }
} 