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

// POSTリクエスト処理
export async function POST(req: Request) {
  try {
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
      // Supabaseが設定されていない場合か開発環境の場合はローカルに保存
      if (!isSupabaseConfigured || isDevelopment) {
        // ディレクトリが存在しない場合は作成
        ensureDirectoryExists(AUDIO_DIR);

        // 保存先のパス
        const filePath = path.join(AUDIO_DIR, fileName);
        
        // ファイルが既に存在するか確認
        if (fs.existsSync(filePath)) {
          // 既存のファイルを使用
          audioUrl = `/audio/${fileName}`;
          
          return NextResponse.json({
            audioUrl,
            cached: true
          });
        }
        
        // OpenAI APIを呼び出して音声を生成
        const mp3 = await openai.audio.speech.create({
          model: model,
          voice: voice,
          input: text,
        });

        // 音声データをバッファに変換
        const buffer = Buffer.from(await mp3.arrayBuffer());
        
        // ファイルに保存
        fs.writeFileSync(filePath, buffer);
        
        // 音声URLを設定
        audioUrl = `/audio/${fileName}`;
      } else {
        // 本番環境: Supabaseのストレージに保存
        try {
          // ファイルがすでに存在するか確認
          const { data: existingFile } = await supabase
            .storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(fileName);
          
          if (existingFile) {
            // 既存のファイルのURLを使用
            audioUrl = existingFile.publicUrl;
            
            return NextResponse.json({
              audioUrl,
              cached: true
            });
          }
          
          // OpenAI APIを呼び出して音声を生成
          const mp3 = await openai.audio.speech.create({
            model: model,
            voice: voice,
            input: text,
          });

          // 音声データをバッファに変換
          const buffer = Buffer.from(await mp3.arrayBuffer());
          
          // Supabaseのストレージにアップロード
          const { data, error } = await supabase
            .storage
            .from(STORAGE_BUCKET)
            .upload(fileName, buffer, {
              contentType: 'audio/mpeg',
              upsert: true
            });
          
          if (error) {
            throw new Error('Supabaseへの音声ファイルアップロードエラー: ' + error.message);
          }
          
          // 公開URLを取得
          const { data: urlData } = await supabase
            .storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(fileName);
          
          audioUrl = urlData.publicUrl;
        } catch (error) {
          console.error('Supabase処理エラー、ローカルファイルシステムにフォールバック:', error);
          
          // エラー時はローカルに保存
          ensureDirectoryExists(AUDIO_DIR);
          const filePath = path.join(AUDIO_DIR, fileName);
          
          // OpenAI APIを呼び出して音声を生成（再度呼び出し）
          const mp3 = await openai.audio.speech.create({
            model: model,
            voice: voice,
            input: text,
          });
          
          // 音声データをバッファに変換
          const buffer = Buffer.from(await mp3.arrayBuffer());
          
          // ファイルに保存
          fs.writeFileSync(filePath, buffer);
          
          // 音声URLを設定
          audioUrl = `/audio/${fileName}`;
        }
      }
      
      return NextResponse.json({
        audioUrl,
        cached: false
      });
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