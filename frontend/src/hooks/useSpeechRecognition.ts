import { useState, useEffect, useRef, useCallback } from 'react';
import openaiService from '@/services/openai';

// ブラウザのSpeechRecognitionインターフェースの型定義
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onerror: (event: any) => void;
  onresult: (event: any) => void;
  onend: () => void;
  onstart: () => void;
}

interface SpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

// Web Speech API または window.SpeechRecognition が利用可能かチェック
const SpeechRecognition = 
  (typeof window !== 'undefined' && (window as any).SpeechRecognition) ||
  (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) ||
  null;

/**
 * 音声認識のためのカスタムフック
 * @returns 音声認識関連の状態と関数
 */
export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isIntentionalStopRef = useRef(false);
  
  // マイク権限の確認
  const checkMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // ストリームを停止
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      setError(null);
      return true;
    } catch (err) {
      console.error('Microphone permission error:', err);
      setPermissionGranted(false);
      setError('マイクの使用許可が必要です。');
      return false;
    }
  }, []);
  
  // 音声認識開始
  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    isIntentionalStopRef.current = false;
    
    // マイク権限が未確認の場合、確認する
    if (permissionGranted === null) {
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) return;
    } else if (permissionGranted === false) {
      // 再度マイク許可を試みる
      const hasPermission = await checkMicrophonePermission();
      if (!hasPermission) {
        setError('マイクの使用許可が必要です。ブラウザの設定を確認してください。');
        return;
      }
    }
    
    setIsListening(true);
    
    // Web Speech APIが使用可能な場合
    if (SpeechRecognition) {
      try {
        // 既存のインスタンスを破棄して新しく作成
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch (e) {
            // エラーは無視
          }
          recognitionRef.current = null;
        }
        
        recognitionRef.current = new (SpeechRecognition as unknown as SpeechRecognitionConstructor)();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false; // 安定性のためfalseに設定
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onstart = () => {
          console.log('Speech recognition started');
          setIsListening(true);
        };
        
        recognitionRef.current.onresult = (event) => {
          const result = event.results[0][0].transcript;
          console.log('Speech recognition result:', result);
          setTranscript(result);
          setIsListening(false);
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          
          // 重要でないエラーは無視
          if (event.error === 'no-speech' || event.error === 'aborted') {
            setIsListening(false);
            return;
          }
          
          setError('音声認識エラー: ' + event.error);
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          console.log('Speech recognition ended');
          if (!isIntentionalStopRef.current) {
            setIsListening(false);
          }
        };
        
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setError('音声認識の開始に失敗しました。');
        setIsListening(false);
      }
    } 
    // Web Speech APIが使用できない場合、MediaRecorderを使用
    else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100,
            channelCount: 1
          } 
        });
        
        streamRef.current = stream;
        audioChunksRef.current = [];
        
        // WebMとWAVの両方をサポート
        let mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/wav';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/mp4';
          }
        }
        
        mediaRecorderRef.current = new MediaRecorder(stream, {
          mimeType: mimeType
        });
        
        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          // ファイルサイズチェックを緩和（100バイトから500バイトに変更）
          if (audioBlob.size < 500) {
            setError('音声が短すぎます。もう少し長く話してください。');
            setIsProcessing(false);
            cleanupStream();
            return;
          }
          
          console.log(`Processing audio blob: ${audioBlob.size} bytes, type: ${mimeType}`);
          
          // OpenAI Whisper APIを使用して音声をテキストに変換
          setIsProcessing(true);
          try {
            const result = await openaiService.transcribeAudio(audioBlob);
            if (result.error) {
              setError(result.error);
            } else if (!result.text.trim()) {
              setError('音声を認識できませんでした。もう一度お試しください。');
            } else {
              setTranscript(result.text);
              console.log('Transcription successful:', result.text);
            }
          } catch (err) {
            console.error('Transcription error:', err);
            setError('音声の変換に失敗しました。ネットワーク接続を確認してください。');
          } finally {
            setIsProcessing(false);
            cleanupStream();
          }
        };
        
        mediaRecorderRef.current.onerror = (event) => {
          console.error('MediaRecorder error:', event);
          setError('録音中にエラーが発生しました。');
          setIsListening(false);
          cleanupStream();
        };
        
        // 録音開始（時間制限なし、ユーザーが停止するまで継続）
        mediaRecorderRef.current.start();
        console.log('MediaRecorder started');
      } catch (err) {
        console.error('Media recorder error:', err);
        setError('録音の開始に失敗しました。マイクの接続を確認してください。');
        setIsListening(false);
      }
    }
  }, [permissionGranted, checkMicrophonePermission]);
  
  // ストリームのクリーンアップ
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);
  
  // 音声認識停止
  const stopListening = useCallback(() => {
    isIntentionalStopRef.current = true;
    setIsListening(false);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Failed to stop speech recognition:', err);
      }
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('Failed to stop media recorder:', err);
      }
    }
    
    cleanupStream();
  }, [cleanupStream]);
  
  // コンポーネントのアンマウント時にリソースを解放
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (err) {
          // 無視
        }
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          // 無視
        }
      }
      
      cleanupStream();
    };
  }, [cleanupStream]);
  
  return {
    isListening,
    transcript,
    isProcessing,
    error,
    permissionGranted,
    startListening,
    stopListening,
    checkMicrophonePermission,
  };
}
