import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { VoiceType } from '../../context/VoiceContext';
import { TTSModelType } from '../../context/ModelContext';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { existsSync } from 'fs';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import { supabase, isDevelopment, isSupabaseConfigured } from '@/lib/supabase';

// S3クライアントの初期化
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// S3バケット名
const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'sozo-audio-files';

// OpenAI APIクライアントを初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI APIキーが有効かどうかチェック
const isValidOpenAIKey = process.env.OPENAI_API_KEY && 
                        process.env.OPENAI_API_KEY !== 'dummy_key' && 
                        process.env.OPENAI_API_KEY.startsWith('sk-');

// APIキーが設定されていない場合に環境変数を設定
if (!isValidOpenAIKey) {
  console.warn('有効なOpenAI APIキーが設定されていません。TTS機能は利用できません。');
  process.env.NEXT_PUBLIC_USE_DUMMY_OPENAI = 'true';
}

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
  instructions?: string; 
}

// テキストのハッシュを生成する関数
function generateHash(text: string, voice: string, model: string): string {
  const hash = crypto.createHash('md5').update(`${text}-${voice}-${model}`).digest('hex');
  return hash;
}

// S3にファイルが存在するか確認
async function checkFileExistsInS3(key: string): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key
      })
    );
    return true;
  } catch (error) {
    return false;
  }
}

// S3にファイルをアップロード
async function uploadToS3(key: string, buffer: Buffer, contentType: string = 'audio/mpeg'): Promise<string> {
  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read'
    })
  );
  
  // S3のパブリックURL
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-northeast-1'}.amazonaws.com/${key}`;
}

