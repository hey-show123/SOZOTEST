import axios from 'axios';

// API通信のタイムアウト設定（30秒）
const TIMEOUT_MS = 30000;

// バックエンドAPIのURL
const API_BASE_URL = 'https://backend-462027224254.asia-northeast1.run.app/api';

// モックAPIを使用するかどうか
const USE_MOCK_API = true;

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

// モックレスポンスの生成
const mockAPI = {
  // レッスン開始モック
  startLesson: () => {
    return {
      message: "こんにちは！英会話レッスンへようこそ。今日は簡単なフレーズから始めましょう。今日のキーフレーズは「Would you like to do a treatment as well?」（トリートメントもいかがですか？）です。このフレーズは美容院などで追加のサービスを提案するときによく使われます。まずは私の後に続いて発音してみてください。",
      phase: 1,
      audio: null // 実際にはBase64エンコードされた音声データが入る
    };
  },
  
  // チャットモック
  sendMessage: (message: string, history: Array<{role: string; content: string}>, phase: number) => {
    // ユーザーのメッセージに基づいてレスポンスを生成
    let response = {
      message: "",
      phase: phase,
      audio: null
    };
    
    // フェーズ1でのキーフレーズ練習
    if (phase === 1) {
      const repeatCount = history.filter(msg => 
        msg.role === 'user' && 
        msg.content.toLowerCase().includes('would you like')
      ).length;
      
      // キーフレーズを3回練習したらフェーズ2へ
      if (repeatCount >= 2) {
        response.message = "素晴らしいです！発音も良いですね。キーフレーズの練習は十分です。次はダイアログ練習に移りましょう。美容院でのシナリオを想定して会話をしてみましょう。私が美容師役、あなたがお客様役です。私から始めますね。";
        response.phase = 2;
      } else {
        response.message = "良くできました！「Would you like to do a treatment as well?」の発音がとても良いですね。もう一度練習してみましょう。";
      }
    }
    // フェーズ2でのダイアログ練習
    else if (phase === 2) {
      response.message = "はい、お客様。カットは終わりました。とても似合っていますよ。Would you like to do a treatment as well? 髪の毛に栄養を与えるトリートメントもご用意しています。";
    }
    
    return response;
  }
};

// レッスン関連のAPIサービス
export const lessonService = {
  // レッスン開始
  startLesson: async () => {
    // モックAPIを使用する場合
    if (USE_MOCK_API) {
      console.log('モックAPI使用: startLesson');
      return mockAPI.startLesson();
    }
    
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
    // モックAPIを使用する場合
    if (USE_MOCK_API) {
      console.log('モックAPI使用: sendMessage', { message, phase });
      return mockAPI.sendMessage(message, conversationHistory, phase);
    }
    
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
    // モックAPIを使用する場合は単純に空の結果を返す
    if (USE_MOCK_API) {
      console.log('モックAPI使用: transcribeAudio');
      return { text: "" };
    }
    
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
    // モックAPIを使用する場合は単純にnullを返す
    if (USE_MOCK_API) {
      console.log('モックAPI使用: textToSpeech');
      return { audio: null };
    }
    
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