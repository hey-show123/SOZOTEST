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

export interface PDFMetadata {
  filename: string;
  title: string;
  description?: string;
  lesson_id?: string;
  tags: string[];
  uploaded_at: string;
  size_bytes: number;
  url?: string;
}

// レッスン関連のAPIサービス
export const lessonService = {
  // レッスン開始
  startLesson: async (pdfFilename?: string) => {
    try {
      const response = await apiClient.post('/lesson/start', {
        pdf_filename: pdfFilename
      });
      return response.data;
    } catch (error) {
      console.error('レッスン開始エラー:', error);
      throw error;
    }
  },

  // チャット
  sendMessage: async (message: string, conversationHistory: any[], phase: number = 1, audioFeedback: boolean = true) => {
    try {
      const response = await apiClient.post('/lesson/chat', {
        message,
        conversation_history: conversationHistory,
        phase,
        audio_feedback: audioFeedback
      });
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
        voice
      });
      return response.data;
    } catch (error) {
      console.error('音声合成エラー:', error);
      throw error;
    }
  },

  // PDFの取得URL
  getPdfUrl: (filename: string) => {
    return `${apiClient.defaults.baseURL}/lesson/pdf/${filename}`;
  }
};

// PDF管理APIサービス
export const pdfService = {
  // PDFファイル一覧の取得
  getAllPdfs: async () => {
    try {
      const response = await apiClient.get('/lesson/pdf');
      return response.data;
    } catch (error) {
      console.error('PDF一覧取得エラー:', error);
      throw error;
    }
  },
  
  // PDFファイルのアップロード
  uploadPdf: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post('/lesson/pdf', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('PDFアップロードエラー:', error);
      throw error;
    }
  },
  
  // PDFファイルの削除
  deletePdf: async (filename: string) => {
    try {
      const response = await apiClient.delete(`/lesson/pdf/${filename}`);
      return response.data;
    } catch (error) {
      console.error('PDF削除エラー:', error);
      throw error;
    }
  },

  // PDFの取得URL
  getPdfUrl: (filename: string) => {
    return `${apiClient.defaults.baseURL}/lesson/pdf/${filename}`;
  }
};

export default {
  lesson: lessonService,
  pdf: pdfService,
}; 