// 音声ファイルを保存するディレクトリを作成（ローカル開発用）
async function ensureAudioDirExists() {
  const publicDir = path.join(process.cwd(), 'public');
  const audioDir = path.join(publicDir, 'audio');
  
  if (!existsSync(audioDir)) {
    await mkdir(audioDir, { recursive: true });
  }
  
  return audioDir;
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

// ファイル名をハッシュ化する関数
function generateFileName(text: string, voice: string): string {
  const hash = crypto.createHash('md5').update(`${text}-${voice}`).digest('hex');
  return `${hash}.mp3`;
}

// 音声ファイルの保存パス
const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

// Supabaseのストレージバケット名
const STORAGE_BUCKET = 'audio-files';

// ディレクトリが存在しない場合は作成する関数
function ensureDirectoryExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Supabaseからファイルの公開URLを取得する関数（リトライ機能付き）
async function getSupabasePublicUrl(bucket: string, fileName: string, maxRetries = 3): Promise<string> {
  let retries = 0;
  let lastError = null;
  
  while (retries < maxRetries) {
    try {
      const { data, error } = await supabase
        .storage
        .from(bucket)
        .getPublicUrl(fileName);
      
      if (error) {
        throw error;
      }
      
      if (!data || !data.publicUrl) {
        throw new Error('公開URLが返されませんでした');
      }
      
      return data.publicUrl;
    } catch (error) {
      lastError = error;
      retries++;
      console.warn(`公開URL取得失敗 (${retries}/${maxRetries}):`, error);
      
      // リトライ前に少し待機
      await new Promise(resolve => setTimeout(resolve, 500 * retries));
    }
  }
  
  // 最大リトライ回数を超えた場合
  throw new Error(`公開URL取得に失敗しました: ${lastError}`);
}

// Supabaseにファイルをアップロードする関数（リトライ機能付き）
async function uploadToSupabase(bucket: string, fileName: string, buffer: Buffer, maxRetries = 3): Promise<string> {
  let retries = 0;
  let lastError = null;
  
  while (retries < maxRetries) {
    try {
      // アップロード
      const { data, error } = await supabase
        .storage
        .from(bucket)
        .upload(fileName, buffer, {
          contentType: 'audio/mpeg',
          upsert: true
        });
      
      if (error) {
        throw error;
      }
      
      // 公開URL取得
      return await getSupabasePublicUrl(bucket, fileName);
    } catch (error) {
      lastError = error;
      retries++;
      console.warn(`アップロード失敗 (${retries}/${maxRetries}):`, error);
      
      // リトライ前に少し待機
      await new Promise(resolve => setTimeout(resolve, 500 * retries));
    }
  }
  
  // 最大リトライ回数を超えた場合
  throw new Error(`アップロードに失敗しました: ${lastError}`);
}

// POSTリクエスト処理
export async function POST(req: Request) {
  try {
    // APIキーのチェック
    if (!isValidOpenAIKey) {
      // APIキーが設定されていない場合でもフロントエンドが動作するよう、
      // エラーではなくダミーの音声URLを返す
      return NextResponse.json({ 
        audioUrl: '/audio/dummy-audio.mp3',
        message: 'OpenAI APIキーが設定されていないためダミーの音声URLを返しています。',
        isDummy: true
      }, { status: 200 });
    }

    // リクエストボディの解析
    const { text, voice = 'alloy', model = 'tts-1', save = false } = await req.json();

    // テキストのバリデーション
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'テキストが必要です' }, { status: 400 });
    }

    // ファイル名の生成
    const fileName = generateFileName(text, voice);
    let audioUrl = '';

    // ファイルを保存するかどうか
    if (save) {
      // Supabaseが設定されているかどうかをチェック
      const useSupabase = isSupabaseConfigured && !isDevelopment;
      
      // まずSupabaseストレージでファイルがすでに存在するか確認
      if (useSupabase) {
        try {
          // 公開URLを取得して存在確認
          try {
            const publicUrl = await getSupabasePublicUrl(STORAGE_BUCKET, fileName);
            
            // 既存のファイルが見つかった場合
            console.log('既存の音声ファイルが見つかりました:', publicUrl);
            return NextResponse.json({
              audioUrl: publicUrl,
              cached: true
            });
          } catch (checkError) {
            // 公開URL取得エラーの場合、ファイルが存在しないと判断して新規生成へ進む
            console.log('ファイルが存在しないか、取得できませんでした。新規生成します。');
          }
          
          // OpenAI APIを呼び出して音声を生成
          console.log('OpenAI APIで音声生成中...');
          const mp3 = await openai.audio.speech.create({
            model: model,
            voice: voice,
            input: text,
          });

          // 音声データをバッファに変換
          const buffer = Buffer.from(await mp3.arrayBuffer());
          console.log('音声バッファを取得:', buffer.length, 'バイト');
          
          // Supabaseのストレージにアップロード
          console.log('Supabaseにアップロード中...');
          audioUrl = await uploadToSupabase(STORAGE_BUCKET, fileName, buffer);
          console.log('音声ファイルのURL:', audioUrl);
          
          return NextResponse.json({
            audioUrl,
            cached: false
          });
        } catch (supabaseError) {
          console.error('Supabase処理エラー、ローカルファイルシステムにフォールバック:', supabaseError);
          // ローカルファイルシステムへのフォールバックを続行
        }
      }
      
      // Supabase処理に失敗した場合やローカル開発環境の場合はローカルファイルシステムを使用
      try {
        // ディレクトリ確認
        ensureDirectoryExists(AUDIO_DIR);
        console.log('ディレクトリ確認:', AUDIO_DIR);
        
        const filePath = path.join(AUDIO_DIR, fileName);
        console.log('保存先ファイルパス:', filePath);
        
        // ファイルが既に存在するか確認
        if (fs.existsSync(filePath)) {
          // 既存のファイルを使用
          audioUrl = `/audio/${fileName}`;
          console.log('既存のローカルファイルを使用:', audioUrl);
          
          return NextResponse.json({
            audioUrl,
            cached: true
          });
        }
        
        // OpenAI APIを呼び出して音声を生成
        console.log('OpenAI APIで音声生成中...');
        const mp3 = await openai.audio.speech.create({
          model: model,
          voice: voice,
          input: text,
        });
        
        // 音声データをバッファに変換
        const buffer = Buffer.from(await mp3.arrayBuffer());
        console.log('音声バッファを取得:', buffer.length, 'バイト');
        
        // ファイルに保存
        console.log('ファイルに保存中...');
        fs.writeFileSync(filePath, buffer);
        console.log('ファイル保存完了:', filePath);
        
        // 音声URLを設定
        audioUrl = `/audio/${fileName}`;
        console.log('音声URL設定:', audioUrl);
        
        return NextResponse.json({
          audioUrl,
          cached: false
        });
      } catch (saveError) {
        console.error('ローカル保存エラー:', saveError);
        throw new Error('ローカルファイル保存エラー: ' + (saveError instanceof Error ? saveError.message : String(saveError)));
      }
    } else {
      // ファイルを保存せずに音声を生成
      const mp3 = await openai.audio.speech.create({
        model: model,
        voice: voice,
        input: text,
      });

      // 音声データをバッファに変換してBase64にエンコード
      const buffer = Buffer.from(await mp3.arrayBuffer());
      const base64Audio = buffer.toString('base64');
      
      return NextResponse.json({
        audioBase64: `data:audio/mpeg;base64,${base64Audio}`,
        cached: false
      });
    }
  } catch (error: any) {
    console.error('TTS APIエラー:', error);
    return NextResponse.json({ error: error.message || 'エラーが発生しました' }, { status: 500 });
  }
} 