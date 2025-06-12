const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Supabase接続情報
const SUPABASE_URL = 'https://xkrdzdvhvfhpsxyayiil.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrcmR6ZHZodmZocHN4eWF5aWlsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTU2NzI4MiwiZXhwIjoyMDY1MTQzMjgyfQ.VKz2ad2TtMjrhXzVNGXNbtpcYkwP29nVJZULUKYiVto';

// サービスロールでのSupabaseクライアント
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// テスト用のダイアログデータ（修正版）
const CORRECTED_DIALOGUE = [
  {
    role: 'staff',
    text: "What would you like to do today?",
    translation: "今日はどうされますか？",
    turnNumber: 1
  },
  {
    role: 'customer',
    text: "A haircut please, my hair feels damaged.",
    translation: "カットをお願いします。髪が傷んでいるように感じます。",
    turnNumber: 2
  },
  {
    role: 'staff',
    text: "Would you like to do a treatment as well?",
    translation: "トリートメントもされたいですか？",
    turnNumber: 3
  },
  {
    role: 'customer',
    text: "Sure.",
    translation: "はい",
    turnNumber: 4
  }
];

// 音声ファイルを生成する関数
function generateVoiceFile(text, filePath) {
  try {
    console.log(`音声ファイルを生成中: "${text}" -> ${filePath}`);
    
    // Macの'say'コマンドを使用して音声ファイルを生成
    // スタッフの音声はサマンサ、顧客の音声はトムを使用
    const voice = text === "Sure." || text.includes("haircut") ? "Tom" : "Samantha";
    execSync(`say -v ${voice} "${text}" -o "${filePath}"`);
    
    return true;
  } catch (error) {
    console.error('音声ファイル生成エラー:', error);
    return false;
  }
}

// ファイルをSupabaseにアップロードする関数
async function uploadToSupabase(filePath, fileName) {
  try {
    console.log(`Supabaseにアップロード中: ${fileName}`);
    
    // ファイルを読み込む
    const fileContent = fs.readFileSync(filePath);
    
    // Supabaseにアップロード
    const { data, error } = await supabaseAdmin
      .storage
      .from('audio-files')
      .upload(fileName, fileContent, {
        contentType: 'audio/mpeg',
        upsert: true // 既存のファイルを上書き
      });
    
    if (error) {
      console.error('アップロードエラー:', error);
      return null;
    }
    
    // 公開URLを生成
    return `${SUPABASE_URL}/storage/v1/object/public/audio-files/${fileName}`;
  } catch (error) {
    console.error('アップロード処理エラー:', error);
    return null;
  }
}

// メイン処理
async function main() {
  console.log('新しい音声ファイルを生成してアップロードします...');
  
  // 音声ファイル保存ディレクトリを作成
  const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
    console.log(`ディレクトリを作成しました: ${AUDIO_DIR}`);
  }
  
  // ダイアログの各ターンに対して音声ファイルを生成
  for (let i = 0; i < CORRECTED_DIALOGUE.length; i++) {
    const turn = CORRECTED_DIALOGUE[i];
    const turnNumber = turn.turnNumber;
    
    // ファイル名を生成（今回は新しい名前を使用）
    const fileName = `dialogue-turn-${turnNumber}-fixed.mp3`;
    const filePath = path.join(AUDIO_DIR, fileName);
    
    // 音声ファイルを生成
    const generated = generateVoiceFile(turn.text, filePath);
    if (!generated) {
      console.error(`ターン${turnNumber}の音声ファイル生成に失敗しました`);
      continue;
    }
    
    // Supabaseにアップロード
    const url = await uploadToSupabase(filePath, fileName);
    if (!url) {
      console.error(`ターン${turnNumber}のアップロードに失敗しました`);
      continue;
    }
    
    console.log(`ターン${turnNumber}の処理が完了しました:
- テキスト: "${turn.text}"
- 音声URL: ${url}
    `);
  }
  
  console.log('完了しました！');
  console.log('以下のURLをコードに貼り付けてください:');
  
  console.log(`
// デフォルトの会話シナリオデータ
const DEFAULT_DIALOGUE: DialogueTurn[] = [
  {
    role: 'staff',
    text: "What would you like to do today?",
    translation: "今日はどうされますか？",
    turnNumber: 1,
    audioUrl: "${SUPABASE_URL}/storage/v1/object/public/audio-files/dialogue-turn-1-fixed.mp3"
  },
  {
    role: 'customer',
    text: "A haircut please, my hair feels damaged.",
    translation: "カットをお願いします。髪が傷んでいるように感じます。",
    turnNumber: 2,
    audioUrl: "${SUPABASE_URL}/storage/v1/object/public/audio-files/dialogue-turn-2-fixed.mp3"
  },
  {
    role: 'staff',
    text: "Would you like to do a treatment as well?",
    translation: "トリートメントもされたいですか？",
    turnNumber: 3,
    audioUrl: "${SUPABASE_URL}/storage/v1/object/public/audio-files/dialogue-turn-3-fixed.mp3"
  },
  {
    role: 'customer',
    text: "Sure.",
    translation: "はい",
    turnNumber: 4,
    audioUrl: "${SUPABASE_URL}/storage/v1/object/public/audio-files/dialogue-turn-4-fixed.mp3"
  }
];
  `);
}

main().catch(console.error); 