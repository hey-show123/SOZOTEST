'use client';

import { useState, useRef, useEffect } from 'react';

type AudioRecorderProps = {
  onTranscription: (text: string) => void;
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
};

export default function AudioRecorder({ onTranscription, isRecording, setIsRecording }: AudioRecorderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // コンポーネントアンマウント時やマウント時にリソースを適切に管理
  useEffect(() => {
    // マウント時にすでに録音中だった場合の対応
    if (isRecording && !mediaRecorderRef.current) {
      // 親コンポーネントが録音中だが、実際には録音していない場合
      setIsRecording(false);
    }

    // アンマウント時の処理
    return () => {
      cleanupResources();
    };
  }, []);

  // リソースのクリーンアップ関数
  const cleanupResources = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (e) {
            console.warn('トラック停止エラー:', e);
          }
        });
        audioStreamRef.current = null;
      }
      
      setIsRecording(false);
      setIsProcessing(false);
      setProcessingStatus('');
      setError(null);
    } catch (e) {
      console.warn('リソースクリーンアップエラー:', e);
    }
  };

  // サポートされている音声形式を検出
  const getSupportedMimeType = (): string => {
    // ブラウザがサポートする形式を優先順に試す
    const mimeTypes = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/mp4',
      'audio/ogg',
      'audio/wav'
    ];
    
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        console.log(`サポートされている音声形式: ${mimeType}`);
        return mimeType;
      }
    }
    
    // どれもサポートされていない場合はデフォルト（ブラウザ依存）
    console.warn('推奨された音声形式がサポートされていません。デフォルト形式を使用します。');
    return '';
  };

  // 録音開始
  const startRecording = async () => {
    try {
      // 既存のリソースをクリーンアップ
      cleanupResources();
      
      setError(null);
      setProcessingStatus('マイクへのアクセスを要求中...');
      audioChunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      audioStreamRef.current = stream;
      
      // サポートされているMIMEタイプを取得
      const mimeType = getSupportedMimeType();
      
      // MediaRecorderオプションを設定
      const options: MediaRecorderOptions = {};
      if (mimeType) {
        options.mimeType = mimeType;
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        try {
          // 録音が途中でキャンセルされていない場合のみ処理
          if (audioChunksRef.current.length > 0) {
            setProcessingStatus('音声を処理中...');
            // 使用したMIMEタイプで新しいBlobを作成
            const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
            
            // 極端に短い録音は処理しない（0.5秒未満）
            if (audioBlob.size > 1000) {
              await sendAudioToWhisper(audioBlob);
            } else {
              setError('録音が短すぎます。もう少し長く話してください。');
              setIsProcessing(false);
            }
          }
        } catch (error) {
          console.error('音声処理エラー:', error);
          setError('音声の処理中にエラーが発生しました');
          setIsProcessing(false);
        } finally {
          // ストリームのトラックを停止
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
          }
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      // データが確実に収集されるように時間間隔を設定
      mediaRecorder.start(100); // 100ミリ秒ごとにデータを収集
      setIsRecording(true);
      setProcessingStatus('録音中...');
    } catch (error: any) {
      console.error('録音開始エラー:', error);
      setError(error.message || 'マイクへのアクセスが許可されていません。設定でマイクへのアクセスを許可してください。');
      setIsProcessing(false);
      setIsRecording(false);
    }
  };

  // 録音停止
  const stopRecording = () => {
    if (mediaRecorderRef.current && (isRecording || mediaRecorderRef.current.state === 'recording')) {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error('録音停止エラー:', error);
      }
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  // Whisper APIに音声を送信
  const sendAudioToWhisper = async (audioBlob: Blob) => {
    try {
      setProcessingStatus('音声認識中...');
      
      // 音声サイズのチェック
      const audioSizeMB = audioBlob.size / (1024 * 1024);
      if (audioSizeMB > 25) {
        throw new Error('音声ファイルが大きすぎます (25MB以上)');
      }
      
      // リクエストのデバッグ情報
      console.log(`音声形式: ${audioBlob.type}, サイズ: ${audioSizeMB.toFixed(2)}MB`);
      
      const formData = new FormData();
      
      // ファイル名を適切なMIMEタイプに基づいて設定
      const extension = audioBlob.type.includes('webm') ? 'webm' : 
                       audioBlob.type.includes('mp4') ? 'mp4' : 
                       audioBlob.type.includes('ogg') ? 'ogg' : 'wav';
                       
      formData.append('audio', audioBlob, `recording.${extension}`);
      // 英語認識を明示的に指定
      formData.append('language', 'en');
      
      // WhisperモデルタイプをFormDataに追加
      formData.append('model', 'whisper-1');

      const response = await fetch('/api/speech', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`音声認識APIエラー: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      if (data.text && data.text.trim() !== '') {
        // 音声認識結果を親コンポーネントに渡し、自動送信するフラグをtrueに設定
        onTranscription(data.text);
        setProcessingStatus('');
        
        // 録音ボタンにフォーカスを戻す（再録音しやすくするため）
        if (buttonRef.current) {
          setTimeout(() => {
            buttonRef.current?.focus();
          }, 100);
        }
      } else {
        setError('音声を認識できませんでした。もう一度お試しください。');
      }
    } catch (error: any) {
      console.error('音声認識エラー:', error);
      setError(error.message || '音声認識に失敗しました。もう一度お試しください。');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // ボタンクリックハンドラ
  const handleButtonClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center fixed bottom-20 left-0 right-0 z-50">
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        disabled={isProcessing}
        className={`relative flex items-center justify-center w-16 h-16 rounded-full shadow-lg transition-all duration-300 ${
          isRecording 
            ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 scale-110 animate-pulse' 
            : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
        } ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''} z-20`}
        aria-label={isRecording ? "録音停止" : "録音開始"}
      >
        {isRecording ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="text-white drop-shadow-md" viewBox="0 0 16 16">
            <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/>
          </svg>
        ) : isProcessing ? (
          <svg className="animate-spin text-white drop-shadow-md" xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" className="text-white drop-shadow-md" viewBox="0 0 16 16">
            <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
            <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0v5zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3z"/>
          </svg>
        )}
        
        {/* リップル効果 (録音中) */}
        {isRecording && (
          <div className="absolute inset-0 pointer-events-none">
            <span className="absolute w-full h-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
            <span className="absolute w-[140%] h-[140%] rounded-full bg-red-400 opacity-30 animate-ping" style={{ animationDelay: '0.2s' }}></span>
            <span className="absolute w-[180%] h-[180%] rounded-full bg-red-300 opacity-20 animate-ping" style={{ animationDelay: '0.4s' }}></span>
          </div>
        )}

        {/* ボタン装飾 */}
        <span className="absolute inset-0 rounded-full bg-white/20 blur-sm pointer-events-none"></span>
        <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-300 to-indigo-300 opacity-30 blur-sm pointer-events-none"></span>
      </button>
      
      {/* ステータス表示 */}
      {(isRecording || isProcessing || error) && (
        <div className={`mt-3 px-5 py-2.5 rounded-full text-sm font-medium backdrop-blur-sm animate-fadeIn z-10 ${
          error ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800' : 
          'bg-white/80 dark:bg-slate-800/80 shadow-md border border-gray-100 dark:border-slate-700 text-gray-800 dark:text-gray-200'
        }`}>
          {error ? error : processingStatus}
        </div>
      )}
    </div>
  );
} 