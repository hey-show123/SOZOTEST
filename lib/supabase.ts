import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabaseの環境変数
// 固定値を設定（Vercelの環境変数の問題を回避）
// 注意：本番環境では環境変数を使用するべきですが、トラブルシューティングのために一時的に固定値を使用
const HARDCODED_SUPABASE_URL = 'https://xkrdzdvhvfhpsxyayiil.supabase.co';
// 実際のキーに置き換えてください（ここではプレースホルダー）
const HARDCODED_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrcmR6ZHZodmZocHN4eWF5aWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTU0MjI3OTcsImV4cCI6MjAzMDk5ODc5N30.dJTRIxCdwXhcyjnbKU4pjnkHOu-q4Qm1z9Fc_bRRExE';

// 環境変数またはハードコードされた値を使用
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || HARDCODED_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || HARDCODED_SUPABASE_KEY;

console.log('========== Supabase接続情報 ==========');
console.log('環境:', process.env.NODE_ENV);
console.log('URL:', supabaseUrl);
console.log('Key (最初の10文字):', supabaseAnonKey.substring(0, 10) + '...');

// Supabaseクライアントのオプション設定
const supabaseOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application-name': 'sozo-english-app'
    }
  },
  // デバッグ出力
  debug: process.env.NODE_ENV === 'development'
};

// 接続をより堅牢に
let supabase: SupabaseClient;
try {
  // Supabaseクライアントの作成
  supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);
  console.log('Supabaseクライアント初期化完了');

  // 接続テスト
  (async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      console.log('✅ Supabase接続確認: 成功');
      
      // ストレージバケットの確認
      try {
        const { data: bucketData, error: bucketError } = await supabase.storage.getBucket('audio-files');
        if (bucketError) {
          console.warn('⚠️ Supabaseストレージバケット確認: 失敗', bucketError.message);
          console.log('バケットが存在しない場合は作成を試みます');
          
          try {
            const { data: createData, error: createError } = await supabase.storage.createBucket('audio-files', {
              public: true,
              allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aiff'],
              fileSizeLimit: 5242880, // 5MB
            });
            
            if (createError) {
              console.error('❌ バケット作成エラー:', createError.message);
            } else {
              console.log('✅ バケット作成成功:', createData);
            }
          } catch (createErr) {
            console.error('❌ バケット作成例外:', createErr);
          }
        } else {
          console.log('✅ Supabaseストレージバケット確認: 成功', bucketData);
        }
      } catch (bucketErr) {
        console.error('❌ バケット確認例外:', bucketErr);
      }
    } catch (err) {
      console.error('❌ Supabase接続失敗:', err);
      // 接続失敗時に再試行
      setTimeout(async () => {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            throw error;
          }
          console.log('✅ Supabase接続確認 (再試行): 成功');
        } catch (retryErr) {
          console.error('❌ Supabase接続失敗 (再試行):', retryErr);
        }
      }, 2000);
    }
  })();
} catch (initError) {
  console.error('❌ Supabaseクライアント初期化エラー:', initError);
  // フォールバックとして基本的なクライアントを作成
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

// レッスンデータ用のテーブル名
export const LESSONS_TABLE = 'lessons';

// 開発環境かどうかを判定
export const isDevelopment = process.env.NODE_ENV === 'development';

// Vercel環境かどうかを判定
export const isVercelEnv = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

// Supabaseが設定されているかどうかをチェック
export const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'https://your-project-url.supabase.co' && 
  supabaseAnonKey !== 'your-anon-key';

// 音声ファイルの保存方法を決定
// Vercel環境ではSupabaseを使用、開発環境ではローカルファイルシステムを使用
export const useSupabaseStorage = isSupabaseConfigured && !isDevelopment;

export { supabase }; 