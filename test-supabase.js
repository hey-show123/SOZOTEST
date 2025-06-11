// Supabaseのテーブル構造を確認するためのテストスクリプト
const { createClient } = require('@supabase/supabase-js');

// .env.localから環境変数を読み込むための処理（実際の環境では変更が必要）
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xkrdzdvhvfhpsxyayiil.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; // ここにAnon Keyを入力

// Supabaseクライアントの初期化
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// レッスンテーブルからデータを取得して構造を確認
async function checkLessonsTable() {
  try {
    console.log('Supabaseに接続中...');
    
    // レッスンテーブルの構造を確認（空のクエリを実行）
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .limit(0);
    
    if (error) {
      console.error('エラー:', error.message);
      return;
    }
    
    console.log('lessonsテーブルは正常に接続できています。');
    
    // テーブル情報を取得
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('pg_get_tabledef', { table_name: 'lessons' });
    
    if (tableError) {
      if (tableError.message.includes('function "pg_get_tabledef" does not exist')) {
        console.log('テーブル定義関数が存在しません。ダッシュボードでテーブル構造を確認してください。');
      } else {
        console.error('テーブル情報取得エラー:', tableError.message);
      }
    } else {
      console.log('テーブル定義:', tableInfo);
    }
    
  } catch (error) {
    console.error('予期せぬエラー:', error);
  }
}

// 実行
checkLessonsTable().then(() => {
  console.log('確認完了');
}); 