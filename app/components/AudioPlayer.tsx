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

// URLを整形する関数（改行や空白を削除）
function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // URLから改行と余分な空白を削除
  return url.replace(/[\r\n\s]+/g, '');
}

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
  const [audioError, setAudioError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // 外部URLを整形
  const cleanExternalAudioUrl = externalAudioUrl ? sanitizeUrl(externalAudioUrl) : null;

  // デバッグ用：propsの値をコンソールに出力
  useEffect(() => {
    console.log('AudioPlayer - Props:', { text, autoPlay, externalAudioUrl });
    if (externalAudioUrl) {
      console.log('AudioPlayer - 外部URL整形前:', externalAudioUrl);
      console.log('AudioPlayer - 外部URL整形後:', cleanExternalAudioUrl);
    }
  }, [text, autoPlay, externalAudioUrl, cleanExternalAudioUrl]);

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
    if (cleanExternalAudioUrl) {
      console.log('AudioPlayer - 外部音声URLを使用:', cleanExternalAudioUrl);
      setAudioUrl(cleanExternalAudioUrl);
      setRetryCount(0); // リトライカウントをリセット
      return; // 外部URLがある場合はAPIを呼び出さない
    }
    
    if (!text || text.trim() === '') return;

    console.log('AudioPlayer - テキストから音声を生成:', text);
    
    const generateTTS = async () => {
      try {
        setIsPlaying(false);
        setShowPlayButton(false);
        setAudioError(null);
        
        // APIキーが設定されていない場合やAPIサーバーに問題がある場合のエラーハンドリング
        try {
          // TTS APIを呼び出し
          console.log('AudioPlayer - TTS APIを呼び出し中...');
          const response = await fetch('/api/text-to-speech', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              text, 
              voice,
              save: true // 常にファイルとして保存する
            }),
          });

          if (!response.ok) {
            console.error('TTS APIエラー:', response.status, response.statusText);
            setAudioError(`APIエラー: ${response.status} ${response.statusText}`);
            // エラーが発生した場合はフォールバック：再生ボタンを表示せず、完了ハンドラを呼び出す
            if (onFinished) {
              onFinished();
            }
            return;
          }

          console.log('AudioPlayer - TTS APIレスポンス:', response.status, response.headers.get('Content-Type'));

          if (response.headers.get('Content-Type')?.includes('application/json')) {
            // JSONレスポンスの場合（保存済みの音声URLが返された）
            const data = await response.json();
            console.log('AudioPlayer - JSONレスポンス:', data);
            
            // エラーチェック
            if (data.error) {
              console.error('AudioPlayer - APIエラーレスポンス:', data.error);
              setAudioError(`API処理エラー: ${data.error}`);
              if (onFinished) {
                onFinished();
              }
              return;
            }
            
            // ダミーの音声URLの場合は特別処理
            if (data.isDummy) {
              console.log('ダミー音声URLが返されました。APIキーが設定されていません。');
              setAudioError('APIキーが設定されていません');
              // ダミーURLでも処理を続行し、完了ハンドラを呼び出す
              if (onFinished) {
                onFinished();
              }
              return;
            }
            
            // URLを整形してから設定
            if (!data.audioUrl) {
              console.error('AudioPlayer - 音声URLがレスポンスに含まれていません:', data);
              setAudioError('音声URLが取得できませんでした');
              if (onFinished) {
                onFinished();
              }
              return;
            }
            
            const cleanUrl = sanitizeUrl(data.audioUrl);
            console.log('AudioPlayer - 音声URL設定:', cleanUrl);
            
            if (!cleanUrl) {
              console.error('AudioPlayer - 音声URLが無効です:', data.audioUrl);
              setAudioError('無効な音声URLです');
              if (onFinished) {
                onFinished();
              }
              return;
            }
            
            setAudioUrl(cleanUrl);
          } else {
            // バイナリレスポンスの場合（新規生成された音声）
            // 音声データを取得してBlobに変換
            const audioBlob = await response.blob();
            console.log('AudioPlayer - バイナリレスポンス:', audioBlob.size, 'bytes');
            // 既存のURLを解放
            if (audioUrl && audioUrl.startsWith('blob:')) {
              URL.revokeObjectURL(audioUrl);
            }
            const newAudioUrl = URL.createObjectURL(audioBlob);
            setAudioUrl(newAudioUrl);
            console.log('AudioPlayer - Blob URL作成:', newAudioUrl);
          }
        } catch (error) {
          console.error('音声生成エラー:', error);
          setAudioError(`音声生成エラー: ${error instanceof Error ? error.message : String(error)}`);
          
          // リトライ処理
          if (retryCount < MAX_RETRIES) {
            console.log(`AudioPlayer - リトライ (${retryCount + 1}/${MAX_RETRIES})...`);
            setRetryCount(prev => prev + 1);
            // 少し待ってから再試行
            setTimeout(generateTTS, 1000);
            return;
          }
          
          setShowPlayButton(false);
          // エラー時は再生を行わず、完了ハンドラを呼び出して処理を続行
          if (onFinished) {
            onFinished();
          }
        }
      } catch (error) {
        console.error('TTS生成処理エラー:', error);
        setAudioError(`TTS処理エラー: ${error instanceof Error ? error.message : String(error)}`);
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
      if (audioUrl && !cleanExternalAudioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [text, voice, cleanExternalAudioUrl, retryCount]);

  // 音声URLが変更されたときに再生
  useEffect(() => {
    if (!audioUrl) return;
    
    console.log('AudioPlayer - 音声URLが変更されました:', audioUrl);
    
    let isEffectActive = true; // このエフェクト実行中かどうかを追跡

    const playAudio = async () => {
      try {
        if (!isEffectActive) return; // エフェクトが無効になっていたら処理を中止
        
        if (audioRef.current) {
          console.log('AudioPlayer - 既存のaudio要素に音声をセット:', audioUrl);
          audioRef.current.src = audioUrl;
          
          // エラーハンドラーを設定
          audioRef.current.onerror = (e) => {
            console.error('音声読み込みエラー:', e);
            const errorMsg = `音声ファイルの読み込みに失敗しました: ${audioUrl}`;
            console.error(errorMsg);
            setAudioError(errorMsg);
            
            // リトライ処理
            if (retryCount < MAX_RETRIES && !cleanExternalAudioUrl) {
              console.log(`AudioPlayer - 読み込みリトライ (${retryCount + 1}/${MAX_RETRIES})...`);
              setRetryCount(prev => prev + 1);
              return;
            }
            
            if (onFinished) {
              onFinished();
            }
          };
          
          // 再生終了時のイベントリスナー
          audioRef.current.onended = () => {
            if (!isEffectActive) return; // エフェクトが無効になっていたら処理を中止
            console.log('AudioPlayer - 音声再生完了');
            setIsPlaying(false);
            if (onFinished) {
              onFinished();
            }
          };
          
          if (autoPlay && hasInteracted) {
            try {
              console.log('AudioPlayer - 自動再生を試みます');
              await audioRef.current.play();
              if (!isEffectActive) {
                audioRef.current.pause(); // エフェクトが無効になっていたら再生を停止
                return;
              }
              console.log('AudioPlayer - 自動再生成功');
              setIsPlaying(true);
              setShowPlayButton(false);
            } catch (error) {
              console.warn('自動再生できませんでした:', error);
              setAudioError(`自動再生エラー: ${error instanceof Error ? error.message : String(error)}`);
              setShowPlayButton(true);
            }
          } else if (autoPlay && !hasInteracted) {
            // インタラクションなしの場合は再生ボタンを表示
            console.log('AudioPlayer - インタラクションなし、再生ボタン表示');
            setShowPlayButton(true);
          }
        } else {
          console.log('AudioPlayer - 新しいaudio要素を作成:', audioUrl);
          const audio = new Audio(audioUrl);
          
          // エラーハンドラーを設定
          audio.onerror = (e) => {
            console.error('音声読み込みエラー:', e);
            const errorMsg = `音声ファイルの読み込みに失敗しました: ${audioUrl}`;
            console.error(errorMsg);
            setAudioError(errorMsg);
            
            // リトライ処理
            if (retryCount < MAX_RETRIES && !cleanExternalAudioUrl) {
              console.log(`AudioPlayer - 読み込みリトライ (${retryCount + 1}/${MAX_RETRIES})...`);
              setRetryCount(prev => prev + 1);
              return;
            }
            
            if (onFinished) {
              onFinished();
            }
          };
          
          audio.onended = () => {
            if (!isEffectActive) return; // エフェクトが無効になっていたら処理を中止
            console.log('AudioPlayer - 音声再生完了');
            setIsPlaying(false);
            if (onFinished) {
              onFinished();
            }
          };
          audioRef.current = audio;
          
          if (autoPlay && hasInteracted) {
            try {
              console.log('AudioPlayer - 自動再生を試みます');
              await audio.play();
              if (!isEffectActive) {
                audio.pause(); // エフェクトが無効になっていたら再生を停止
                return;
              }
              console.log('AudioPlayer - 自動再生成功');
              setIsPlaying(true);
              setShowPlayButton(false);
            } catch (error) {
              console.warn('自動再生できませんでした:', error);
              setAudioError(`自動再生エラー: ${error instanceof Error ? error.message : String(error)}`);
              setShowPlayButton(true);
            }
          } else if (autoPlay && !hasInteracted) {
            // インタラクションなしの場合は再生ボタンを表示
            console.log('AudioPlayer - インタラクションなし、再生ボタン表示');
            setShowPlayButton(true);
          }
        }
      } catch (error) {
        console.error('音声再生エラー:', error);
        setAudioError(`再生エラー: ${error instanceof Error ? error.message : String(error)}`);
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
        audioRef.current.onerror = null; // エラーリスナーを削除
      }
    };
  }, [audioUrl, autoPlay, hasInteracted, retryCount]);

  // 手動で音声を再生
  const handlePlay = async () => {
    if (!audioRef.current || !audioUrl) return;
    
    try {
      console.log('AudioPlayer - 手動再生を試みます');
      setAudioError(null);
      await audioRef.current.play();
      setIsPlaying(true);
      setShowPlayButton(false);
    } catch (error) {
      console.error('再生エラー:', error);
      setAudioError(`再生エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (!showPlayButton) {
    return (
      <div className="hidden">
        {audioError && <div className="text-red-500 text-xs">{audioError}</div>}
        <audio ref={audioRef} controls />
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center mt-4">
      {initialNotification && (
        <div className="text-center mb-2 text-sm text-gray-600">
          音声を再生するには画面をクリックしてください
        </div>
      )}
      {audioError && (
        <div className="text-red-500 text-xs mb-2">{audioError}</div>
      )}
      <button
        onClick={handlePlay}
        className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
          <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/>
          <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/>
          <path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7.5 4v8a.5.5 0 0 1-.78.419l-3-2a.5.5 0 0 1 0-.838l3-2V4a.5.5 0 0 1-.003-.01l-.47-.94a.5.5 0 0 1-.117-.173l.002-.003.471-.942A.5.5 0 0 1 6.717 3.55z"/>
        </svg>
      </button>
    </div>
  );
} 