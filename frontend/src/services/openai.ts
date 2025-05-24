import axios from 'axios';

interface AudioTranscriptionResponse {
  text: string;
  error?: string;
}

interface ChatCompletionResponse {
  text: string;
  audioUrl?: string;
  error?: string;
}

// OpenAI APIへのリクエスト処理を行うサービス
const openaiService = {
  /**
   * 音声データをテキストに変換する（Whisper API）
   * @param audioBlob 音声データ
   * @returns 変換されたテキスト
   */
  async transcribeAudio(audioBlob: Blob): Promise<AudioTranscriptionResponse> {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');
      
      const response = await axios.post('/api/openai/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to transcribe audio:', error);
      return {
        text: '',
        error: 'Failed to transcribe audio. Please try again.'
      };
    }
  },
  
  /**
   * テキストメッセージを送信してAIからの応答を取得する（ChatGPT API）
   * @param lessonId レッスンID
   * @param message ユーザーメッセージ
   * @param phase 現在のレッスンフェーズ
   * @param conversationHistory 会話履歴
   * @returns AIからの応答
   */
  async sendChat(
    lessonId: string, 
    message: string, 
    phase: string,
    conversationHistory: {role: string, content: string}[] = []
  ): Promise<ChatCompletionResponse> {
    try {
      const response = await axios.post('/api/openai/chat', {
        lessonId,
        message,
        phase,
        conversationHistory
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to get chat response:', error);
      return {
        text: 'すみません、エラーが発生しました。もう一度お試しください。',
        error: 'Failed to get chat response'
      };
    }
  },
  
  /**
   * テキストを音声に変換する（TTS API）
   * @param text 音声に変換するテキスト
   * @returns 音声のURL
   */
  async textToSpeech(text: string): Promise<string> {
    try {
      const response = await axios.post('/api/openai/tts', {
        text
      }, {
        responseType: 'blob'
      });
      
      // Blobデータをオーディオ要素で再生可能なURLに変換
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.error('Failed to convert text to speech:', error);
      throw new Error('Failed to convert text to speech');
    }
  }
};

export default openaiService; 