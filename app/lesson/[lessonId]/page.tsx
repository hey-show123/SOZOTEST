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
    try {
      const savedLessons = localStorage.getItem('lessons');
      if (savedLessons) {
        const lessons = JSON.parse(savedLessons) as Lesson[];
        const foundLesson = lessons.find(l => l.id === lessonId);
        
        if (foundLesson) {
          setLesson(foundLesson);
          
          // レッスンが見つかったらPDFのURLをセッションストレージに保存
          // このデータは別のコンポーネントで使用されます
          if (foundLesson.pdfUrl) {
            sessionStorage.setItem('currentLessonPdf', foundLesson.pdfUrl);
          }
          
          // システムプロンプトがあれば保存
          if (foundLesson.systemPrompt) {
            sessionStorage.setItem('currentLessonPrompt', foundLesson.systemPrompt);
          }
          
          // レッスンIDを保存
          sessionStorage.setItem('currentLessonId', foundLesson.id);
        } else {
          setError(`レッスンID「${lessonId}」が見つかりません。`);
        }
      } else {
        setError('レッスンデータがありません。');
      }
    } catch (error) {
      setError('レッスンデータの読み込み中にエラーが発生しました。');
      console.error('レッスンデータの読み込みエラー:', error);
    } finally {
      setIsLoading(false);
    }
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