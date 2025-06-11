'use client';

import { useState, useEffect, useRef } from 'react';

export type Phrase = {
  text: string;
  translation: string;
  audioUrl?: string;
};

export type DialogueTurn = {
  role: 'staff' | 'customer';
  text: string;
  translation: string;
  turnNumber: number;
  audioUrl?: string;
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
  audioGenerated?: boolean;
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

  // フォームをリセットする関数
  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
      description: '',
      pdfUrl: '',
      systemPrompt: '',
      level: 'beginner',
      tags: '',
      keyPhraseText: '',
      keyPhraseTranslation: '',
      dialogueText: '',
      dialogueTurns: [],
      goalsText: '',
      headerTitle: '',
      startButtonText: ''
    });
    setCurrentLesson(null);
  };

  // コンポーネントマウント時にレッスンを読み込む
  useEffect(() => {
    // レッスンデータを取得する
    const fetchLessons = async () => {
      try {
        // API経由でレッスンデータを取得
        const response = await fetch('/api/lessons');
        
        // デバッグ情報を記録
        console.log('API Response Status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('API Response Data:', data);
          
          if (data.lessons && Array.isArray(data.lessons)) {
            console.log(`APIから${data.lessons.length}件のレッスンデータを取得しました`);
            
            // データが空の場合はデフォルトレッスンを使用して保存
            if (data.lessons.length === 0) {
              console.log('APIからのデータが空のため、デフォルトレッスンを使用します');
              setLessons(DEFAULT_LESSONS);
              localStorage.setItem('lessons', JSON.stringify(DEFAULT_LESSONS));
              
              // APIにも保存
              await saveLessonsToAPI(DEFAULT_LESSONS);
              return;
            }
            
            setLessons(data.lessons);
            localStorage.setItem('lessons', JSON.stringify(data.lessons));
            return;
          } else {
            console.log('APIからのレッスンデータが無効です:', data);
          }
        } else {
          console.error('APIからのレッスンデータ取得に失敗しました:', response.statusText);
        }
        
        // APIから取得できない場合はローカルストレージから取得
        const savedLessons = localStorage.getItem('lessons');
        if (savedLessons) {
          console.log('ローカルストレージからレッスンデータを取得しました');
          const parsedLessons = JSON.parse(savedLessons);
          setLessons(parsedLessons);
          
          // ローカルデータをAPIにも保存を試みる
          await saveLessonsToAPI(parsedLessons);
        } else {
          // 初期レッスンの保存
          console.log('デフォルトのレッスンデータを使用します');
          setLessons(DEFAULT_LESSONS);
          localStorage.setItem('lessons', JSON.stringify(DEFAULT_LESSONS));
          
          // APIにも保存
          await saveLessonsToAPI(DEFAULT_LESSONS);
        }
      } catch (error) {
        console.error('レッスンデータの読み込みエラー:', error);
        
        // エラー時はローカルのデフォルトレッスンを使用
        setLessons(DEFAULT_LESSONS);
        localStorage.setItem('lessons', JSON.stringify(DEFAULT_LESSONS));
        
        try {
          // エラー後もAPIへの保存を試みる
          await saveLessonsToAPI(DEFAULT_LESSONS);
        } catch (e) {
          console.error('エラー後のAPI保存も失敗:', e);
        }
      }
    };

    fetchLessons();
  }, []);

  // APIにレッスンデータを保存する関数
  const saveLessonsToAPI = async (lessonsData: Lesson[]) => {
    try {
      console.log(`${lessonsData.length}件のレッスンデータをAPIに保存します`);
      
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lessons: lessonsData }),
      });

      const responseData = await response.json();
      console.log('API保存レスポンス:', responseData);

      if (!response.ok) {
        console.error('APIへのレッスンデータ保存に失敗しました:', responseData);
        return false;
      } else {
        console.log('APIにレッスンデータを保存しました');
        return true;
      }
    } catch (error) {
      console.error('APIへのレッスンデータ保存エラー:', error);
      return false;
    }
  };

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

  // PDFファイルのドラッグアンドドロップ処理
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error' | 'warning'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    // ファイルを取得
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    // PDFファイル以外は拒否
    if (file.type !== 'application/pdf') {
      setUploadStatus('error');
      setUploadMessage('PDFファイルのみアップロードできます');
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadMessage('');
      }, 3000);
      return;
    }

    setUploadStatus('uploading');
    setUploadMessage('アップロード中...');

    try {
      // ファイル名を作成（例：lesson-123456789.pdf）
      const fileName = `${formData.id}.pdf`;
      
      // FormDataを作成
      const formDataObj = new FormData();
      formDataObj.append('file', file);
      formDataObj.append('fileName', fileName);
      
      try {
        // PDFアップロードAPIを呼び出す
        const response = await fetch('/api/upload-pdf', {
          method: 'POST',
          body: formDataObj
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'アップロードに失敗しました');
        }
        
        const data = await response.json();
        
        // アップロード成功時の処理
        setFormData(prev => ({
          ...prev,
          pdfUrl: data.url
        }));
        
        setUploadStatus('success');
        setUploadMessage(data.message || `ファイル "${file.name}" をアップロードしました`);
      } catch (apiError) {
        console.error('API呼び出しエラー:', apiError);
        
        // API呼び出しに失敗した場合はフォールバック処理
        // パス情報だけ更新し、実際のファイルは手動でアップロードが必要であることを通知
        const pdfUrl = `/pdfs/${fileName}`;
        setFormData(prev => ({
          ...prev,
          pdfUrl
        }));
        
        setUploadStatus('warning');
        setUploadMessage(`APIエラー: PDFパスを "${pdfUrl}" に設定しました。実際のファイルは手動でアップロードしてください。`);
      }
      
      // 3秒後にメッセージをクリア
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadMessage('');
      }, 5000);
      
    } catch (error) {
      console.error('PDFアップロードエラー:', error);
      setUploadStatus('error');
      setUploadMessage(error instanceof Error ? error.message : 'アップロードに失敗しました');
      
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadMessage('');
      }, 5000);
    }
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

  // レッスン保存
  const handleSaveLesson = () => {
    // フォームデータからレッスンオブジェクトを作成
    const newLesson: Lesson = {
      id: formData.id,
      title: formData.title,
      description: formData.description,
      pdfUrl: formData.pdfUrl,
      systemPrompt: formData.systemPrompt,
      level: formData.level,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      createdAt: isEditing && currentLesson ? currentLesson.createdAt : Date.now(),
      updatedAt: Date.now(),
      audioGenerated: isEditing && currentLesson ? currentLesson.audioGenerated : false,
      headerTitle: formData.headerTitle,
      startButtonText: formData.startButtonText
    };

    // キーフレーズの設定
    if (formData.keyPhraseText && formData.keyPhraseTranslation) {
      newLesson.keyPhrase = {
        text: formData.keyPhraseText,
        translation: formData.keyPhraseTranslation
      };
    }

    // ダイアログターンの設定
    if (formData.dialogueTurns && formData.dialogueTurns.length > 0) {
      newLesson.dialogueTurns = formData.dialogueTurns;
    }
    
    // ゴールの設定
    if (formData.goalsText) {
      newLesson.goals = formData.goalsText.split('\n')
        .map(goal => goal.trim())
        .filter(goal => goal)
        .map(goal => ({ text: goal }));
    }

    let updatedLessons: Lesson[];

    if (isEditing) {
      // 既存のレッスンを更新
      updatedLessons = lessons.map(lesson => 
        lesson.id === newLesson.id ? newLesson : lesson
      );
      setIsEditing(false);
    } else {
      // 新しいレッスンを追加
      updatedLessons = [...lessons, newLesson];
      setIsAdding(false);
    }

    // 状態とローカルストレージを更新
    setLessons(updatedLessons);
    localStorage.setItem('lessons', JSON.stringify(updatedLessons));
    
    // APIに保存
    saveLessonsToAPI(updatedLessons).then(success => {
      if (success) {
        console.log('レッスンがAPIに保存されました');
      } else {
        console.warn('レッスンのAPI保存に失敗しましたが、ローカルには保存されています');
      }
    });

    // フォームをリセット
    resetForm();

    // 親コンポーネントに選択中のレッスンを通知
    onSelectLesson(newLesson);
  };

  // レッスン削除
  const handleDeleteLesson = (id: string) => {
    if (window.confirm('このレッスンを削除してもよろしいですか？')) {
      const updatedLessons = lessons.filter(lesson => lesson.id !== id);
      
      // 状態とローカルストレージを更新
      setLessons(updatedLessons);
      localStorage.setItem('lessons', JSON.stringify(updatedLessons));
      
      // APIにも反映
      saveLessonsToAPI(updatedLessons).then(success => {
        if (success) {
          console.log('レッスン削除がAPIに反映されました');
        } else {
          console.warn('レッスン削除のAPI反映に失敗しましたが、ローカルには反映されています');
        }
      });

      // 編集中だった場合はリセット
      if (isEditing && currentLesson?.id === id) {
        setIsEditing(false);
        resetForm();
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
          localStorage.setItem('lessons', JSON.stringify(importedLessons));
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

  // TTS音声を生成する関数
  const generateAudioForLesson = async (lesson: Lesson) => {
    if (lesson.audioGenerated) {
      if (!confirm('音声はすでに生成されています。再生成しますか？')) {
        return;
      }
    }
    
    setUploadStatus('uploading');
    setUploadMessage('レッスン音声を生成中...');
    
    try {
      // 更新用のレッスンコピーを作成
      const updatedLesson = { ...lesson };
      
      // キーフレーズの音声を生成
      if (updatedLesson.keyPhrase) {
        const response = await fetch('/api/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: updatedLesson.keyPhrase.text,
            voice: 'nova', // デフォルトの声
            model: 'tts-1-hd', // 高品質モデル
            save: true // ファイルとして保存
          }),
        });
        
        if (!response.ok) {
          throw new Error('キーフレーズの音声生成に失敗しました');
        }
        
        const data = await response.json();
        updatedLesson.keyPhrase.audioUrl = data.audioUrl;
      }
      
      // ダイアログの音声を生成
      if (updatedLesson.dialogueTurns) {
        for (let i = 0; i < updatedLesson.dialogueTurns.length; i++) {
          const turn = updatedLesson.dialogueTurns[i];
          
          // スタッフの音声はノヴァ、顧客の音声はオニキスで生成
          const voice = turn.role === 'staff' ? 'nova' : 'onyx';
          
          const response = await fetch('/api/text-to-speech', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: turn.text,
              voice: voice,
              model: 'tts-1-hd', // 高品質モデル
              save: true // ファイルとして保存
            }),
          });
          
          if (!response.ok) {
            throw new Error(`ダイアログターン ${i+1} の音声生成に失敗しました`);
          }
          
          const data = await response.json();
          updatedLesson.dialogueTurns[i].audioUrl = data.audioUrl;
          
          // 進捗状況を更新
          setUploadMessage(`ダイアログ ${i+1}/${updatedLesson.dialogueTurns.length} の音声を生成中...`);
        }
      }
      
      // 音声生成完了フラグをセット
      updatedLesson.audioGenerated = true;
      updatedLesson.updatedAt = Date.now();
      
      // レッスンデータを更新
      const updatedLessons = lessons.map(l => 
        l.id === updatedLesson.id ? updatedLesson : l
      );
      
      setLessons(updatedLessons);
      localStorage.setItem('lessons', JSON.stringify(updatedLessons));
      
      // APIにも保存
      saveLessonsToAPI(updatedLessons);
      
      setUploadStatus('success');
      setUploadMessage('レッスン音声の生成が完了しました');
      
      // 現在のレッスンを更新
      if (currentLesson && currentLesson.id === updatedLesson.id) {
        setCurrentLesson(updatedLesson);
        onSelectLesson(updatedLesson);
      }
      
      // 3秒後にメッセージをクリア
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadMessage('');
      }, 3000);
      
    } catch (error) {
      console.error('音声生成エラー:', error);
      setUploadStatus('error');
      setUploadMessage('レッスン音声の生成に失敗しました');
    }
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
              <div className="flex mb-4">
                <input
                  type="text"
                  name="pdfUrl"
                  value={formData.pdfUrl}
                  onChange={handleInputChange}
                  className="flex-1 p-2 border rounded-l focus:ring-blue-500 focus:border-blue-500 text-black"
                  placeholder="/pdfs/filename.pdf"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.click();
                    }
                  }}
                  className="px-4 py-2 bg-gray-200 border border-gray-300 rounded-r hover:bg-gray-300 text-black"
                >
                  参照
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>

              {/* ドラッグアンドドロップ領域 */}
              <div 
                className={`p-6 mb-4 border-2 border-dashed rounded-lg text-center ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <p className="mb-2 text-sm text-gray-500">
                  PDFファイルをここにドラッグ&ドロップするか、「参照」ボタンをクリックして選択してください
                </p>
                <div className="text-xs text-gray-400 mt-2">
                  ※サーバーサイドの制限により、現在はPDFファイルは <code className="bg-gray-200 px-1 py-0.5 rounded">public/pdfs/</code> ディレクトリに手動で配置する必要があります。
                </div>
            </div>
            
              {/* アップロードステータス表示 */}
              {uploadStatus !== 'idle' && (
                <div className={`p-3 mb-4 rounded text-sm ${
                  uploadStatus === 'uploading' ? 'bg-blue-100 text-blue-700' :
                  uploadStatus === 'success' ? 'bg-green-100 text-green-700' :
                  uploadStatus === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {uploadMessage}
                </div>
              )}

              <p className="text-sm text-gray-500 mb-4">
                <strong>PDFファイルの配置について:</strong><br />
                1. PDFファイルは <code className="bg-gray-200 px-1 py-0.5 rounded">public/pdfs/</code> ディレクトリに置いてください。<br />
                2. ファイル名は <code className="bg-gray-200 px-1 py-0.5 rounded">{formData.id}.pdf</code> のようにレッスンIDと同じにすると管理しやすいです。<br />
                3. パスは <code className="bg-gray-200 px-1 py-0.5 rounded">/pdfs/ファイル名.pdf</code> の形式で指定してください。
              </p>

              <label className="block mb-4">
                <span className="text-gray-700">システムプロンプト:</span>
              <textarea
                name="systemPrompt"
                value={formData.systemPrompt}
                onChange={handleInputChange}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                rows={3}
                placeholder="AIへの指示（オプション）"
              />
              </label>
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
                          {typeof window !== 'undefined' ? `${window.location.origin}/lesson/${lesson.id}?preview=1` : `/lesson/${lesson.id}?preview=1`}
                        </code>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // 親要素のクリックイベントを防止
                            if (typeof window !== 'undefined') {
                              navigator.clipboard.writeText(`${window.location.origin}/lesson/${lesson.id}?preview=1`);
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
                      
                      {/* LearnWorlds用iframeコード */}
                      <div className="mb-2 flex items-center">
                        <span className="text-xs text-gray-500 mr-1">LW用:</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // 親要素のクリックイベントを防止
                            if (typeof window !== 'undefined') {
                              navigator.clipboard.writeText(`<iframe src="${window.location.origin}/lesson/${lesson.id}?preview=1" width="100%" height="700" frameborder="0" allowfullscreen></iframe>`);
                              alert('LearnWorlds用iframeコードをコピーしました！');
                            }
                          }}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200 transition"
                        >
                          iframeコードをコピー
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
                        onClick={(e) => {
                          e.stopPropagation();
                          generateAudioForLesson(lesson);
                        }}
                        className="p-1 text-green-600 hover:text-green-800"
                        title="音声生成"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`「${lesson.title}」を削除してもよろしいですか？`)) {
                            handleDeleteLesson(lesson.id);
                          }
                        }}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="削除"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
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