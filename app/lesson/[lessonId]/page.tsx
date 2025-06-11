'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChatModeProvider } from '../../context/ChatModeContext';
import { VoiceProvider } from '../../context/VoiceContext';
import { ModelProvider } from '../../context/ModelContext';
import Chat from '../../components/Chat';
import ModeSelector from '../../components/ModeSelector';
import { Lesson } from '../../components/lessons/LessonManager';

type LessonPageProps = {
  params: {
    lessonId: string;
  };
};

export default function LessonPage({ params }: LessonPageProps) {
  const { lessonId } = params;
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // レッスンデータをローカルストレージから取得
  useEffect(() => {
    const fetchLesson = async () => {
      try {
        console.log(`レッスンID「${lessonId}」の取得を開始します...`);
        setIsLoading(true);
        
        // レッスンの取得を複数の方法で試みる
        let foundLesson = null;
        
        // 1. Supabaseから直接取得（最も信頼性が高い方法）
        try {
          console.log('Supabaseから直接レッスンデータを取得しています...');
          // Supabaseクライアントをインポート
          const { supabase } = await import('../../lib/supabase');
          
          // Supabaseからレッスンデータを取得
          const { data, error } = await supabase
            .from('lessons')
            .select('*')
            .eq('id', lessonId)
            .single();
          
          if (error) {
            console.error('Supabaseからのデータ取得エラー:', error);
          } else if (data) {
            console.log('Supabaseからレッスンデータを取得しました:', data);
            foundLesson = data;
          }
        } catch (supabaseError) {
          console.error('Supabase直接アクセスエラー:', supabaseError);
        }
        
        // 2. APIから取得（Supabaseから取得できない場合）
        if (!foundLesson) {
          try {
            console.log('APIからレッスンデータを取得しています...');
            const response = await fetch(`/api/lesson/${lessonId}`);
            
            if (response.ok) {
              const data = await response.json();
              if (data.lesson) {
                console.log('APIからレッスンデータを取得しました:', data.lesson);
                foundLesson = data.lesson;
              }
            } else {
              console.error('APIからのデータ取得に失敗:', response.status);
            }
          } catch (apiError) {
            console.error('APIアクセスエラー:', apiError);
          }
        }
        
        // 3. 全レッスンAPIから取得
        if (!foundLesson) {
          try {
            console.log('全レッスンAPIからデータを取得しています...');
            const response = await fetch('/api/lessons');
            
            if (response.ok) {
              const data = await response.json();
              if (data.lessons && Array.isArray(data.lessons)) {
                const matchingLesson = data.lessons.find((l: Lesson) => l.id === lessonId);
                if (matchingLesson) {
                  console.log('全レッスンAPIからデータを取得しました:', matchingLesson);
                  foundLesson = matchingLesson;
                }
              }
            }
          } catch (allLessonsError) {
            console.error('全レッスンAPI取得エラー:', allLessonsError);
          }
        }
        
        // 4. ローカルストレージから取得
        if (!foundLesson) {
          try {
            console.log('ローカルストレージからデータ取得を試みます...');
            const savedLessons = localStorage.getItem('lessons');
            if (savedLessons) {
              const lessons = JSON.parse(savedLessons);
              const matchingLesson = lessons.find((l: Lesson) => l.id === lessonId);
              if (matchingLesson) {
                console.log('ローカルストレージからデータを取得しました:', matchingLesson);
                foundLesson = matchingLesson;
              }
            }
          } catch (localStorageError) {
            console.error('ローカルストレージエラー:', localStorageError);
          }
        }
        
        // 5. デフォルトレッスンから取得
        if (!foundLesson) {
          try {
            console.log('デフォルトレッスンからデータ取得を試みます...');
            const { DEFAULT_LESSONS } = await import('../../constants/defaultLessons');
            const matchingLesson = DEFAULT_LESSONS.find(l => l.id === lessonId);
            if (matchingLesson) {
              console.log('デフォルトレッスンからデータを取得しました:', matchingLesson);
              foundLesson = matchingLesson;
            }
          } catch (defaultLessonsError) {
            console.error('デフォルトレッスン取得エラー:', defaultLessonsError);
          }
        }

        // データが見つかったらレッスンを設定
        if (foundLesson) {
          console.log('最終的に取得したレッスンデータ:', foundLesson);
          setLesson(foundLesson);
          
          // セッションストレージに保存
          if (foundLesson.pdfUrl) {
            sessionStorage.setItem('currentLessonPdf', foundLesson.pdfUrl);
          }
          if (foundLesson.systemPrompt) {
            sessionStorage.setItem('currentLessonPrompt', foundLesson.systemPrompt);
          }
          sessionStorage.setItem('currentLessonId', foundLesson.id);
          
          // ローカルストレージにも保存（キャッシュとして）
          try {
            const savedLessons = localStorage.getItem('lessons');
            let lessons = savedLessons ? JSON.parse(savedLessons) : [];
            
            // 既存のレッスンを更新または新しいレッスンを追加
            const existingIndex = lessons.findIndex((l: Lesson) => l.id === foundLesson.id);
            if (existingIndex >= 0) {
              lessons[existingIndex] = foundLesson;
            } else {
              lessons.push(foundLesson);
            }
            
            localStorage.setItem('lessons', JSON.stringify(lessons));
            console.log('レッスンデータをローカルストレージに保存しました');
          } catch (saveError) {
            console.error('ローカルストレージ保存エラー:', saveError);
          }
        } else {
          console.error(`レッスンID「${lessonId}」が見つかりませんでした`);
          setError(`レッスンID「${lessonId}」が見つかりません。`);
        }
      } catch (error) {
        console.error('レッスンデータ取得中のエラー:', error);
        setError('レッスンデータの読み込み中にエラーが発生しました。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLesson();
  }, [lessonId]);

  // ページロード時にカスタムイベントを発生させて、AIレッスンモードを自動選択
  useEffect(() => {
    if (isLoading || error || !lesson) return;
    
    // DOM要素が完全に読み込まれてから実行
    const timer = setTimeout(() => {
      try {
        // カスタムイベントを作成して「AIレッスン」モードを選択
        const setLessonModeEvent = new CustomEvent('set-lesson-mode', {
          detail: { mode: 'ai-lesson' }
        });
        window.dispatchEvent(setLessonModeEvent);
        
        // レッスン開始イベントを発生させる
        const startLessonEvent = new CustomEvent('start-lesson');
        window.dispatchEvent(startLessonEvent);
        
        console.log(`レッスン「${lesson.title}」を自動開始しました`);
      } catch (error) {
        console.error('レッスンモードの自動設定に失敗しました:', error);
      }
    }, 500); // 少し遅延させてDOM読み込み完了を待つ

    return () => clearTimeout(timer);
  }, [isLoading, error, lesson]);

  // エラー表示
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-blue-50 via-indigo-50 to-white">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">エラー</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  // ローディング表示
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-700">レッスンを読み込み中...</p>
      </div>
    );
  }

  return (
    <ChatModeProvider>
      <ModelProvider>
        <VoiceProvider>
          <main className="flex min-h-screen flex-col items-center justify-between p-2 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-b from-blue-50 via-indigo-50 to-white dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-800 transition-colors duration-500">
            <header className="z-10 w-full max-w-5xl flex items-center justify-between mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-violet-500/10 filter blur-xl rounded-xl"></div>
              <h1 className="w-full text-center py-4 px-6 text-xl font-bold bg-white/80 dark:bg-slate-800/80 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 glass-effect relative z-10">
                <span className="bg-gradient-to-r from-blue-600 to-violet-600 text-transparent bg-clip-text font-extrabold">
                  {lesson?.title || 'AI英会話レッスン'} 
                </span>
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-violet-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              </h1>
            </header>
            
            <div className="w-full max-w-5xl mt-4 card-fancy fade-in bg-white/95 dark:bg-slate-800/95 shadow-2xl">
              <ModeSelector />
              <Chat />
            </div>

            <footer className="w-full mt-6">
              <p className="fixed bottom-0 left-0 flex w-full justify-center py-3 text-center text-sm glass-effect bg-white/80 dark:bg-slate-900/80 border-t border-gray-200 dark:border-slate-700">
                <span className="relative px-6 py-1">
                  © {new Date().getFullYear()} <span className="font-semibold mx-1 text-gradient">SOZOの教室</span>
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-violet-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                </span>
              </p>
            </footer>
          </main>
        </VoiceProvider>
      </ModelProvider>
    </ChatModeProvider>
  );
} 