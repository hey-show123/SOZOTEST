'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// ChatModeタイプをai-lessonのみに制限
export type ChatMode = 'ai-lesson';

type ChatModeContextType = {
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
};

// カスタムイベントの型定義
declare global {
  interface WindowEventMap {
    'set-lesson-mode': CustomEvent<{ mode: ChatMode }>;
  }
}

const ChatModeContext = createContext<ChatModeContextType | undefined>(undefined);

export function ChatModeProvider({ children }: { children: ReactNode }) {
  // 初期値は常にai-lessonに設定
  const [mode, setMode] = useState<ChatMode>('ai-lesson');
  const [isClient, setIsClient] = useState(false);

  // クライアントサイドでのみ実行される初期化処理
  useEffect(() => {
    setIsClient(true);
    // モードはai-lessonのみになったので、保存する必要はありません
  }, []);

  // モードが変更されたときにローカルストレージに保存（今回は実質使用されない）
  useEffect(() => {
    if (isClient) {
      try {
        localStorage.setItem('chatMode', mode);
      } catch (error) {
        console.error('LocalStorage保存エラー:', error);
      }
    }
  }, [mode, isClient]);

  // カスタムイベントリスナーの登録（レッスンページからのモード設定用）
  useEffect(() => {
    if (!isClient) return;

    const handleSetLessonMode = (event: CustomEvent<{ mode: ChatMode }>) => {
      console.log('モード変更イベントを受信:', event.detail.mode);
      if (event.detail.mode === 'ai-lesson') {
        setMode(event.detail.mode);
      }
    };

    // イベントリスナーの登録
    window.addEventListener('set-lesson-mode', handleSetLessonMode as EventListener);

    // クリーンアップ
    return () => {
      window.removeEventListener('set-lesson-mode', handleSetLessonMode as EventListener);
    };
  }, [isClient]);

  return (
    <ChatModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ChatModeContext.Provider>
  );
}

export function useChatMode() {
  const context = useContext(ChatModeContext);
  if (context === undefined) {
    throw new Error('useChatMode must be used within a ChatModeProvider');
  }
  return context;
} 