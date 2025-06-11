'use client';

import Chat from './components/Chat';
import { ChatModeProvider } from './context/ChatModeContext';
import { VoiceProvider } from './context/VoiceContext';
import { ModelProvider } from './context/ModelContext';
import { useEffect } from 'react';

function HomePage() {
  // APIからレッスンデータを取得してローカルストレージに同期
  useEffect(() => {
    const syncLessonsData = async () => {
      try {
        console.log('レッスンデータの同期を開始します...');
        const response = await fetch('/api/lessons');
        
        if (response.ok) {
          const data = await response.json();
          if (data.lessons && Array.isArray(data.lessons)) {
            console.log(`APIから${data.lessons.length}件のレッスンデータを取得しました`);
            
            // ローカルストレージに保存
            localStorage.setItem('lessons', JSON.stringify(data.lessons));
            console.log('レッスンデータをローカルストレージに保存しました');
          } else {
            console.warn('APIからのレッスンデータが無効です:', data);
          }
        } else {
          console.error('APIからのレッスンデータ取得に失敗しました:', response.statusText);
        }
      } catch (error) {
        console.error('レッスンデータの同期エラー:', error);
      }
    };

    syncLessonsData();
  }, []);

  // ページロード時にカスタムイベントを発生させて、レッスンを自動開始
  useEffect(() => {
    // DOM要素が完全に読み込まれてから実行
    const timer = setTimeout(() => {
      try {
        // レッスン開始イベントを発生させる
        const startLessonEvent = new CustomEvent('start-lesson');
        window.dispatchEvent(startLessonEvent);
        
        console.log('レッスンを自動開始しました');
      } catch (error) {
        console.error('レッスンの自動開始に失敗しました:', error);
      }
    }, 500); // 少し遅延させてDOM読み込み完了を待つ

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-2 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-b from-blue-50 via-indigo-50 to-white dark:from-slate-900 dark:via-indigo-950/30 dark:to-slate-800 transition-colors duration-500">
      <header className="z-10 w-full max-w-5xl flex items-center justify-between mb-6 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-violet-500/10 filter blur-xl rounded-xl"></div>
        <h1 className="w-full text-center py-4 px-6 text-xl font-bold bg-white/80 dark:bg-slate-800/80 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 glass-effect relative z-10">
          <span className="bg-gradient-to-r from-blue-600 to-violet-600 text-transparent bg-clip-text font-extrabold">SOZOの教室</span>
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-violet-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </h1>
      </header>
      
      <div className="w-full max-w-5xl mt-4 card-fancy fade-in bg-white/95 dark:bg-slate-800/95 shadow-2xl">
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
  );
}

export default function Home() {
  return (
    <ChatModeProvider>
      <ModelProvider>
        <VoiceProvider>
          <HomePage />
        </VoiceProvider>
      </ModelProvider>
    </ChatModeProvider>
  );
}
