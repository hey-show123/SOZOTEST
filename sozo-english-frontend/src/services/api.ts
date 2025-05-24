import axios from 'axios';

// APIクライアントの設定
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://backend-462027224254.asia-northeast1.run.app/api',
  headers: {
    'Content-type': 'application/json',
  },
});

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
      const response = await apiClient.post('/lesson/start', {});
      return response.data;
    } catch (error) {
      console.error('レッスン開始エラー:', error);
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
      
      const response = await apiClient.post('/lesson/chat', {
        message,
        conversation_history: formattedHistory,
        phase,
        audio_feedback: audioFeedback,
        speech_speed: 0.8 // 英語の読み上げ速度を0.8倍に設定
      });
      
      // レスポンスデータに適切なフェーズ情報が含まれているか確認
      if (response.data && typeof response.data.phase === 'undefined') {
        // フェーズ情報がない場合は、現在のフェーズを維持
        response.data.phase = phase;
      }
      
      return response.data;
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
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
        voice,
        speed: 0.8 // 音声の速度を0.8倍に設定
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