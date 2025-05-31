'use client';

import { useState, useEffect, useRef } from 'react';

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
};

// 初期レッスンデータ
const DEFAULT_LESSONS: Lesson[] = [
  {
    id: 'sozo-med-lesson',
    title: 'SOZOの教室 医療英語レッスン',
    description: '医療現場で使える英語フレーズを学びます。基本的な問診や診察に関する表現を練習しましょう。',
    pdfUrl: '/pdfs/sozo_med_29.pdf',
    systemPrompt: 'あなたは医療英語を教える優秀な英語教師です。PDFの内容に沿って、医療現場で使う英語を丁寧に教えてください。学習者が理解しやすいように、例文や状況に応じた会話例を提示し、適切なフィードバックを行ってください。',
    level: 'intermediate',
    tags: ['医療', '英語', '問診'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
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
    tags: ''
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
      tags: ''
    });
    setIsAdding(true);
    setIsEditing(false);
  };

  // 編集モード開始
  const handleStartEdit = (lesson: Lesson) => {
    setFormData({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      pdfUrl: lesson.pdfUrl || '',
      systemPrompt: lesson.systemPrompt || '',
      level: lesson.level,
      tags: lesson.tags.join(', ')
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
      updatedAt: Date.now()
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
            <button
              onClick={handleStartAdd}
              className="px-3 py-1 bg-green-500 rounded hover:bg-green-600 text-white text-sm flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-1" viewBox="0 0 16 16">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
              新規追加
            </button>
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
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
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