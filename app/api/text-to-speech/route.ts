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
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const audioDir = path.join(publicDir, 'audio');
    
    if (!existsSync(audioDir)) {
      await mkdir(audioDir, { recursive: true });
      console.log('音声ディレクトリを作成しました:', audioDir);
    }
    
    return audioDir;
  } catch (error) {
    console.error('音声ディレクトリ作成エラー:', error);
    throw error;
  }
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

// URLを整形する関数（改行や空白を削除）
function sanitizeUrl(url: string): string {
  // URLから改行と余分な空白を削除
  return url.replace(/[\r\n\s]+/g, '');
}

// 音声ファイルの保存パス
const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

// Supabaseのストレージバケット名
const STORAGE_BUCKET = 'audio-files';

// ディレクトリが存在しない場合は作成する関数
async function ensureDirectoryExists(dir: string): Promise<void> {
  try {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
      console.log('ディレクトリを作成しました:', dir);
    }
  } catch (error) {
    console.error('ディレクトリ作成エラー:', error);
    throw error;
  }
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

    console.log('TTS API - リクエスト受信:', { textLength: text.length, voice, model, save });

    // ファイルを保存するかどうか
    if (save) {
      // Supabaseが設定されていない場合か開発環境の場合はローカルに保存
      if (!isSupabaseConfigured || isDevelopment) {
        try {
          console.log('TTS API - ローカルファイルシステムに保存します');
          
          // ディレクトリが存在しない場合は作成
          await ensureDirectoryExists(AUDIO_DIR);
          console.log('TTS API - 音声ディレクトリ確認完了:', AUDIO_DIR);

          // 保存先のパス
          const filePath = path.join(AUDIO_DIR, fileName);
          console.log('TTS API - 保存先ファイルパス:', filePath);
          
          // ファイルが既に存在するか確認
          if (existsSync(filePath)) {
            // 既存のファイルを使用
            audioUrl = `/audio/${fileName}`;
            console.log('TTS API - 既存のファイルを使用:', audioUrl);
            
            return NextResponse.json({
              audioUrl,
              cached: true
            });
          }
          
          // OpenAI APIを呼び出して音声を生成
          console.log('TTS API - OpenAI APIで音声生成中...');
          const mp3 = await openai.audio.speech.create({
            model: model,
            voice: voice,
            input: text,
          });

          // 音声データをバッファに変換
          const buffer = Buffer.from(await mp3.arrayBuffer());
          console.log('TTS API - 音声バッファを取得:', buffer.length, 'バイト');
          
          // ファイルに保存
          console.log('TTS API - ファイルに保存中...');
          await writeFile(filePath, buffer);
          console.log('TTS API - ファイル保存完了:', filePath);
          
          // 音声URLを設定
          audioUrl = `/audio/${fileName}`;
          console.log('TTS API - 音声URL設定:', audioUrl);
        } catch (error) {
          console.error('TTS API - ローカル保存エラー:', error);
          throw new Error(`ローカルファイル保存エラー: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
        // 本番環境: Supabaseのストレージに保存
        try {
          console.log('TTS API - Supabaseストレージに保存します');
          
          // ファイルがすでに存在するか確認
          console.log('TTS API - Supabaseでファイル存在確認中...');
          const { data: existingFile, error: checkError } = await supabase
            .storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(fileName);
          
          if (checkError) {
            console.error('TTS API - Supabase存在確認エラー:', checkError);
            throw new Error(`Supabase存在確認エラー: ${checkError.message}`);
          }
          
          if (existingFile && existingFile.publicUrl) {
            // 既存のファイルのURLを使用
            audioUrl = sanitizeUrl(existingFile.publicUrl);
            console.log('TTS API - 既存の音声ファイルを使用:', audioUrl);
            
            return NextResponse.json({
              audioUrl,
              cached: true
            });
          }
          
          // OpenAI APIを呼び出して音声を生成
          console.log('TTS API - OpenAI APIで音声生成中...');
          const mp3 = await openai.audio.speech.create({
            model: model,
            voice: voice,
            input: text,
          });

          // 音声データをバッファに変換
          const buffer = Buffer.from(await mp3.arrayBuffer());
          console.log('TTS API - 音声バッファを取得:', buffer.length, 'バイト');
          
          // Supabaseのストレージにアップロード
          console.log('TTS API - Supabaseにアップロード中...');
          const { data, error } = await supabase
            .storage
            .from(STORAGE_BUCKET)
            .upload(fileName, buffer, {
              contentType: 'audio/mpeg',
              upsert: true
            });
          
          if (error) {
            console.error('TTS API - Supabaseアップロードエラー:', error);
            throw new Error('Supabaseへの音声ファイルアップロードエラー: ' + error.message);
          }
          
          // 公開URLを取得
          console.log('TTS API - 公開URL取得中...');
          const { data: urlData, error: urlError } = await supabase
            .storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(fileName);
          
          if (urlError || !urlData) {
            console.error('TTS API - Supabase公開URL取得エラー:', urlError);
            throw new Error('公開URL取得エラー: ' + (urlError ? urlError.message : 'URLデータなし'));
          }
          
          audioUrl = sanitizeUrl(urlData.publicUrl);
          console.log('TTS API - 音声ファイルのURL:', audioUrl);
        } catch (error) {
          console.error('TTS API - Supabase処理エラー、ローカルファイルシステムにフォールバック:', error);
          
          // エラー時はローカルに保存
          try {
            // ディレクトリ確認
            console.log('TTS API - ローカルファイルシステムにフォールバック');
            await ensureDirectoryExists(AUDIO_DIR);
            console.log('TTS API - ディレクトリ確認:', AUDIO_DIR);
            
            const filePath = path.join(AUDIO_DIR, fileName);
            console.log('TTS API - 保存先ファイルパス:', filePath);
            
            // OpenAI APIを呼び出して音声を生成（再度呼び出し）
            console.log('TTS API - OpenAI APIで音声を再生成中...');
            const mp3 = await openai.audio.speech.create({
              model: model,
              voice: voice,
              input: text,
            });
            
            // 音声データをバッファに変換
            const buffer = Buffer.from(await mp3.arrayBuffer());
            console.log('TTS API - 音声バッファを取得:', buffer.length, 'バイト');
            
            // ファイルに保存
            console.log('TTS API - ファイルに保存中...');
            await writeFile(filePath, buffer);
            console.log('TTS API - ファイル保存完了:', filePath);
            
            // 音声URLを設定
            audioUrl = `/audio/${fileName}`;
            console.log('TTS API - 音声URL設定:', audioUrl);
          } catch (saveError) {
            console.error('TTS API - ローカル保存エラー:', saveError);
            throw new Error('ローカルファイル保存エラー: ' + (saveError instanceof Error ? saveError.message : String(saveError)));
          }
        }
      }
      
      return NextResponse.json({
        audioUrl,
        cached: false
      });
    } else {
      // ファイルを保存せずに音声を生成
      console.log('TTS API - ファイルを保存せずに音声を生成します');
      const mp3 = await openai.audio.speech.create({
        model: model,
        voice: voice,
        input: text,
      });

      // 音声データをバッファに変換してBase64にエンコード
      const buffer = Buffer.from(await mp3.arrayBuffer());
      const base64Audio = buffer.toString('base64');
      console.log('TTS API - Base64音声データを生成:', base64Audio.substring(0, 50) + '...');
      
      return NextResponse.json({
        audioBase64: `data:audio/mpeg;base64,${base64Audio}`,
        cached: false
      });
    }
  } catch (error: any) {
    console.error('TTS APIエラー:', error);
    return NextResponse.json({ 
      error: error.message || 'エラーが発生しました',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 