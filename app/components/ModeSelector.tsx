'use client';

import { useChatMode, ChatMode } from '../context/ChatModeContext';
import { useCallback, useState, useEffect } from 'react';

// カスタムイベントの型定義
declare global {
  interface WindowEventMap {
    'reset-chat': CustomEvent;
  }
}

export default function ModeSelector() {
  const { mode, setMode } = useChatMode();
  const [isClient, setIsClient] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // クライアントサイドでのみ実行される初期化処理
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleModeChange = useCallback((newMode: ChatMode) => {
    if (mode !== newMode) {
      setIsAnimating(true);
      // モードを変更
      setMode(newMode);
      
      // カスタムイベントを発行してチャットをリセット
      const resetEvent = new CustomEvent('reset-chat');
      window.dispatchEvent(resetEvent);
      
      // アニメーション終了後に状態をリセット
      setTimeout(() => {
        setIsAnimating(false);
      }, 500);
    }
  }, [mode, setMode]);

  // サーバーサイドレンダリング時は何も表示しない
  if (!isClient) {
    return (
      <div className="flex justify-center gap-4 mb-6 p-4">
        <div className="px-6 py-3 rounded-full bg-gray-200/50 text-gray-500 animate-pulse">
          <div className="h-5 w-32 bg-gray-300/80 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center mb-8 p-4 relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
      
      <h2 className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4 font-medium">
        モードを選択
      </h2>
      
      <div className="flex justify-center gap-3 relative p-1 bg-gray-100 dark:bg-slate-700/50 rounded-full backdrop-blur-sm shadow-inner">
        <button
          onClick={() => handleModeChange('free-talk')}
          className={`relative px-5 py-2.5 rounded-full transition-all duration-300 ${
            mode === 'free-talk'
              ? 'text-white shadow-lg scale-105'
              : 'bg-transparent hover:bg-gray-200/80 dark:hover:bg-slate-600/80 text-gray-700 dark:text-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 focus:ring-opacity-50`}
          disabled={isAnimating}
        >
          {mode === 'free-talk' && (
            <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full -z-10"></span>
          )}
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            フリートーク
          </span>
        </button>
        
        <button
          onClick={() => handleModeChange('ai-lesson')}
          className={`relative px-5 py-2.5 rounded-full transition-all duration-300 ${
            mode === 'ai-lesson'
              ? 'text-white shadow-lg scale-105'
              : 'bg-transparent hover:bg-gray-200/80 dark:hover:bg-slate-600/80 text-gray-700 dark:text-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-700 focus:ring-opacity-50`}
          disabled={isAnimating}
        >
          {mode === 'ai-lesson' && (
            <span className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full -z-10"></span>
          )}
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            AIレッスン
          </span>
        </button>
      </div>
      
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
    </div>
  );
} 