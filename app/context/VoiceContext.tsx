'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// OpenAI TTS APIがサポートする声の種類
export type VoiceType = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' | 'ash' | 'sage' | 'coral' | 'ballad' | 'verse';

// 声の情報を定義
export const VOICE_INFO = {
  alloy: { name: 'Alloy', description: 'バランスの取れた中性的な声' },
  echo: { name: 'Echo', description: '深みのある男性的な声' },
  fable: { name: 'Fable', description: '暖かみのある中性的な声' },
  onyx: { name: 'Onyx', description: '力強い男性的な声' },
  nova: { name: 'Nova', description: '優しい女性的な声' },
  shimmer: { name: 'Shimmer', description: '明るい女性的な声' },
  ash: { name: 'Ash', description: '穏やかな男性的な声' },
  sage: { name: 'Sage', description: '落ち着いた中性的な声' },
  coral: { name: 'Coral', description: '表現力豊かな女性的な声' },
  ballad: { name: 'Ballad', description: '柔らかく感情豊かな声' },
  verse: { name: 'Verse', description: '多彩な表現が可能な声' }
};

type VoiceContextType = {
  voice: VoiceType;
  setVoice: (voice: VoiceType) => void;
  voiceInfo: typeof VOICE_INFO;
};

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: ReactNode }) {
  // 初期値はechoを使用（サーバーサイドレンダリングの一貫性のため）
  const [voice, setVoice] = useState<VoiceType>('echo');
  const [isClient, setIsClient] = useState(false);

  // クライアントサイドでのみ実行される初期化処理
  useEffect(() => {
    setIsClient(true);
    try {
      const savedVoice = localStorage.getItem('ttsVoice');
      if (savedVoice && Object.keys(VOICE_INFO).includes(savedVoice)) {
        setVoice(savedVoice as VoiceType);
      }
    } catch (error) {
      console.error('LocalStorage読み込みエラー:', error);
    }
  }, []);

  // 声が変更されたときにローカルストレージに保存
  useEffect(() => {
    if (isClient) {
      try {
        localStorage.setItem('ttsVoice', voice);
      } catch (error) {
        console.error('LocalStorage保存エラー:', error);
      }
    }
  }, [voice, isClient]);

  return (
    <VoiceContext.Provider value={{ voice, setVoice, voiceInfo: VOICE_INFO }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
} 