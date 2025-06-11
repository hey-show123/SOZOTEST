import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { WhisperModelType } from '../../context/ModelContext';

// OpenAI APIクライアントを初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI APIキーが有効かどうかチェック
const isValidOpenAIKey = process.env.OPENAI_API_KEY && 
                        process.env.OPENAI_API_KEY !== 'dummy_key' && 
                        process.env.OPENAI_API_KEY.startsWith('sk-');

// ルートハンドラーの設定
export const config = {
  api: {
    responseLimit: '8mb',
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

// エラー型の定義
interface ErrorWithMessage {
  message: string;
  status?: number;
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
  stack?: string;
}

export async function POST(request: Request) {
  try {
    // APIキーのチェック
    if (!isValidOpenAIKey) {
      console.warn('有効なOpenAI APIキーが設定されていません。デモモードで動作します。');
      // デモレスポンスを返して、フロントエンドが動作し続けるようにする
      return NextResponse.json({ 
        text: "Would you like to do a treatment as well?", 
        isDummy: true,
        message: 'OpenAI APIキーが設定されていないためデモテキストを返しています。'
      });
    }

    // フォームデータからファイルを取得
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'en'; // デフォルトは英語
    const whisperModel = (formData.get('model') as WhisperModelType) || 'whisper-1'; // デフォルトはwhisper-1

    if (!audioFile) {
      return NextResponse.json({ error: '音声ファイルが見つかりません' }, { status: 400 });
    }

    // ファイルサイズの検証（25MB以下）
    const fileSizeMB = audioFile.size / (1024 * 1024);
    if (fileSizeMB > 25) {
      return NextResponse.json({ 
        error: `音声ファイルが大きすぎます (${fileSizeMB.toFixed(2)}MB)。25MB以下にしてください。` 
      }, { status: 413 });
    }

    // 許可されるMIMEタイプを確認
    const validMimeTypes = [
      'audio/webm', 
      'audio/mp3', 
      'audio/mpeg', 
      'audio/wav', 
      'audio/x-wav', 
      'audio/ogg',
      'audio/webm;codecs=opus' // opusコーデックを使用したwebmをサポート
    ];
    
    // MIMEタイプの検証とログ
    const fileType = audioFile.type;
    
    if (!validMimeTypes.some(type => fileType.startsWith(type.split(';')[0]))) {
      console.warn(`サポートされていない音声形式: ${fileType}`);
      // MIMEタイプが一致しなくても処理は続行する（警告のみ）
    }

    try {
      // Whisper APIを呼び出し
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: whisperModel,
        language: language,
        response_format: 'json',
      });

      // 応答を返す
      return NextResponse.json({ text: transcription.text });
    } catch (apiError) {
      const error = apiError as ErrorWithMessage;
      console.error('Whisper API呼び出しエラー:', error);
      
      // APIからのエラーメッセージをチェック
      const statusCode = error.status || 500;
      const errorMessage = 
        error.message || 
        (error.response?.data?.error?.message) || 
        '音声認識に失敗しました';
        
      return NextResponse.json({ 
        error: errorMessage,
        details: error.response?.data || null
      }, { status: statusCode });
    }
  } catch (err) {
    const error = err as ErrorWithMessage;
    console.error('音声認識APIエラー:', error);
    return NextResponse.json({ 
      error: error.message || '音声認識に失敗しました',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 