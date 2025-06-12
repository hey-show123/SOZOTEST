const { createClient } = require('@supabase/supabase-js');

// Supabase接続情報
const SUPABASE_URL = 'https://xkrdzdvhvfhpsxyayiil.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrcmR6ZHZodmZocHN4eWF5aWlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU2NzI4MiwiZXhwIjoyMDY1MTQzMjgyfQ.VKz2ad2TtMjrhXzVNGXNbtpcYkwP29nVJZULUKYiVto';

// サービスロールでのSupabaseクライアントを作成
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// RLSポリシーを設定する関数
async function setupStoragePolicies() {
  console.log('Supabaseストレージのポリシーを設定します...');

  try {
    // 接続テスト
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Supabase接続エラー:', sessionError);
      return;
    }
    
    console.log('✅ Supabase接続OK');

    // バケットを確認
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ バケット一覧取得エラー:', bucketsError.message);
      return;
    }

    const audioFilesBucket = buckets.find(b => b.name === 'audio-files');
    
    if (!audioFilesBucket) {
      console.log('⚠️ audio-filesバケットが存在しません。作成します...');
      
      const { error: createError } = await supabase.storage.createBucket('audio-files', {
        public: true
      });
      
      if (createError) {
        console.error('❌ バケット作成エラー:', createError.message);
        return;
      }
      
      console.log('✅ audio-filesバケットを作成しました');
    } else {
      console.log('✅ audio-filesバケットは既に存在します');
      
      // バケットを公開に設定
      if (!audioFilesBucket.public) {
        console.log('⚠️ バケットが非公開です。公開に設定します...');
        
        const { error: updateError } = await supabase.storage.updateBucket('audio-files', {
          public: true
        });
        
        if (updateError) {
          console.error('❌ バケット更新エラー:', updateError.message);
        } else {
          console.log('✅ バケットを公開に設定しました');
        }
      } else {
        console.log('✅ バケットは既に公開に設定されています');
      }
    }

    // SQLエディタで実行するためのRLSポリシー設定コマンドを出力
    console.log('\n以下のSQLをSupabaseのSQL Editorで実行してください:');
    console.log('----------------------------------------------------------------');
    console.log(`
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "audio-files-select-policy" ON storage.objects;
DROP POLICY IF EXISTS "audio-files-insert-policy" ON storage.objects;
DROP POLICY IF EXISTS "audio-files-update-policy" ON storage.objects;
DROP POLICY IF EXISTS "audio-files-delete-policy" ON storage.objects;

-- 全ユーザーに対するファイル読み取り許可ポリシー
CREATE POLICY "audio-files-select-policy"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-files');

-- 認証済みユーザーのみアップロード許可ポリシー
CREATE POLICY "audio-files-insert-policy"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio-files' AND auth.role() = 'authenticated');

-- 認証済みユーザーのみ更新許可ポリシー
CREATE POLICY "audio-files-update-policy"
ON storage.objects FOR UPDATE
USING (bucket_id = 'audio-files' AND auth.role() = 'authenticated');

-- 認証済みユーザーのみ削除許可ポリシー
CREATE POLICY "audio-files-delete-policy"
ON storage.objects FOR DELETE
USING (bucket_id = 'audio-files' AND auth.role() = 'authenticated');
`);
    console.log('----------------------------------------------------------------');
    
    // 直接SQLを実行する（サポートされている場合）
    try {
      console.log('\nSQLを直接実行してみます...');
      
      // 既存のポリシーを削除
      await supabase.rpc('stored_procedure', {
        sql: "DROP POLICY IF EXISTS \"audio-files-select-policy\" ON storage.objects;"
      });
      
      await supabase.rpc('stored_procedure', {
        sql: "DROP POLICY IF EXISTS \"audio-files-insert-policy\" ON storage.objects;"
      });
      
      await supabase.rpc('stored_procedure', {
        sql: "DROP POLICY IF EXISTS \"audio-files-update-policy\" ON storage.objects;"
      });
      
      await supabase.rpc('stored_procedure', {
        sql: "DROP POLICY IF EXISTS \"audio-files-delete-policy\" ON storage.objects;"
      });
      
      // 新しいポリシーを作成
      await supabase.rpc('stored_procedure', {
        sql: `CREATE POLICY "audio-files-select-policy" ON storage.objects FOR SELECT USING (bucket_id = 'audio-files');`
      });
      
      await supabase.rpc('stored_procedure', {
        sql: `CREATE POLICY "audio-files-insert-policy" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio-files' AND auth.role() = 'authenticated');`
      });
      
      await supabase.rpc('stored_procedure', {
        sql: `CREATE POLICY "audio-files-update-policy" ON storage.objects FOR UPDATE USING (bucket_id = 'audio-files' AND auth.role() = 'authenticated');`
      });
      
      await supabase.rpc('stored_procedure', {
        sql: `CREATE POLICY "audio-files-delete-policy" ON storage.objects FOR DELETE USING (bucket_id = 'audio-files' AND auth.role() = 'authenticated');`
      });
      
      console.log('✅ ポリシーを適用しました');
    } catch (error) {
      console.error('❌ SQLの直接実行エラー:', error.message);
      console.log('⚠️ Supabaseダッシュボードから手動でSQLを実行してください');
    }
    
    console.log('\n設定が完了しました。テストスクリプトを実行して確認してください。');

  } catch (error) {
    console.error('❌ 予期せぬエラー:', error.message);
  }
}

// スクリプト実行
setupStoragePolicies(); 