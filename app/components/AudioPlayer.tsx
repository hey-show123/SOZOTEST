'use client';

import { useRef, useEffect, useState } from 'react';
import { useChatMode } from '../context/ChatModeContext';
import { useVoice } from '../context/VoiceContext';

type AudioPlayerProps = {
  text: string;
  autoPlay: boolean;
  onFinished?: () => void;
  isPlaying?: boolean;
  setIsPlaying?: (isPlaying: boolean) => void;
};

export default function AudioPlayer({ 
  text, 
  autoPlay, 
  onFinished,
  isPlaying: externalIsPlaying,
  setIsPlaying: externalSetIsPlaying
}: AudioPlayerProps) {
  const { mode } = useChatMode();
  const { voice } = useVoice();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [initialNotification, setInitialNotification] = useState(true);

  // 内部または外部の状態管理を使用
  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;
  const setIsPlaying = externalSetIsPlaying || setInternalIsPlaying;

  // ユーザーインタラクション検出
  useEffect(() => {
    const handleInteraction = () => {
      setHasInteracted(true);
      setInitialNotification(false);
      // イベントリスナーを削除
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // テキストが変更されたら音声を生成
  useEffect(() => {
    if (!text || text.trim() === '') return;

    const generateTTS = async () => {
      try {
        setIsPlaying(false);
        setShowPlayButton(false);
        
        // TTS APIを呼び出し
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text, voice }),
        });

        if (!response.ok) {
          throw new Error('TTS APIエラー');
        }

        // 音声データを取得してBlobに変換
        const audioBlob = await response.blob();
        // 既存のURLを解放
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        const newAudioUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(newAudioUrl);
      } catch (error) {
        console.error('音声生成エラー:', error);
        setShowPlayButton(false);
      }
    };

    generateTTS();

    // クリーンアップ関数
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [text, voice]);

  // 音声URLが変更されたときに再生
  useEffect(() => {
    if (!audioUrl) return;
    
    let isEffectActive = true; // このエフェクト実行中かどうかを追跡

    const playAudio = async () => {
      try {
        if (!isEffectActive) return; // エフェクトが無効になっていたら処理を中止
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          
          // 再生終了時のイベントリスナー
          audioRef.current.onended = () => {
            if (!isEffectActive) return; // エフェクトが無効になっていたら処理を中止
            setIsPlaying(false);
            if (onFinished) {
              onFinished();
            }
          };
          
          if (autoPlay && hasInteracted) {
            try {
              await audioRef.current.play();
              if (!isEffectActive) {
                audioRef.current.pause(); // エフェクトが無効になっていたら再生を停止
                return;
              }
              setIsPlaying(true);
              setShowPlayButton(false);
            } catch (error) {
              console.warn('自動再生できませんでした:', error);
              setShowPlayButton(true);
            }
          } else if (autoPlay && !hasInteracted) {
            // インタラクションなしの場合は再生ボタンを表示
            setShowPlayButton(true);
          }
        } else {
          const audio = new Audio(audioUrl);
          audio.onended = () => {
            if (!isEffectActive) return; // エフェクトが無効になっていたら処理を中止
            setIsPlaying(false);
            if (onFinished) {
              onFinished();
            }
          };
          audioRef.current = audio;
          
          if (autoPlay && hasInteracted) {
            try {
              await audio.play();
              if (!isEffectActive) {
                audio.pause(); // エフェクトが無効になっていたら再生を停止
                return;
              }
              setIsPlaying(true);
              setShowPlayButton(false);
            } catch (error) {
              console.warn('自動再生できませんでした:', error);
              setShowPlayButton(true);
            }
          } else if (autoPlay && !hasInteracted) {
            // インタラクションなしの場合は再生ボタンを表示
            setShowPlayButton(true);
          }
        }
      } catch (error) {
        console.error('音声再生エラー:', error);
        setShowPlayButton(true);
      }
    };

    playAudio();
    
    // クリーンアップ関数: エフェクトが再実行されるか、コンポーネントがアンマウントされるときに実行
    return () => {
      isEffectActive = false; // エフェクトの無効化
      if (audioRef.current) {
        audioRef.current.pause(); // 再生中の場合は停止
        audioRef.current.onended = null; // イベントリスナーを削除
      }
    };
  }, [audioUrl, autoPlay, hasInteracted]);

  // 手動で音声を再生
  const handlePlay = async () => {
    if (!audioRef.current || !audioUrl) return;
    
    try {
      await audioRef.current.play();
      setIsPlaying(true);
      setShowPlayButton(false);
    } catch (error) {
      console.error('再生エラー:', error);
    }
  };

  if (!showPlayButton) {
    return (
      <div className="hidden">
        <audio ref={audioRef} controls />
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50">
      {initialNotification && !hasInteracted ? (
        <div className="bg-blue-100 text-blue-800 p-2 rounded-lg shadow-md mb-2 text-sm">
          画面をクリックすると音声が有効になります
        </div>
      ) : null}
      
      {showPlayButton && (
        <button
          onClick={handlePlay}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg flex items-center justify-center"
          title="Listen to this response"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
            <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/>
            <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/>
            <path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8A3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/>
          </svg>
        </button>
      )}
    </div>
  );
} 