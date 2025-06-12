const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase接続情報
const SUPABASE_URL = 'https://xkrdzdvhvfhpsxyayiil.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrcmR6ZHZodmZocHN4eWF5aWlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU2NzI4MiwiZXhwIjoyMDY1MTQzMjgyfQ.VKz2ad2TtMjrhXzVNGXNbtpcYkwP29nVJZULUKYiVto';

// サービスロールでのSupabaseクライアント
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// すべての音声ファイルをアップロードする関数
async function uploadAllAudioFiles() {
  console.log('ローカル音声ファイルのアップロード開始...');

  try {
    // 1. 公開ディレクトリの中の音声ファイルを取得
    const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');
    
    // ディレクトリが存在するか確認
    if (!fs.existsSync(AUDIO_DIR)) {
      console.error(`ディレクトリが存在しません: ${AUDIO_DIR}`);
      return;
    }
    
    // ディレクトリ内のファイルを取得
    const localFiles = fs.readdirSync(AUDIO_DIR);
    console.log(`${localFiles.length}件のローカルファイルが存在します`);
    
    // MP3ファイルをフィルタリング
    const localMp3Files = localFiles.filter(f => f.endsWith('.mp3'));
    console.log(`${localMp3Files.length}件のローカルMP3ファイルをアップロードします`);
    
    if (localMp3Files.length === 0) {
      console.log('アップロードするMP3ファイルがありません');
      return;
    }
    
    // 2. Supabaseのストレージに既存のファイルを確認
    const { data: existingFiles, error: listError } = await supabaseAdmin
      .storage
      .from('audio-files')
      .list();
    
    if (listError) {
      console.error('ストレージファイル一覧取得エラー:', listError.message);
      return;
    }
    
    const existingFileNames = existingFiles.map(f => f.name);
    console.log(`Supabaseには${existingFileNames.length}件のファイルが存在します`);
    
    // 3. ファイルをひとつずつアップロード
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < localMp3Files.length; i++) {
      const fileName = localMp3Files[i];
      const filePath = path.join(AUDIO_DIR, fileName);
      
      // ファイルの内容を読み込む
      const fileContent = fs.readFileSync(filePath);
      const fileSize = Math.round(fileContent.length / 1024);
      
      // 進捗状況を表示
      process.stdout.write(`[${i+1}/${localMp3Files.length}] ${fileName} (${fileSize} KB)...`);
      
      // 既存のファイルをスキップするオプション（必要に応じてコメントアウト）
      // if (existingFileNames.includes(fileName)) {
      //   console.log(' スキップ (既存)');
      //   continue;
      // }
      
      try {
        // ファイルをアップロード
        const { data, error } = await supabaseAdmin
          .storage
          .from('audio-files')
          .upload(fileName, fileContent, {
            contentType: 'audio/mpeg',
            upsert: true // 既存のファイルを上書き
          });
        
        if (error) {
          console.log(' エラー:', error.message);
          errorCount++;
        } else {
          console.log(' 成功');
          successCount++;
        }
      } catch (error) {
        console.log(' エラー:', error.message);
        errorCount++;
      }
    }
    
    console.log(`\nアップロード完了: 成功=${successCount}, 失敗=${errorCount}`);
    
    // 4. アップロード後のファイル一覧を取得
    const { data: updatedFiles, error: updatedListError } = await supabaseAdmin
      .storage
      .from('audio-files')
      .list();
    
    if (updatedListError) {
      console.error('更新後のストレージファイル一覧取得エラー:', updatedListError.message);
    } else {
      console.log(`アップロード後のSupabaseファイル数: ${updatedFiles.length}件`);
    }
    
  } catch (error) {
    console.error('予期せぬエラー:', error.message);
  }
}

// 実行
uploadAllAudioFiles(); 