'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type ChatMode = 'free-talk' | 'ai-lesson';

type ChatModeContextType = {
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;
};

const ChatModeContext = createContext<ChatModeContextType | undefined>(undefined);

export function ChatModeProvider({ children }: { children: ReactNode }) {
  // 初期値は常に一定の値を使用（サーバーサイドレンダリングの一貫性のため）
  const [mode, setMode] = useState<ChatMode>('free-talk');
  const [isClient, setIsClient] = useState(false);

  // クライアントサイドでのみ実行される初期化処理
  useEffect(() => {
    setIsClient(true);
    try {
      const savedMode = localStorage.getItem('chatMode');
      // 古いモード名を新しいモード名に変換
      if (savedMode === 'beauty-customer') {
        setMode('free-talk');
      } else if (savedMode === 'english-tutor') {
        setMode('ai-lesson');
      } else if (savedMode === 'free-talk' || savedMode === 'ai-lesson') {
        setMode(savedMode as ChatMode);
      }
    } catch (error) {
      console.error('LocalStorage読み込みエラー:', error);
    }
  }, []);

  // モードが変更されたときにローカルストレージに保存
  useEffect(() => {
    if (isClient) {
      try {
        localStorage.setItem('chatMode', mode);
      } catch (error) {
        console.error('LocalStorage保存エラー:', error);
      }
    }
  }, [mode, isClient]);

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