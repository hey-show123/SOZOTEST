// Supabase接続テスト
const { createClient } = require('@supabase/supabase-js');

// 接続テスト関数
async function testSupabaseConnection() {
  try {
    // 環境変数を取得するかハードコードする
    // 注意: 実際のキーは公開しないでください
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xkrdzdvhvfhpsxyayiil.supabase.co';
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE'; // ここに実際のキーを入力

    console.log('Supabase URL:', SUPABASE_URL);
    console.log('キーが設定されているか:', SUPABASE_ANON_KEY ? 'はい' : 'いいえ');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_ANON_KEY_HERE') {
      console.error('エラー: Supabase URLまたはAnon Keyが設定されていません');
      console.log('Supabaseダッシュボードの「Project Settings」→「API」からキーを取得してください');
      return;
    }

    // Supabaseクライアントの初期化
    console.log('Supabaseクライアントを初期化中...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 健全性チェック - バージョン情報の取得
    console.log('Supabaseサーバーのバージョン情報を取得中...');
    const { data: version, error: versionError } = await supabase.rpc('get_runtime_info');

    if (versionError) {
      console.log('バージョン情報の取得に失敗しました:', versionError.message);
      console.log('代わりにストレージを確認します...');
      
      // ストレージが利用可能か確認
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('ストレージの確認に失敗:', bucketsError.message);
        console.error('Supabaseへの接続に問題があります');
      } else {
        console.log('利用可能なストレージバケット:');
        console.log(buckets);
        console.log('Supabaseへの接続は正常です');
        
        // audio-filesバケットが存在するか確認
        const audioFilesBucket = buckets.find(bucket => bucket.name === 'audio-files');
        if (audioFilesBucket) {
          console.log('audio-filesバケットが存在します');
          console.log('バケット情報:', audioFilesBucket);
        } else {
          console.log('audio-filesバケットが見つかりません');
          console.log('Supabaseダッシュボードで「audio-files」バケットを作成してください');
        }
      }
    } else {
      console.log('Supabaseサーバー情報:', version);
      console.log('Supabaseへの接続は正常です');
      
      // lessonsテーブルが存在するか確認
      console.log('lessonsテーブルを確認中...');
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .limit(1);
      
      if (lessonsError) {
        console.error('lessonsテーブルへのアクセスに失敗:', lessonsError.message);
        console.log('lessonsテーブルが存在しないか、アクセス権限がありません');
      } else {
        console.log('lessonsテーブルにアクセスできました');
        console.log('レコード数:', lessons ? lessons.length : 0);
      }
    }
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

// 実行
testSupabaseConnection()
  .then(() => console.log('テスト完了'))
  .catch(err => console.error('テスト実行中のエラー:', err)); 