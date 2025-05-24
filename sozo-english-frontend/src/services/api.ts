import axios from 'axios';

// API通信のタイムアウト設定（30秒）
const TIMEOUT_MS = 30000;

// バックエンドAPIのURL
const API_BASE_URL = 'https://backend-462027224254.asia-northeast1.run.app/api';

// APIクライアントの設定
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || API_BASE_URL,
  headers: {
    'Content-type': 'application/json',
  },
  timeout: TIMEOUT_MS, // タイムアウト設定
});

// APIリクエストの詳細をログ出力
apiClient.interceptors.request.use(
  config => {
    console.log(`APIリクエスト: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    return config;
  },
  error => {
    console.error('APIリクエストエラー:', error);
    return Promise.reject(error);
  }
);

// APIレスポンスの詳細をログ出力
apiClient.interceptors.response.use(
  response => {
    console.log(`APIレスポンス: ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  error => {
    console.error('APIレスポンスエラー:', 
      error.response ? `${error.response.status} ${error.config?.url}` : error.message,
      error.response?.data
    );
    return Promise.reject(error);
  }
);

export interface SessionData {
  duration: number;
  turns: number;
  accuracy: number;
}

export interface ProgressData {
  totalSessions: number;
  totalTime: number;
  vocabLearned: number;
  scenariosCompleted: number;
  currentLevel: string;
  strengths: string[];
  weaknesses: string[];
}

// レッスン関連のAPIサービス
export const lessonService = {
  // レッスン開始
  startLesson: async () => {
    try {
      // バックエンドとの互換性のため、シンプルなリクエストに戻す
      const response = await apiClient.post('/lesson/start', {});
      
      // レスポンス形式を検証
      if (!response.data || typeof response.data !== 'object') {
        console.error('無効なレスポンス形式:', response.data);
        throw new Error('無効なレスポンス形式');
      }
      
      return response.data;
    } catch (error) {
      console.error('レッスン開始エラー:', error);
      // エラー情報を詳細に記録
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('サーバーレスポンス:', error.response.status, error.response.data);
        } else if (error.request) {
          console.error('レスポンスなし (タイムアウトなど):', error.request);
        }
      }
      throw error;
    }
  },

  // チャット
  sendMessage: async (message: string, conversationHistory: any[], phase: number = 1, audioFeedback: boolean = true) => {
    try {
      // 会話履歴のフォーマットを確認
      const formattedHistory = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // フェーズ移行の明示的なシグナルを検出
      const isPhaseTransitionRequest = 
        message.includes('次のフェーズ') || 
        message.includes('次のステップ') || 
        message.includes('ダイアログ練習');
      
      // バックエンドとの互換性のため、基本的なパラメータのみを送信
      const response = await apiClient.post('/lesson/chat', {
        message,
        conversation_history: formattedHistory,
        phase,
        audio_feedback: audioFeedback
      });
      
      // レスポンスデータに適切なフェーズ情報が含まれているか確認
      if (response.data && typeof response.data.phase === 'undefined') {
        // フェーズ情報がない場合は、現在のフェーズを維持
        // ただし、フェーズ移行リクエストの場合は次のフェーズに進める
        response.data.phase = isPhaseTransitionRequest ? phase + 1 : phase;
      }
      
      return response.data;
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      // エラー情報を詳細に記録
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('サーバーレスポンス:', error.response.status, error.response.data);
        } else if (error.request) {
          console.error('レスポンスなし (タイムアウトなど):', error.request);
        }
      }
      throw error;
    }
  },

  // 音声からテキストへの変換
  transcribeAudio: async (audioBlob: Blob, language: string = 'en') => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('language', language);
      
      const response = await apiClient.post('/speech-to-text', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('音声認識エラー:', error);
      throw error;
    }
  },

  // テキストから音声への変換
  textToSpeech: async (text: string, voice: string = 'nova') => {
    try {
      const response = await apiClient.post('/text-to-speech', {
        text,
        voice
      });
      return response.data;
    } catch (error) {
      console.error('音声合成エラー:', error);
      throw error;
    }
  }
};

export default {
  lesson: lessonService
}; 