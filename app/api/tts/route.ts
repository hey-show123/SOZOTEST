import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { VoiceType } from '../../context/VoiceContext';
import { TTSModelType } from '../../context/ModelContext';

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

// オプションの拡張型
interface ExtendedSpeechParams {
  model: TTSModelType;
  voice: VoiceType;
  input: string;
  speed?: number;
  quality?: 'standard' | 'high';
  instructions?: string; // GPT-4o Mini TTSの指示用パラメータを追加
}

// テキストを適切な長さに分割する関数
function splitTextIntoChunks(text: string, maxLength = 300): string[] {
  // 明らかな文の区切りでテキストを分割
  const sentences = text.replace(/([.!?。！？])\s*/g, '$1|').split('|');
  
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // 空の文はスキップ
    if (!sentence.trim()) continue;
    
    // 現在のチャンクに文を追加しても最大長を超えない場合
    if (currentChunk.length + sentence.length <= maxLength) {
      currentChunk += sentence;
    } else {
      // 現在のチャンクが既に存在する場合は保存
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      // 新しい文が単独で最大長を超える場合は、さらに分割
      if (sentence.length > maxLength) {
        // 単語や文字単位での分割（日本語対応）
        let remainingSentence = sentence;
        while (remainingSentence.length > 0) {
          const chunkText = remainingSentence.slice(0, maxLength);
          chunks.push(chunkText);
          remainingSentence = remainingSentence.slice(maxLength);
        }
        currentChunk = '';
      } else {
        // 通常は新しいチャンクとして設定
        currentChunk = sentence;
      }
    }
  }
  
  // 最後のチャンクを追加
  if (currentChunk) {
    chunks.push(currentChunk);
  }
  
  return chunks;
}

// Buffer配列を結合する関数
function concatenateBuffers(buffers: Buffer[]): Buffer {
  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
  const result = Buffer.alloc(totalLength);
  
  let offset = 0;
  for (const buffer of buffers) {
    buffer.copy(result, offset);
    offset += buffer.length;
  }
  
  return result;
}

export async function POST(request: Request) {
  try {
    // リクエストボディからテキストと声の種類を取得
    const { text, voice, model, ttsPrompt, useCustomPrompt } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'テキストが無効です' }, { status: 400 });
    }

    // 声の種類をチェック（デフォルトはecho）
    const validVoice = voice && ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'ash', 'sage', 'coral', 'ballad', 'verse'].includes(voice) 
      ? voice 
      : 'echo';

    // モデルをチェック（デフォルトはtts-1）
    let validModel = model && ['tts-1', 'tts-1-hd', 'gpt-4o-mini-tts'].includes(model)
      ? model
      : 'tts-1';

    // GPT-4o Mini TTSモデルの場合
    if (validModel === 'gpt-4o-mini-tts') {
      try {
        // テキストを適切な長さのチャンクに分割（長いテキストの場合の安定性向上のため）
        const textChunks = splitTextIntoChunks(text, 1000);
        const audioBuffers: Buffer[] = [];
        
        // 声質プロンプトの設定
        const instructions = useCustomPrompt && ttsPrompt 
          ? ttsPrompt 
          : '自然な声で読み上げてください。一定の音量と明瞭な発声を維持してください。';
        
        // 各チャンクを個別に処理
        for (const chunk of textChunks) {
          // TTS APIを直接呼び出す
          const response = await openai.audio.speech.create({
            model: 'gpt-4o-mini-tts',
            voice: validVoice as VoiceType,
            input: chunk,
            instructions: instructions,
            response_format: 'mp3'
          });

          // 音声データを取得
          const buffer = Buffer.from(await response.arrayBuffer());
          
          // バッファに追加
          audioBuffers.push(buffer);
        }
        
        // すべての音声バッファを結合
        const combinedBuffer = concatenateBuffers(audioBuffers);
        
        // レスポンスヘッダーを設定
        const headers = {
          'Content-Type': 'audio/mpeg',
          'Content-Length': combinedBuffer.length.toString(),
        };
        
        // 結合した音声データを返す
        return new NextResponse(combinedBuffer, { status: 200, headers });
      } catch (error) {
        console.error('GPT-4o Mini TTS APIエラー:', error);
        // 標準のTTS APIにフォールバック
        console.log('標準のTTS APIにフォールバックします');
        validModel = 'tts-1-hd';
      }
    }

    // 標準のTTS APIを使用
    // APIオプションを設定
    const apiOptions: ExtendedSpeechParams = {
      model: validModel as TTSModelType,
      voice: validVoice as VoiceType,
      input: text,
    };

    // tts-1-hdモデルの場合は高品質設定を適用
    if (validModel === 'tts-1-hd') {
      apiOptions.quality = 'high'; // 高品質設定
    }

    // TTS APIを呼び出し
    const audioResponse = await openai.audio.speech.create(apiOptions);

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