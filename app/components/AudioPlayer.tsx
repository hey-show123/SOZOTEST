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
  audioUrl?: string; // 事前生成された音声ファイルのURL
};

export default function AudioPlayer({ 
  text, 
  autoPlay, 
  onFinished,
  isPlaying: externalIsPlaying,
  setIsPlaying: externalSetIsPlaying,
  audioUrl: externalAudioUrl
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

  // 外部から音声URLが提供されている場合はそれを使用
  useEffect(() => {
    if (externalAudioUrl) {
      console.log('[AudioPlayer] 外部音声URL設定:', externalAudioUrl);
      setAudioUrl(externalAudioUrl);
      return; // 外部URLがある場合はAPIを呼び出さない
    }
    
    if (!text || text.trim() === '') return;

    const generateTTS = async () => {
      try {
        setIsPlaying(false);
        setShowPlayButton(false);
        
        // APIキーが設定されていない場合やAPIサーバーに問題がある場合のエラーハンドリング
        try {
          console.log('[AudioPlayer] TTS生成開始 - テキスト:', text.substring(0, 30) + (text.length > 30 ? '...' : ''));
          // TTS APIを呼び出し
          const response = await fetch('/api/text-to-speech', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, voice }),
          });

          if (!response.ok) {
            console.error('[AudioPlayer] TTS APIエラー:', response.status, response.statusText);
            // エラーが発生した場合はフォールバック：再生ボタンを表示せず、完了ハンドラを呼び出す
            if (onFinished) {
              onFinished();
            }
            return;
          }

          if (response.headers.get('Content-Type')?.includes('application/json')) {
            // JSONレスポンスの場合（保存済みの音声URLが返された）
            const data = await response.json();
            
            // ダミーの音声URLの場合は特別処理
            if (data.isDummy) {
              console.log('[AudioPlayer] ダミー音声URLが返されました。APIキーが設定されていません。');
              // ダミーURLでも処理を続行し、完了ハンドラを呼び出す
              if (onFinished) {
                onFinished();
              }
              return;
            }
            
            console.log('[AudioPlayer] 音声URL取得成功:', data.audioUrl);
            setAudioUrl(data.audioUrl);
          } else {
            // バイナリレスポンスの場合（新規生成された音声）
            console.log('[AudioPlayer] バイナリ音声データ受信');
            // 音声データを取得してBlobに変換
            const audioBlob = await response.blob();
            // 既存のURLを解放
            if (audioUrl) {
              URL.revokeObjectURL(audioUrl);
            }
            const newAudioUrl = URL.createObjectURL(audioBlob);
            console.log('[AudioPlayer] BlobURL生成:', newAudioUrl);
            setAudioUrl(newAudioUrl);
          }
        } catch (error) {
          console.error('[AudioPlayer] 音声生成エラー:', error);
          setShowPlayButton(false);
          // エラー時は再生を行わず、完了ハンドラを呼び出して処理を続行
          if (onFinished) {
            onFinished();
          }
        }
      } catch (error) {
        console.error('[AudioPlayer] TTS生成処理エラー:', error);
        // 最終的なエラーハンドリング：完了ハンドラを呼び出して処理を続行
        if (onFinished) {
          onFinished();
        }
      }
    };

    generateTTS();

    // クリーンアップ関数
    return () => {
      // Blobから作成したURLのみ解放（サーバー上のファイルパスは解放しない）
      if (audioUrl && !externalAudioUrl && audioUrl.startsWith('blob:')) {
        console.log('[AudioPlayer] BlobURL解放:', audioUrl);
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [text, voice, externalAudioUrl]);

  // 音声URLが変更されたときに再生するエフェクトを修正
  useEffect(() => {
    if (!audioUrl) {
      console.log('[AudioPlayer] audioUrlが未設定のため再生しません');
      // audioUrlがnullになった場合、内部状態をリセット
      setIsPlaying(false);
      return;
    }
    
    console.log('[AudioPlayer] 音声URL変更:', audioUrl);
    
    // 以前の再生を停止（重複再生防止）
    if (audioRef.current) {
      console.log('[AudioPlayer] 既存の再生を停止');
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onloadeddata = null;
      audioRef.current.onerror = null;
    }
    
    let isEffectActive = true; // このエフェクト実行中かどうかを追跡

    const playAudio = async () => {
      try {
        if (!isEffectActive) return; // エフェクトが無効になっていたら処理を中止
        
        // 音声ファイルが存在するか事前確認（外部URLの場合のみ）
        if (audioUrl.startsWith('/audio/') || audioUrl.startsWith('https://')) {
          try {
            console.log('[AudioPlayer] 音声ファイルの存在確認:', audioUrl);
            const response = await fetch(audioUrl, { method: 'HEAD' });
            
            if (!response.ok) {
              console.error(`[AudioPlayer] 音声ファイルが見つかりません (${response.status}): ${audioUrl}`);
              
              // ファイルが見つからない場合、テキストがあればTTSで生成
              if (text && text.trim() !== '') {
                console.log('[AudioPlayer] テキストから音声を再生成します:', text);
                
                // テキストからTTS生成（バックアップ）
                if (onFinished) {
                  setTimeout(() => {
                    onFinished();
                  }, 500);
                }
                return;
              } else {
                // テキストがない場合はエラーとして処理
                throw new Error(`音声ファイルが見つかりません: ${audioUrl}`);
              }
            }
          } catch (checkError) {
            console.error('[AudioPlayer] 音声ファイル確認エラー:', checkError);
            
            // エラーが発生した場合でもテキストがあれば音声合成を試みる
            if (text && text.trim() !== '') {
              console.log('[AudioPlayer] エラー後、テキストから音声を再生成します:', text);
              
              // テキストからTTS生成（バックアップ）
              if (onFinished) {
                setTimeout(() => {
                  onFinished();
                }, 500);
              }
              return;
            }
          }
        }
        
        // 新しいAudio要素を作成
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        console.log('[AudioPlayer] 新しいaudio要素を作成:', audioUrl);
        
        // 再生終了時のイベントリスナー
        audio.onended = () => {
          if (!isEffectActive) return; // エフェクトが無効になっていたら処理を中止
          console.log('[AudioPlayer] 再生完了');
          setIsPlaying(false);
          if (onFinished) {
            onFinished();
          }
        };
        
        // エラーハンドリングを追加
        audio.onerror = (e) => {
          console.error('[AudioPlayer] 音声ファイル読み込みエラー:', e, audio.error);
          console.log('[AudioPlayer] エラーが発生した音声URL:', audioUrl);
          setShowPlayButton(true);
          setIsPlaying(false);
          
          // テキストがある場合は、テキストから直接音声合成を試みる
          if (text && text.trim() !== '') {
            console.log('[AudioPlayer] エラー後、テキストから音声を再生成します:', text);
          }
          
          // エラー時にも完了コールバックを呼び出す
          if (onFinished) {
            onFinished();
          }
        };
        
        // ロード時のイベントリスナー
        audio.onloadeddata = () => {
          console.log('[AudioPlayer] 音声データのロード完了:', audioUrl);
        };
        
        if (autoPlay && hasInteracted) {
          try {
            console.log('[AudioPlayer] 自動再生開始');
            await audio.play();
            if (!isEffectActive) {
              console.log('[AudioPlayer] エフェクト無効化により再生中止');
              audio.pause(); // エフェクトが無効になっていたら再生を停止
              return;
            }
            setIsPlaying(true);
            setShowPlayButton(false);
          } catch (error) {
            console.warn('[AudioPlayer] 自動再生できませんでした:', error);
            setShowPlayButton(true);
            setIsPlaying(false);
            // 再生エラー時にも完了コールバックを呼び出す
            if (onFinished) {
              onFinished();
            }
          }
        } else if (autoPlay && !hasInteracted) {
          // インタラクションなしの場合は再生ボタンを表示
          console.log('[AudioPlayer] ユーザーインタラクションなし - 再生ボタン表示');
          setShowPlayButton(true);
        }
      } catch (error) {
        console.error('[AudioPlayer] 音声再生エラー:', error);
        setShowPlayButton(true);
        setIsPlaying(false);
        // 例外発生時にも完了コールバックを呼び出す
        if (onFinished) {
          onFinished();
        }
      }
    };

    playAudio();
    
    // クリーンアップ関数: エフェクトが再実行されるか、コンポーネントがアンマウントされるときに実行
    return () => {
      isEffectActive = false; // エフェクトの無効化
      if (audioRef.current) {
        console.log('[AudioPlayer] エフェクト終了 - 再生停止');
        audioRef.current.pause(); // 再生中の場合は停止
        // すべてのイベントリスナーを削除
        audioRef.current.onended = null;
        audioRef.current.onerror = null; 
        audioRef.current.onloadeddata = null;
      }
    };
  }, [audioUrl, autoPlay, hasInteracted, onFinished, text]);

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