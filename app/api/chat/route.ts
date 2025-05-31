import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ChatModelType } from '../../context/ModelContext';
import { ChatCompletionCreateParams } from 'openai/resources';

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
    } | null;
  };
}

// エラーハンドリング用のヘルパー関数
function formatError(error: ErrorWithResponse) {
  let errorMessage = 'サーバーエラーが発生しました';
  let errorDetails: Record<string, unknown> | null = null;
  let statusCode = 500;

  if (error.response) {
    // OpenAI APIからのエラーレスポンス
    errorMessage = error.response.data?.error?.message || errorMessage;
    errorDetails = error.response.data || null;
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

// GPT-4o Miniのツール型定義
type Tool = {
  type: "code_interpreter" | "retrieval";
};

export async function POST(request: Request) {
  try {
    // リクエストボディからメッセージとモデル情報を取得
    const { messages, model, gpt4oMiniSettings } = await request.json();

    // パラメータの検証
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'メッセージが無効です' }, { status: 400 });
    }

    // モデルの選択（デフォルトはgpt-4o-mini）
    const chatModel = model || 'gpt-4o-mini';

    try {
      // OpenAI API呼び出し用のオプションを作成
      const options: ChatCompletionCreateParams = {
        model: chatModel as ChatModelType,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      };

      // GPT-4.1シリーズの場合は、コンテキストウィンドウの拡張と適切な設定を適用
      if (chatModel.startsWith('gpt-4.1')) {
        // GPT-4.1モデルはデフォルトで大きなコンテキストウィンドウをサポート
        if (chatModel === 'gpt-4.1') {
          options.max_tokens = 4000; // より大きな出力を許可
        }
      }

      // GPT-4o Miniの場合、特別な設定を適用
      if (chatModel === 'gpt-4o-mini') {
        const tools: Tool[] = [];
        
        // gpt4oMiniSettings が存在する場合のみ追加機能を適用
        if (gpt4oMiniSettings) {
          // Vision機能が有効な場合
          if (gpt4oMiniSettings.vision) {
            // @ts-expect-error - vision_enabledはOpenAIの型定義に含まれていない可能性がある
            options.vision_enabled = true;
          }
          
          // コードインタプリタが有効な場合
          if (gpt4oMiniSettings.codeInterpreter) {
            tools.push({ type: "code_interpreter" });
          }
          
          // ウェブ検索が有効な場合
          if (gpt4oMiniSettings.retrieval) {
            tools.push({ type: "retrieval" });
          }
          
          // ツールが設定されている場合
          if (tools.length > 0) {
            // @ts-expect-error - toolsの形式がOpenAIの型定義と完全に一致しない可能性がある
            options.tools = tools;
          }
        }
      }

      // OpenAI APIを呼び出し
      const response = await openai.chat.completions.create(options);

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