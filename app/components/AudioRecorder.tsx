'use client';

import { useState, useRef, useEffect } from 'react';

type AudioRecorderProps = {
  onTranscription: (text: string, autoSubmit: boolean) => void;
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
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus' 
      });
      
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
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
            
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
      mediaRecorder.start();
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
      
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      // 英語認識を明示的に指定
      formData.append('language', 'en');

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
        onTranscription(data.text, true);
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
    <div className="flex flex-col items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleButtonClick}
        className={`p-3 rounded-full ${
          isRecording 
            ? 'bg-red-500 hover:bg-red-600' 
            : isProcessing 
              ? 'bg-gray-400 cursor-wait' 
              : 'bg-blue-500 hover:bg-blue-600'
        } text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          isRecording ? 'focus:ring-red-500' : 'focus:ring-blue-500'
        }`}
        disabled={isProcessing}
        title={isRecording ? "録音を停止" : "録音を開始"}
      >
        {isRecording ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/>
          </svg>
        ) : isProcessing ? (
          <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
            <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0v5zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3z"/>
          </svg>
        )}
      </button>
      
      {(processingStatus || error) && (
        <div className={`mt-2 text-xs px-2 py-1 rounded ${error ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
          {error || processingStatus}
        </div>
      )}
    </div>
  );
} 