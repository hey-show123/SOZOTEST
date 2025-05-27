import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { VoiceType } from '../../context/VoiceContext';

// OpenAI APIクライアントを初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ルートハンドラーの設定
export const config = {
  api: {
    responseLimit: '8mb',
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
};

export async function POST(request: Request) {
  try {
    // リクエストボディからテキストと声の種類を取得
    const { text, voice } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'テキストが無効です' }, { status: 400 });
    }

    // 声の種類をチェック（デフォルトはecho）
    const validVoice = voice && ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(voice) 
      ? voice 
      : 'echo';

    // TTS APIを呼び出し
    const audioResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: validVoice as VoiceType,
      input: text,
    });

    // 音声データをバッファに変換
    const buffer = Buffer.from(await audioResponse.arrayBuffer());

    // レスポンスヘッダーを設定
    const headers = {
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length.toString(),
    };

    // 音声データを返す
    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    console.error('TTS APIエラー:', error);
    return NextResponse.json({ error: '音声合成に失敗しました' }, { status: 500 });
  }
} 