import { useState, useRef, useCallback, useEffect } from 'react';
import openaiService from '@/services/openai';

/**
 * 音声再生のためのカスタムフック
 * @returns 音声再生関連の状態と関数
 */
export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  
  // コンポーネントがマウントされたときにオーディオ要素を作成
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      
      audioRef.current.onplay = () => {
        setIsPlaying(true);
      };
      
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
      
      audioRef.current.onpause = () => {
        setIsPlaying(false);
      };
      
      audioRef.current.onerror = () => {
        setIsPlaying(false);
        setError('音声の再生に失敗しました。');
      };
    }
    
    // クリーンアップ
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      // 作成したオブジェクトURLを解放
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []);
  
  /**
   * テキストを音声に変換して再生する
   * @param text 再生するテキスト
   */
  const playText = useCallback(async (text: string) => {
    setError(null);
    
    if (!text) {
      setError('再生するテキストがありません。');
      return;
    }
    
    // 現在再生中なら停止
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // 以前作成したオブジェクトURLがあれば解放
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    
    setIsLoading(true);
    
    try {
      // OpenAI TTS APIを使用してテキストを音声に変換
      const audioUrl = await openaiService.textToSpeech(text);
      
      // URLを保存して後でクリーンアップできるようにする
      audioUrlRef.current = audioUrl;
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (err) {
      console.error('Text to speech error:', err);
      setError('テキストの音声変換に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  /**
   * 再生を停止する
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);
  
  /**
   * 再生を一時停止する
   */
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);
  
  /**
   * 再生を再開する
   */
  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  }, []);
  
  return {
    isPlaying,
    isLoading,
    error,
    playText,
    stop,
    pause,
    resume
  };
} 