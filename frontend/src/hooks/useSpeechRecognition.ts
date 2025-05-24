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
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  
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
  
  // ストリームのクリーンアップ
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
      streamRef.current = null;
    }
    
    if (mediaRecorderRef.current) {
      // MediaRecorderのクリーンアップ
      mediaRecorderRef.current = null;
    }
    
    audioChunksRef.current = [];
  }, []);
  
  // 録音停止と再開の処理
  const restartRecording = useCallback(async () => {
    cleanupStream();
    
    // 再試行カウントを増やす
    retryCountRef.current += 1;
    
    // 最大再試行回数を超えた場合はエラーを表示
    if (retryCountRef.current > maxRetries) {
      setError('マイクの接続に問題があります。ブラウザの設定を確認してください。');
      setIsListening(false);
      retryCountRef.current = 0;
      return;
    }
    
    console.log(`Restarting recording (attempt ${retryCountRef.current}/${maxRetries})...`);
    
    // 少し待ってから録音を再開
    setTimeout(() => {
      startListening();
    }, 500);
  }, [cleanupStream]);
  
  // 音声認識開始
  const startListening = useCallback(async () => {
    // すでに録音中なら一度停止
    if (isListening) {
      stopListening();
      // 少し待ってから再開
      setTimeout(() => {
        startListening();
      }, 300);
      return;
    }
    
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
    
    // 常にMediaRecorderを使用する（より信頼性が高いため）
    try {
      // マイクのストリームを取得
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        } 
      });
      
      if (!stream) {
        throw new Error('マイクのストリームを取得できませんでした');
      }
      
      // マイクが実際に接続されているか確認
      const audioTracks = stream.getAudioTracks();
      if (!audioTracks || audioTracks.length === 0) {
        throw new Error('マイクが検出されませんでした');
      }
      
      if (!audioTracks[0].enabled) {
        audioTracks[0].enabled = true;
      }
      
      console.log('Audio track settings:', audioTracks[0].getSettings());
      
      // ストリームを保存
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      // サポートされているMIMEタイプを確認
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/wav';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // デフォルトのMIMEタイプを使用
          }
        }
      }
      
      console.log(`Using MIME type: ${mimeType || 'default'}`);
      
      // MediaRecorderを作成
      mediaRecorderRef.current = mimeType 
        ? new MediaRecorder(stream, { mimeType: mimeType })
        : new MediaRecorder(stream);
      
      // データが利用可能になったときのイベントハンドラ
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log(`Received audio chunk: ${event.data.size} bytes`);
        }
      };
      
      // 録音停止時のイベントハンドラ
      mediaRecorderRef.current.onstop = async () => {
        if (audioChunksRef.current.length === 0) {
          console.error('No audio chunks recorded');
          setError('録音データがありません。もう一度お試しください。');
          setIsProcessing(false);
          setIsListening(false);
          cleanupStream();
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        
        // ファイルサイズチェック（最小サイズを300バイトに設定）
        if (audioBlob.size < 300) {
          console.warn(`Audio file too small: ${audioBlob.size} bytes`);
          
          if (retryCountRef.current < maxRetries) {
            // 自動再試行
            restartRecording();
            return;
          }
          
          setError('音声が短すぎるか、マイクが正しく機能していません。もう一度お試しください。');
          setIsProcessing(false);
          setIsListening(false);
          cleanupStream();
          retryCountRef.current = 0;
          return;
        }
        
        console.log(`Processing audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
        
        // OpenAI Whisper APIを使用して音声をテキストに変換
        setIsProcessing(true);
        try {
          const result = await openaiService.transcribeAudio(audioBlob);
          if (result.error) {
            console.error('Transcription API error:', result.error);
            setError(result.error);
          } else if (!result.text || !result.text.trim()) {
            console.warn('Empty transcription result');
            setError('音声を認識できませんでした。もう一度お試しください。');
          } else {
            // 成功した場合は結果をセット
            setTranscript(result.text);
            setError(null);
            console.log('Transcription successful:', result.text);
            retryCountRef.current = 0; // 成功したらリトライカウントをリセット
          }
        } catch (err) {
          console.error('Transcription error:', err);
          setError('音声の変換に失敗しました。ネットワーク接続を確認してください。');
        } finally {
          setIsProcessing(false);
          setIsListening(false);
          cleanupStream();
        }
      };
      
      // エラー発生時のイベントハンドラ
      mediaRecorderRef.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('録音中にエラーが発生しました。');
        setIsListening(false);
        cleanupStream();
        
        // エラー発生時に自動再試行
        if (retryCountRef.current < maxRetries) {
          restartRecording();
        } else {
          retryCountRef.current = 0;
        }
      };
      
      // 録音開始
      mediaRecorderRef.current.start();
      console.log('MediaRecorder started successfully');
      
      // 安全のため、最大録音時間を30秒に制限
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording' && !isIntentionalStopRef.current) {
          console.log('Max recording time reached, stopping automatically');
          stopListening();
        }
      }, 30000);
      
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(`録音の開始に失敗しました: ${err instanceof Error ? err.message : 'マイクの接続を確認してください'}`);
      setIsListening(false);
      cleanupStream();
    }
  }, [permissionGranted, checkMicrophonePermission, cleanupStream, restartRecording, stopListening]);
  
  // 音声認識停止
  const stopListening = useCallback(() => {
    isIntentionalStopRef.current = true;
    
    console.log('Stopping recording...');
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      } catch (err) {
        console.error('Failed to stop speech recognition:', err);
      }
    }
    
    if (mediaRecorderRef.current) {
      try {
        // 録音中であれば停止
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          console.log('MediaRecorder stopped');
        } else {
          console.log(`MediaRecorder was not recording (state: ${mediaRecorderRef.current.state})`);
          mediaRecorderRef.current = null;
          setIsListening(false);
          cleanupStream();
        }
      } catch (err) {
        console.error('Failed to stop media recorder:', err);
        mediaRecorderRef.current = null;
        setIsListening(false);
        cleanupStream();
      }
    } else {
      console.log('No active MediaRecorder to stop');
      setIsListening(false);
      cleanupStream();
    }
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
      retryCountRef.current = 0;
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
