import { createClient } from '@supabase/supabase-js';

// Supabaseの環境変数
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// デバッグ情報
console.log('Supabase環境変数チェック:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- NEXT_PUBLIC_SUPABASE_URL exists:', !!supabaseUrl);
console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);

// 環境変数のチェック
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase環境変数が設定されていません。ローカルストレージを使用します。');
}

// Supabaseクライアントの作成
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Supabaseクライアントの接続確認
if (supabase) {
  supabase.auth.getSession()
    .then(() => console.log('Supabaseクライアント: 接続確認成功'))
    .catch(err => console.error('Supabaseクライアント: 接続確認失敗', err));
}

// レッスンデータ用のテーブル名
export const LESSONS_TABLE = 'lessons';

// 開発環境かどうかを判定
export const isDevelopment = process.env.NODE_ENV === 'development';

// Supabaseが設定されているかどうかをチェック
export const isSupabaseConfigured = !!supabase; 