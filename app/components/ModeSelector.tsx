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

  // クライアントサイドでのみ実行される初期化処理
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleModeChange = useCallback((newMode: ChatMode) => {
    if (mode !== newMode) {
      // モードを変更
      setMode(newMode);
      
      // カスタムイベントを発行してチャットをリセット
      const resetEvent = new CustomEvent('reset-chat');
      window.dispatchEvent(resetEvent);
    }
  }, [mode, setMode]);

  // サーバーサイドレンダリング時は何も表示しない
  if (!isClient) {
    return (
      <div className="flex justify-center gap-4 mb-6">
        <div className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-4 mb-6">
      <button
        onClick={() => handleModeChange('free-talk')}
        className={`px-4 py-2 rounded-lg transition-colors ${
          mode === 'free-talk'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
        }`}
      >
        フリートーク
      </button>
      <button
        onClick={() => handleModeChange('ai-lesson')}
        className={`px-4 py-2 rounded-lg transition-colors ${
          mode === 'ai-lesson'
            ? 'bg-blue-500 text-white'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
        }`}
      >
        AIレッスン
      </button>
    </div>
  );
} 