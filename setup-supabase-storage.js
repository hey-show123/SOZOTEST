// Supabaseストレージセットアップスクリプト
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Supabaseの接続情報
const SUPABASE_URL = 'https://xkrdzdvhvfhpsxyayiil.supabase.co';
// 注意: これはサービスロールキーで、公開してはいけません
// 実際の値はSupabaseダッシュボードのAPI設定から取得してください
let SUPABASE_SERVICE_KEY = '';

// ユーザー入力を取得するための設定
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ストレージバケット名
const STORAGE_BUCKET = 'audio-files';

async function setupSupabaseStorage() {
  // サービスキーの入力を求める
  if (!SUPABASE_SERVICE_KEY) {
    SUPABASE_SERVICE_KEY = await new Promise(resolve => {
      rl.question('Supabaseのサービスロールキーを入力してください: ', answer => {
        resolve(answer);
      });
    });
  }

  console.log('Supabase接続情報:');
  console.log('URL:', SUPABASE_URL);
  console.log('サービスキー (最初の10文字):', SUPABASE_SERVICE_KEY.substring(0, 10) + '...');

  try {
    // Supabaseクライアントの作成（サービスロールキーを使用）
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log('Supabaseクライアント初期化完了');

    // 1. バケットの存在を確認
    console.log(`バケット '${STORAGE_BUCKET}' の存在を確認中...`);
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('バケット一覧取得エラー:', bucketsError);
      process.exit(1);
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === STORAGE_BUCKET);
    
    // 2. バケットが存在しない場合は作成
    if (!bucketExists) {
      console.log(`バケット '${STORAGE_BUCKET}' が存在しないため、作成します...`);
      const { data, error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true // 公開バケットとして設定
      });
      
      if (createError) {
        console.error(`バケット '${STORAGE_BUCKET}' の作成に失敗:`, createError);
        process.exit(1);
      }
      
      console.log(`バケット '${STORAGE_BUCKET}' を作成しました`);
    } else {
      console.log(`バケット '${STORAGE_BUCKET}' は既に存在します`);
    }
    
    // 3. バケットの公開設定を更新
    console.log(`バケット '${STORAGE_BUCKET}' の公開設定を更新中...`);
    const { error: updateError } = await supabase.storage.updateBucket(STORAGE_BUCKET, {
      public: true
    });
    
    if (updateError) {
      console.error(`バケット '${STORAGE_BUCKET}' の設定更新に失敗:`, updateError);
      process.exit(1);
    }
    
    console.log(`バケット '${STORAGE_BUCKET}' の公開設定を更新しました`);
    
    // 4. RLSポリシーの設定
    // 注意: これらのSQL文はデータベースに直接アクセスするため、ダッシュボードのSQLエディターで実行することをお勧めします
    console.log('RLSポリシーの設定例:');
    console.log(`
-- storage.objectsテーブルのRLSを有効化
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- すべてのユーザーが音声ファイルを読み取れるポリシー
CREATE POLICY "音声ファイルの読み取りをすべてのユーザーに許可" 
ON storage.objects FOR SELECT 
USING (bucket_id = '${STORAGE_BUCKET}');

-- 認証されたユーザーが音声ファイルをアップロードできるポリシー
CREATE POLICY "認証されたユーザーの音声ファイルアップロードを許可" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = '${STORAGE_BUCKET}');

-- 認証されたユーザーが音声ファイルを更新できるポリシー
CREATE POLICY "認証されたユーザーの音声ファイル更新を許可" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = '${STORAGE_BUCKET}')
WITH CHECK (bucket_id = '${STORAGE_BUCKET}');
    `);
    
    console.log('これらのSQLコマンドをSupabaseダッシュボードのSQLエディターで実行してください。');
    
    // 5. テスト用のダミーファイルをアップロード
    console.log('テスト用のダミーファイルをアップロード中...');
    const testBuffer = Buffer.from('This is a test audio file', 'utf-8');
    const testFileName = `test-file-${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(STORAGE_BUCKET)
      .upload(testFileName, testBuffer, {
        contentType: 'text/plain',
        upsert: true
      });
      
    if (uploadError) {
      console.error('テストファイルアップロードエラー:', uploadError);
      console.log('おそらくRLSポリシーが適切に設定されていません。上記のSQLコマンドを実行してください。');
    } else {
      console.log(`テストファイル '${testFileName}' のアップロードに成功しました`);
      
      // 公開URLを取得
      const { data: urlData, error: urlError } = await supabase
        .storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(testFileName);
        
      if (urlError) {
        console.error('公開URL取得エラー:', urlError);
      } else {
        console.log('テストファイルの公開URL:', urlData.publicUrl);
        console.log('このURLにアクセスしてファイルが取得できるか確認してください。');
      }
    }
    
    console.log('セットアップ完了');
  } catch (error) {
    console.error('予期せぬエラー:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// スクリプトを実行
setupSupabaseStorage(); 