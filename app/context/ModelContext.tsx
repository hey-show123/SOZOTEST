'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// 各モデルタイプの定義
export type ChatModelType = 'gpt-4.1' | 'gpt-4.1-mini' | 'gpt-4.1-nano' | 'gpt-4o' | 'gpt-4o-mini';
export type WhisperModelType = 'whisper-1';
export type TTSModelType = 'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts';

// モデル情報の定義
export const CHAT_MODEL_INFO = {
  'gpt-4.1': { 
    name: 'GPT-4.1', 
    description: '最新の汎用モデル、最大100万トークンのコンテキスト対応' 
  },
  'gpt-4.1-mini': { 
    name: 'GPT-4.1 Mini', 
    description: 'GPT-4.1の軽量版、優れたコスト効率と性能' 
  },
  'gpt-4.1-nano': { 
    name: 'GPT-4.1 Nano', 
    description: '最速・最安のGPT-4.1バリエーション' 
  },
  'gpt-4o': { 
    name: 'GPT-4o', 
    description: 'マルチモーダル処理に対応した最新モデル' 
  },
  'gpt-4o-mini': { 
    name: 'GPT-4o Mini', 
    description: 'GPT-4oの軽量版、高速でコスト効率に優れる' 
  }
};

export const WHISPER_MODEL_INFO = {
  'whisper-1': { 
    name: 'Whisper-1', 
    description: '標準的な音声認識モデル' 
  }
};

export const TTS_MODEL_INFO = {
  'tts-1': { 
    name: 'TTS-1', 
    description: '標準的なテキスト読み上げモデル' 
  },
  'tts-1-hd': { 
    name: 'TTS-1 HD', 
    description: '高音質なテキスト読み上げモデル' 
  },
  'gpt-4o-mini-tts': { 
    name: 'GPT-4o Mini TTS', 
    description: 'プロンプトで声質を調整できる高度な音声合成モデル' 
  }
};

// GPT-4o Miniの追加設定
export interface GPT4oMiniSettings {
  vision: boolean;
  codeInterpreter: boolean;
  retrieval: boolean;
}

// GPT-4o Mini TTSの追加設定
export interface TTSPromptSettings {
  useCustomPrompt: boolean;
  voicePrompt: string;
}

type ModelContextType = {
  chatModel: ChatModelType;
  setChatModel: (model: ChatModelType) => void;
  whisperModel: WhisperModelType;
  setWhisperModel: (model: WhisperModelType) => void;
  ttsModel: TTSModelType;
  setTtsModel: (model: TTSModelType) => void;
  gpt4oMiniSettings: GPT4oMiniSettings;
  updateGpt4oMiniSettings: (settings: Partial<GPT4oMiniSettings>) => void;
  ttsPromptSettings: TTSPromptSettings;
  updateTtsPromptSettings: (settings: Partial<TTSPromptSettings>) => void;
  chatModelInfo: typeof CHAT_MODEL_INFO;
  whisperModelInfo: typeof WHISPER_MODEL_INFO;
  ttsModelInfo: typeof TTS_MODEL_INFO;
};

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({ children }: { children: ReactNode }) {
  // 初期値の設定
  const [chatModel, setChatModel] = useState<ChatModelType>('gpt-4o-mini');
  const [whisperModel, setWhisperModel] = useState<WhisperModelType>('whisper-1');
  const [ttsModel, setTtsModel] = useState<TTSModelType>('tts-1');
  const [gpt4oMiniSettings, setGpt4oMiniSettings] = useState<GPT4oMiniSettings>({
    vision: false,
    codeInterpreter: false,
    retrieval: false
  });
  const [ttsPromptSettings, setTtsPromptSettings] = useState<TTSPromptSettings>({
    useCustomPrompt: false,
    voicePrompt: 'あなたは落ち着いた声で読み上げてください'
  });
  const [isClient, setIsClient] = useState(false);

  // クライアントサイドでのみ実行される初期化処理
  useEffect(() => {
    setIsClient(true);
    try {
      // ChatGPTモデルの読み込み
      const savedChatModel = localStorage.getItem('chatModel');
      if (savedChatModel && Object.keys(CHAT_MODEL_INFO).includes(savedChatModel)) {
        setChatModel(savedChatModel as ChatModelType);
      }

      // Whisperモデルの読み込み
      const savedWhisperModel = localStorage.getItem('whisperModel');
      if (savedWhisperModel && Object.keys(WHISPER_MODEL_INFO).includes(savedWhisperModel)) {
        setWhisperModel(savedWhisperModel as WhisperModelType);
      }

      // TTSモデルの読み込み
      const savedTtsModel = localStorage.getItem('ttsModel');
      if (savedTtsModel && Object.keys(TTS_MODEL_INFO).includes(savedTtsModel)) {
        setTtsModel(savedTtsModel as TTSModelType);
      }

      // GPT-4o Mini設定の読み込み
      const savedGpt4oMiniSettings = localStorage.getItem('gpt4oMiniSettings');
      if (savedGpt4oMiniSettings) {
        setGpt4oMiniSettings(JSON.parse(savedGpt4oMiniSettings));
      }

      // TTS Prompt設定の読み込み
      const savedTtsPromptSettings = localStorage.getItem('ttsPromptSettings');
      if (savedTtsPromptSettings) {
        setTtsPromptSettings(JSON.parse(savedTtsPromptSettings));
      }
    } catch (error) {
      console.error('LocalStorage読み込みエラー:', error);
    }
  }, []);

  // 設定が変更されたときにローカルストレージに保存
  useEffect(() => {
    if (isClient) {
      try {
        localStorage.setItem('chatModel', chatModel);
        localStorage.setItem('whisperModel', whisperModel);
        localStorage.setItem('ttsModel', ttsModel);
        localStorage.setItem('gpt4oMiniSettings', JSON.stringify(gpt4oMiniSettings));
        localStorage.setItem('ttsPromptSettings', JSON.stringify(ttsPromptSettings));
      } catch (error) {
        console.error('LocalStorage保存エラー:', error);
      }
    }
  }, [chatModel, whisperModel, ttsModel, gpt4oMiniSettings, ttsPromptSettings, isClient]);

  // GPT-4o Mini設定の更新
  const updateGpt4oMiniSettings = (settings: Partial<GPT4oMiniSettings>) => {
    setGpt4oMiniSettings(prev => ({ ...prev, ...settings }));
  };

  // TTS Prompt設定の更新
  const updateTtsPromptSettings = (settings: Partial<TTSPromptSettings>) => {
    setTtsPromptSettings(prev => ({ ...prev, ...settings }));
  };

  return (
    <ModelContext.Provider 
      value={{ 
        chatModel, 
        setChatModel, 
        whisperModel, 
        setWhisperModel, 
        ttsModel, 
        setTtsModel,
        gpt4oMiniSettings,
        updateGpt4oMiniSettings,
        ttsPromptSettings,
        updateTtsPromptSettings,
        chatModelInfo: CHAT_MODEL_INFO,
        whisperModelInfo: WHISPER_MODEL_INFO,
        ttsModelInfo: TTS_MODEL_INFO
      }}
    >
      {children}
    </ModelContext.Provider>
  );
}

export function useModel() {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error('useModel must be used within a ModelProvider');
  }
  return context;
} 