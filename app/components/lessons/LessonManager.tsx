'use client';

import { useState, useEffect, useRef } from 'react';

export type Phrase = {
  text: string;
  translation: string;
};

export type DialogueTurn = {
  role: 'staff' | 'customer';
  text: string;
  translation: string;
  turnNumber: number;
};

export type Goal = {
  text: string;
};

export type Lesson = {
  id: string;
  title: string;
  description: string;
  pdfUrl?: string;
  systemPrompt?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  createdAt: number;
  updatedAt: number;
  keyPhrase?: Phrase;
  dialogueTurns?: DialogueTurn[];
  goals?: Goal[];
  headerTitle?: string;
  startButtonText?: string;
};

// デフォルトのダイアログ
const DEFAULT_DIALOGUE: DialogueTurn[] = [
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

// デフォルトのキーフレーズ
const DEFAULT_KEY_PHRASE: Phrase = {
  text: "Would you like to do a treatment as well?",
  translation: "トリートメントもされたいですか？"
};

// 初期レッスンデータ
const DEFAULT_LESSONS: Lesson[] = [
  {
    id: 'sozo-med-lesson',
    title: 'レッスン29',
    description: '追加のサービスを提案しましょう',
    pdfUrl: '/pdfs/sozo_med_29.pdf',
    systemPrompt: 'あなたは医療英語を教える優秀な英語教師です。PDFの内容に沿って、医療現場で使う英語を丁寧に教えてください。学習者が理解しやすいように、例文や状況に応じた会話例を提示し、適切なフィードバックを行ってください。',
    level: 'intermediate',
    tags: ['医療', '英語', '問診'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    keyPhrase: DEFAULT_KEY_PHRASE,
    dialogueTurns: DEFAULT_DIALOGUE,
    headerTitle: 'レッスン29: Would you like to do a treatment as well?',
    startButtonText: 'レッスン開始',
    goals: [
      { text: 'トリートメントなどの追加メニューを自然におすすめできるようになる' },
      { text: '「Would you like to～?」の言い方に慣れる' },
      { text: 'サロンでよく使う英語の言葉を覚える' }
    ]
  }
];

type LessonManagerProps = {
  onSelectLesson: (lesson: Lesson) => void;
  currentLessonId?: string;
};

export default function LessonManager({ onSelectLesson, currentLessonId }: LessonManagerProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    pdfUrl: '',
    systemPrompt: '',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    tags: '',
    keyPhraseText: '',
    keyPhraseTranslation: '',
    dialogueText: '', // 古い形式のダイアログテキスト（互換性のために残す）
    dialogueTurns: [] as {
      role: 'staff' | 'customer';
      text: string;
      translation: string;
      turnNumber: number;
    }[], // 新しい構造化されたダイアログデータ
    goalsText: '', 
    headerTitle: '',
    startButtonText: ''
  });

  // コンポーネントマウント時にローカルストレージからレッスンを読み込む
  useEffect(() => {
    try {
      const savedLessons = localStorage.getItem('lessons');
      if (savedLessons) {
        setLessons(JSON.parse(savedLessons));
      } else {
        // 初期レッスンの保存
        setLessons(DEFAULT_LESSONS);
        localStorage.setItem('lessons', JSON.stringify(DEFAULT_LESSONS));
      }
    } catch (error) {
      console.error('レッスンデータの読み込みエラー:', error);
      setLessons(DEFAULT_LESSONS);
    }
  }, []);

  // 現在選択されているレッスンを設定
  useEffect(() => {
    if (currentLessonId && lessons.length > 0) {
      const lesson = lessons.find(l => l.id === currentLessonId);
      if (lesson) {
        setCurrentLesson(lesson);
      } else {
        setCurrentLesson(lessons[0]);
      }
    } else if (lessons.length > 0) {
      setCurrentLesson(lessons[0]);
    }
  }, [currentLessonId, lessons]);

  // レッスン選択ハンドラ
  const handleSelectLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    onSelectLesson(lesson);
  };

  // 追加モード開始
  const handleStartAdd = () => {
    setFormData({
      id: `lesson-${Date.now()}`,
      title: '',
      description: '',
      pdfUrl: '',
      systemPrompt: '',
      level: 'beginner',
      tags: '',
      keyPhraseText: DEFAULT_KEY_PHRASE.text,
      keyPhraseTranslation: DEFAULT_KEY_PHRASE.translation,
      dialogueText: DEFAULT_DIALOGUE.map(turn => 
        `${turn.role}: "${turn.text}" - "${turn.translation}"`
      ).join('\n'),
      dialogueTurns: DEFAULT_DIALOGUE.map(turn => ({
        role: turn.role,
        text: turn.text,
        translation: turn.translation,
        turnNumber: turn.turnNumber
      })),
      goalsText: DEFAULT_LESSONS[0].goals?.map(goal => goal.text).join('\n') || '',
      headerTitle: DEFAULT_LESSONS[0].headerTitle || '',
      startButtonText: DEFAULT_LESSONS[0].startButtonText || 'レッスン開始'
    });
    setIsAdding(true);
    setIsEditing(false);
  };

  // 編集モード開始
  const handleStartEdit = (lesson: Lesson) => {
    // ダイアログテキストの変換
    const dialogueText = lesson.dialogueTurns 
      ? lesson.dialogueTurns.map(turn => 
          `${turn.role}: "${turn.text}" - "${turn.translation}"`
        ).join('\n')
      : DEFAULT_DIALOGUE.map(turn => 
          `${turn.role}: "${turn.text}" - "${turn.translation}"`
        ).join('\n');

    // 目標テキストの変換
    const goalsText = lesson.goals 
      ? lesson.goals.map(goal => goal.text).join('\n')
      : DEFAULT_LESSONS[0].goals?.map(goal => goal.text).join('\n') || '';

    setFormData({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      pdfUrl: lesson.pdfUrl || '',
      systemPrompt: lesson.systemPrompt || '',
      level: lesson.level,
      tags: lesson.tags.join(', '),
      keyPhraseText: lesson.keyPhrase?.text || DEFAULT_KEY_PHRASE.text,
      keyPhraseTranslation: lesson.keyPhrase?.translation || DEFAULT_KEY_PHRASE.translation,
      dialogueText,
      dialogueTurns: lesson.dialogueTurns?.map(turn => ({
        role: turn.role,
        text: turn.text,
        translation: turn.translation,
        turnNumber: turn.turnNumber
      })) || DEFAULT_DIALOGUE.map(turn => ({
        role: turn.role,
        text: turn.text,
        translation: turn.translation,
        turnNumber: turn.turnNumber
      })),
      goalsText,
      headerTitle: lesson.headerTitle || DEFAULT_LESSONS[0].headerTitle || '',
      startButtonText: lesson.startButtonText || DEFAULT_LESSONS[0].startButtonText || 'レッスン開始'
    });
    setIsEditing(true);
    setIsAdding(false);
  };

  // フォーム入力の変更ハンドラ
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // PDFファイル選択のシミュレーション（実際の環境では別途ファイルアップロード処理が必要）
  const handleFileSelection = () => {
    alert('このデモではPDFのアップロードはシミュレーションのみです。実際の実装ではサーバーへのアップロード処理が必要です。');
    setFormData(prev => ({
      ...prev,
      pdfUrl: `/pdfs/${formData.id}.pdf`
    }));
  };

  const handlePdfPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let path = e.target.value;
    
    // パスが/で始まっていない場合は/を追加
    if (path && !path.startsWith('/')) {
      path = '/' + path;
    }
    
    // pdfs/で始まる場合、/pdfs/に修正
    if (path && path.startsWith('/pdfs/') === false && path.startsWith('pdfs/')) {
      path = '/' + path;
    }
    
    setFormData(prev => ({
      ...prev,
      pdfUrl: path
    }));
  };

  // レッスン保存
  const handleSaveLesson = () => {
    if (!formData.title.trim()) {
      alert('タイトルは必須です');
      return;
    }

    let dialogueTurns: DialogueTurn[] = [];
    
    // 構造化されたダイアログデータを使用（優先）
    if (formData.dialogueTurns.length > 0) {
      dialogueTurns = formData.dialogueTurns.map((turn, index) => ({
        role: turn.role,
        text: turn.text,
        translation: turn.translation,
        turnNumber: index + 1 // ターン番号を再設定して確実に連番にする
      }));
    } 
    // 後方互換性のためにテキストからの解析も残す
    else if (formData.dialogueText.trim()) {
      try {
        // 各行を解析
        const lines = formData.dialogueText.split('\n').filter(line => line.trim());
        dialogueTurns = lines.map((line, index) => {
          // パターン: role: "text" - "translation"
          const roleMatch = line.match(/^(staff|customer):/i);
          if (!roleMatch) throw new Error(`行 ${index + 1} の役割が無効です。'staff:' または 'customer:' で始める必要があります`);
          
          const role = roleMatch[1].toLowerCase() as 'staff' | 'customer';
          
          // テキストと翻訳を抽出
          const textMatch = line.match(/"([^"]+)"\s*-\s*"([^"]+)"/);
          if (!textMatch) throw new Error(`行 ${index + 1} のフォーマットが無効です。"テキスト" - "翻訳" の形式が必要です`);
          
          const text = textMatch[1];
          const translation = textMatch[2];
          
          return {
            role,
            text,
            translation,
            turnNumber: index + 1
          };
        });
      } catch (error) {
        alert(`ダイアログの解析エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
        return;
      }
    }

    // キーフレーズの検証
    if (!formData.keyPhraseText.trim() || !formData.keyPhraseTranslation.trim()) {
      alert('キーフレーズとその翻訳は必須です');
      return;
    }

    const keyPhrase: Phrase = {
      text: formData.keyPhraseText,
      translation: formData.keyPhraseTranslation
    };

    // 目標の解析
    const goals: Goal[] = formData.goalsText
      .split('\n')
      .filter(line => line.trim())
      .map(text => ({ text: text.trim() }));

    const tagsArray = formData.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag);

    const newLesson: Lesson = {
      id: formData.id,
      title: formData.title,
      description: formData.description,
      pdfUrl: formData.pdfUrl || undefined,
      systemPrompt: formData.systemPrompt || undefined,
      level: formData.level,
      tags: tagsArray,
      createdAt: isAdding ? Date.now() : (currentLesson?.createdAt || Date.now()),
      updatedAt: Date.now(),
      keyPhrase,
      dialogueTurns,
      goals: goals.length > 0 ? goals : undefined,
      headerTitle: formData.headerTitle.trim() || undefined,
      startButtonText: formData.startButtonText.trim() || undefined
    };

    let updatedLessons: Lesson[];
    if (isAdding) {
      updatedLessons = [...lessons, newLesson];
    } else {
      updatedLessons = lessons.map(lesson => 
        lesson.id === newLesson.id ? newLesson : lesson
      );
    }

    setLessons(updatedLessons);
    try {
      localStorage.setItem('lessons', JSON.stringify(updatedLessons));
    } catch (error) {
      console.error('レッスンデータの保存エラー:', error);
    }

    setIsAdding(false);
    setIsEditing(false);
    setCurrentLesson(newLesson);
    onSelectLesson(newLesson);
  };

  // レッスン削除
  const handleDeleteLesson = (id: string) => {
    if (window.confirm('このレッスンを削除してもよろしいですか？')) {
      const updatedLessons = lessons.filter(lesson => lesson.id !== id);
      setLessons(updatedLessons);
      
      try {
        localStorage.setItem('lessons', JSON.stringify(updatedLessons));
      } catch (error) {
        console.error('レッスンデータの保存エラー:', error);
      }

      if (currentLesson?.id === id && updatedLessons.length > 0) {
        setCurrentLesson(updatedLessons[0]);
        onSelectLesson(updatedLessons[0]);
      }
    }
  };

  // ダイアログターンの追加
  const handleAddDialogueTurn = () => {
    const newTurn = {
      role: 'staff' as 'staff' | 'customer', 
      text: '',
      translation: '',
      turnNumber: formData.dialogueTurns.length + 1
    };
    
    setFormData({
      ...formData,
      dialogueTurns: [...formData.dialogueTurns, newTurn]
    });
  };

  // ダイアログターンの削除
  const handleRemoveDialogueTurn = (index: number) => {
    const updatedTurns = formData.dialogueTurns.filter((_, i) => i !== index);
    
    // ターン番号を振り直す
    const reorderedTurns = updatedTurns.map((turn, i) => ({
      ...turn,
      turnNumber: i + 1
    }));
    
    setFormData({
      ...formData,
      dialogueTurns: reorderedTurns
    });
  };

  // ダイアログターンの更新
  const handleDialogueTurnChange = (index: number, field: 'role' | 'text' | 'translation', value: string) => {
    const updatedTurns = [...formData.dialogueTurns];
    if (field === 'role') {
      updatedTurns[index].role = value as 'staff' | 'customer';
    } else {
      updatedTurns[index][field] = value;
    }
    
    setFormData({
      ...formData,
      dialogueTurns: updatedTurns
    });
  };

  // ダイアログターンの順序を変更（上へ移動）
  const handleMoveDialogueTurnUp = (index: number) => {
    if (index === 0) return; // 既に先頭の場合は何もしない
    
    const updatedTurns = [...formData.dialogueTurns];
    const temp = updatedTurns[index];
    updatedTurns[index] = updatedTurns[index - 1];
    updatedTurns[index - 1] = temp;
    
    // ターン番号を振り直す
    const reorderedTurns = updatedTurns.map((turn, i) => ({
      ...turn,
      turnNumber: i + 1
    }));
    
    setFormData({
      ...formData,
      dialogueTurns: reorderedTurns
    });
  };

  // ダイアログターンの順序を変更（下へ移動）
  const handleMoveDialogueTurnDown = (index: number) => {
    if (index === formData.dialogueTurns.length - 1) return; // 既に末尾の場合は何もしない
    
    const updatedTurns = [...formData.dialogueTurns];
    const temp = updatedTurns[index];
    updatedTurns[index] = updatedTurns[index + 1];
    updatedTurns[index + 1] = temp;
    
    // ターン番号を振り直す
    const reorderedTurns = updatedTurns.map((turn, i) => ({
      ...turn,
      turnNumber: i + 1
    }));
    
    setFormData({
      ...formData,
      dialogueTurns: reorderedTurns
    });
  };

  // レッスンデータをJSONファイルとしてエクスポート
  const handleExportLessons = () => {
    try {
      // JSONデータを作成
      const jsonData = JSON.stringify(lessons, null, 2);
      
      // Blobを作成
      const blob = new Blob([jsonData], { type: 'application/json' });
      
      // ダウンロードリンクを作成
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sozo-lessons-${new Date().toISOString().split('T')[0]}.json`;
      
      // リンクをクリックしてダウンロード
      document.body.appendChild(a);
      a.click();
      
      // クリーンアップ
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
      
      alert('レッスンデータのエクスポートが完了しました。');
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert('エクスポート中にエラーが発生しました。');
    }
  };
  
  // ファイル選択のための参照
  const importFileInputRef = useRef<HTMLInputElement>(null);
  
  // ファイル選択ダイアログを開く
  const handleOpenImportDialog = () => {
    if (importFileInputRef.current) {
      importFileInputRef.current.click();
    }
  };
  
  // レッスンデータをJSONファイルからインポート
  const handleImportLessons = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = event.target?.result as string;
        const importedLessons = JSON.parse(jsonData) as Lesson[];
        
        // バリデーション（最低限の型チェック）
        if (!Array.isArray(importedLessons)) {
          throw new Error('インポートされたデータはレッスンの配列ではありません。');
        }
        
        // 各レッスンが必要なプロパティを持っているか確認
        importedLessons.forEach((lesson, index) => {
          if (!lesson.id || !lesson.title || !lesson.level || !Array.isArray(lesson.tags)) {
            throw new Error(`レッスン #${index + 1} に必要なプロパティがありません。`);
          }
        });
        
        // インポート前に確認
        if (window.confirm(`${importedLessons.length}件のレッスンをインポートします。既存のレッスンデータは上書きされます。よろしいですか？`)) {
          setLessons(importedLessons);
          localStorage.setItem('lessons', jsonData);
          alert('レッスンデータのインポートが完了しました。');
          
          // 現在選択中のレッスンがあれば更新
          if (currentLesson && importedLessons.length > 0) {
            const foundLesson = importedLessons.find(l => l.id === currentLesson.id);
            if (foundLesson) {
              setCurrentLesson(foundLesson);
              onSelectLesson(foundLesson);
            } else {
              setCurrentLesson(importedLessons[0]);
              onSelectLesson(importedLessons[0]);
            }
          }
        }
      } catch (error) {
        console.error('インポートエラー:', error);
        alert(`インポート中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
      
      // ファイル入力をリセット
      if (importFileInputRef.current) {
        importFileInputRef.current.value = '';
      }
    };
    
    reader.readAsText(file);
  };

  return (
    <div className="w-full">
      {(isAdding || isEditing) ? (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold mb-4">
            {isAdding ? 'レッスンを追加' : 'レッスンを編集'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">タイトル*</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">説明</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">PDFファイル</label>
              <div className="flex items-center">
                <input
                  type="text"
                  name="pdfUrl"
                  value={formData.pdfUrl}
                  onChange={handlePdfPathChange}
                  className="flex-1 p-2 border rounded-l focus:ring-blue-500 focus:border-blue-500 text-black"
                  placeholder="/pdfs/filename.pdf"
                />
                <button
                  type="button"
                  onClick={handleFileSelection}
                  className="px-4 py-2 bg-gray-200 border border-gray-300 rounded-r hover:bg-gray-300 text-black"
                >
                  選択
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={() => {}} // 実際のアップロード処理
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                PDFはディレクトリに配置してください
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">システムプロンプト</label>
              <textarea
                name="systemPrompt"
                value={formData.systemPrompt}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                rows={3}
                placeholder="AIへの指示（オプション）"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">レベル</label>
              <select
                name="level"
                value={formData.level}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="beginner">初級</option>
                <option value="intermediate">中級</option>
                <option value="advanced">上級</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">タグ</label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                placeholder="カンマ区切りで入力（例：ビジネス, 挨拶）"
              />
            </div>
            
            {/* キーフレーズ設定 */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-medium mb-3">キーフレーズ設定</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">キーフレーズ（英語）</label>
                <input
                  type="text"
                  name="keyPhraseText"
                  value={formData.keyPhraseText}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                  placeholder="例: Would you like to do a treatment as well?"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">キーフレーズ（日本語訳）</label>
                <input
                  type="text"
                  name="keyPhraseTranslation"
                  value={formData.keyPhraseTranslation}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                  placeholder="例: トリートメントもされたいですか？"
                />
              </div>
            </div>
            
            {/* ダイアログ設定 */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-medium mb-3">ダイアログ設定</h3>
              <p className="text-sm text-gray-600 mb-2">
                スタッフと顧客の会話を設定します。役割を選択し、会話文とその翻訳を入力してください。
              </p>
              
              {/* カラムヘッダー */}
              <div className="flex items-center mb-2 font-semibold text-sm">
                <div className="w-20 text-center">役割</div>
                <div className="flex-1 ml-2">英語テキスト</div>
                <div className="flex-1 ml-2">日本語訳</div>
                <div className="w-28 ml-2 text-center">操作</div>
              </div>
              
              <div className="mb-4 space-y-3">
                {formData.dialogueTurns.map((turn, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 border rounded bg-gray-50">
                    <select
                      value={turn.role}
                      onChange={(e) => handleDialogueTurnChange(index, 'role', e.target.value)}
                      className="w-20 p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                    >
                      <option value="staff">スタッフ</option>
                      <option value="customer">顧客</option>
                    </select>
                    <input
                      type="text"
                      value={turn.text}
                      onChange={(e) => handleDialogueTurnChange(index, 'text', e.target.value)}
                      className="flex-1 p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="英語テキスト（例: Would you like to do a treatment as well?）"
                    />
                    <input
                      type="text"
                      value={turn.translation}
                      onChange={(e) => handleDialogueTurnChange(index, 'translation', e.target.value)}
                      className="flex-1 p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                      placeholder="日本語訳（例: トリートメントもされたいですか？）"
                    />
                    <div className="flex space-x-1">
                      {/* 上に移動ボタン */}
                      <button
                        type="button"
                        onClick={() => handleMoveDialogueTurnUp(index)}
                        disabled={index === 0}
                        className={`w-8 h-8 flex items-center justify-center rounded ${
                          index === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        }`}
                        title="上に移動"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path fillRule="evenodd" d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5z"/>
                        </svg>
                      </button>
                      
                      {/* 下に移動ボタン */}
                      <button
                        type="button"
                        onClick={() => handleMoveDialogueTurnDown(index)}
                        disabled={index === formData.dialogueTurns.length - 1}
                        className={`w-8 h-8 flex items-center justify-center rounded ${
                          index === formData.dialogueTurns.length - 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                        }`}
                        title="下に移動"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path fillRule="evenodd" d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/>
                        </svg>
                      </button>
                      
                      {/* 削除ボタン */}
                      <button
                        type="button"
                        onClick={() => handleRemoveDialogueTurn(index)}
                        className="w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 rounded hover:bg-red-200"
                        title="このターンを削除"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0v-6z"/>
                          <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                
                {formData.dialogueTurns.length === 0 && (
                  <div className="text-center py-4 text-gray-500 border rounded bg-gray-50">
                    ダイアログが設定されていません。「ターンを追加」ボタンからダイアログを追加してください。
                  </div>
                )}
                
                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    onClick={handleAddDialogueTurn}
                    className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 text-white flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-1" viewBox="0 0 16 16">
                      <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                    </svg>
                    ターンを追加
                  </button>
                </div>
              </div>
              
              {/* 従来の入力方法を非表示にし、互換性のために残す */}
              <input 
                type="hidden" 
                name="dialogueText" 
                value={formData.dialogueText} 
              />
            </div>
            
            {/* 目標設定 */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-medium mb-3">レッスン目標設定</h3>
              <p className="text-sm text-gray-600 mb-2">
                各行に1つの目標を入力してください。行ごとに別々の目標として表示されます。
              </p>
              <div className="mb-4">
                <textarea
                  name="goalsText"
                  value={formData.goalsText}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                  rows={4}
                  placeholder='トリートメントなどの追加メニューを自然におすすめできるようになる
「Would you like to～?」の言い方に慣れる
サロンでよく使う英語の言葉を覚える'
                />
              </div>
            </div>
            
            {/* カスタムテキスト設定 */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-medium mb-3">カスタムテキスト設定</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">ヘッダータイトル</label>
                <input
                  type="text"
                  name="headerTitle"
                  value={formData.headerTitle}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                  placeholder="例: レッスン29: Would you like to do a treatment as well?"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">開始ボタンテキスト</label>
                <input
                  type="text"
                  name="startButtonText"
                  value={formData.startButtonText}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                  placeholder="例: レッスン開始"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setIsEditing(false);
                }}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-black"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSaveLesson}
                className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 text-white"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">レッスン一覧</h2>
            <div className="flex space-x-2">
              <button
                onClick={handleExportLessons}
                className="px-3 py-1 bg-blue-500 rounded hover:bg-blue-600 text-white text-sm flex items-center"
                title="レッスンデータをJSONファイルとしてエクスポート"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-1" viewBox="0 0 16 16">
                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                </svg>
                エクスポート
              </button>
              <button
                onClick={handleOpenImportDialog}
                className="px-3 py-1 bg-purple-500 rounded hover:bg-purple-600 text-white text-sm flex items-center"
                title="JSONファイルからレッスンデータをインポート"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-1" viewBox="0 0 16 16">
                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                  <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                </svg>
                インポート
              </button>
              <button
                onClick={handleStartAdd}
                className="px-3 py-1 bg-green-500 rounded hover:bg-green-600 text-white text-sm flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-1" viewBox="0 0 16 16">
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                新規追加
              </button>
              
              {/* 非表示のファイル入力フィールド */}
              <input
                ref={importFileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportLessons}
              />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {lessons.map(lesson => (
                <li key={lesson.id} className={`p-4 hover:bg-gray-50 ${currentLesson?.id === lesson.id ? 'bg-blue-50' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => handleSelectLesson(lesson)}
                    >
                      <h3 className="font-medium text-black">{lesson.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                      
                      {/* レッスンの直接URL */}
                      <div className="mt-2 mb-2 flex items-center">
                        <span className="text-xs text-gray-500 mr-1">URL:</span>
                        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-blue-600 truncate max-w-[200px] inline-block">
                          {typeof window !== 'undefined' ? `${window.location.origin}/lesson/${lesson.id}` : `/lesson/${lesson.id}`}
                        </code>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // 親要素のクリックイベントを防止
                            if (typeof window !== 'undefined') {
                              navigator.clipboard.writeText(`${window.location.origin}/lesson/${lesson.id}`);
                              alert('URLをコピーしました！');
                            }
                          }}
                          className="ml-1 text-xs text-blue-500 hover:text-blue-700"
                          title="URLをコピー"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                          </svg>
                        </button>
                      </div>
                      
                      <div className="flex items-center mt-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          lesson.level === 'beginner' ? 'bg-green-100 text-green-800' :
                          lesson.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {lesson.level === 'beginner' ? '初級' : 
                           lesson.level === 'intermediate' ? '中級' : '上級'}
                        </span>
                        
                        <div className="ml-2 flex flex-wrap gap-1">
                          {lesson.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleStartEdit(lesson)}
                        className="p-1 text-blue-500 hover:bg-blue-100 rounded"
                        title="編集"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteLesson(lesson.id)}
                        className="p-1 text-red-500 hover:bg-red-100 rounded"
                        title="削除"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0v-6z"/>
                          <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              
              {lessons.length === 0 && (
                <li className="p-6 text-center text-gray-500">
                  レッスンがありません。「新規追加」ボタンからレッスンを追加してください。
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}