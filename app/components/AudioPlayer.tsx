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
  forceAutoPlay?: boolean; // 強制的に自動再生を試みるフラグ
};

// URLを整形する関数（改行や空白を削除）
function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // URLから改行と余分な空白を削除
  return url.replace(/[\r\n\s]+/g, '');
}

// キャッシュバスティング用のタイムスタンプを追加
function addCacheBuster(url: string | null): string | null {
  if (!url) return null;
  
  // URLにすでにタイムスタンプパラメータがある場合は追加しない
  if (url.includes('t=')) return url;
  
  const timestamp = new Date().getTime();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${timestamp}`;
}

// グローバルなユーザーインタラクション状態
// windowオブジェクトに拡張プロパティを定義
declare global {
  interface Window {
    hasUserInteracted?: boolean;
    forceEnableAudio?: () => Promise<boolean>; // 強制的に音声を有効化する関数
  }
}

// ユーザーインタラクションをシミュレートする試み
const simulateUserInteraction = () => {
  console.log('AudioPlayer - ユーザーインタラクションをシミュレート試行');
  
  // 一時的な無音オーディオを再生して権限を取得
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const emptySource = audioContext.createBufferSource();
    emptySource.buffer = audioContext.createBuffer(1, 1, 22050);
    emptySource.connect(audioContext.destination);
    emptySource.start(0);
    console.log('AudioPlayer - 無音オーディオ再生成功');
    return true;
  } catch (e) {
    console.warn('AudioPlayer - 無音オーディオ再生失敗:', e);
    return false;
  }
};

// グローバル関数として音声を強制的に有効化する関数を登録
if (typeof window !== 'undefined') {
  window.forceEnableAudio = async () => {
    console.log('AudioPlayer - 音声強制有効化を試行');
    
    // ユーザーインタラクションをシミュレート
    const result = simulateUserInteraction();
    
    if (result) {
      console.log('AudioPlayer - 音声強制有効化成功');
      window.hasUserInteracted = true;
      try {
        sessionStorage.setItem('userHasInteracted', 'true');
      } catch (e) {
        console.error('セッションストレージへの保存エラー:', e);
      }
      return true;
    }
    
    console.log('AudioPlayer - 音声強制有効化失敗');
    return false;
  };
}

export default function AudioPlayer({ 
  text, 
  autoPlay, 
  onFinished,
  isPlaying: externalIsPlaying,
  setIsPlaying: externalSetIsPlaying,
  audioUrl: externalAudioUrl,
  forceAutoPlay = false // デフォルトはfalse
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
  const onFinishedCalledRef = useRef(false);
  const userInteractionAttemptedRef = useRef(false);
  const [autoPlayTriggered, setAutoPlayTriggered] = useState(false);
  const previousUrlRef = useRef<string | null>(null); // 前回のURLを記録するためのref
  
  // 外部URLを整形してキャッシュバスティングを追加
  const cleanExternalAudioUrl = externalAudioUrl ? sanitizeUrl(externalAudioUrl) : null;

  // デバッグ用：propsの値をコンソールに出力
  useEffect(() => {
    console.log('AudioPlayer - Props:', { text, autoPlay, externalAudioUrl, forceAutoPlay });
  }, [text, autoPlay, externalAudioUrl, forceAutoPlay]);

  // 内部または外部の状態管理を使用
  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;
  const setIsPlaying = externalSetIsPlaying || setInternalIsPlaying;

  // 再生状態が変わったときにフラグをリセット
  useEffect(() => {
    if (isPlaying) {
      onFinishedCalledRef.current = false;
    }
  }, [isPlaying]);

  // ページロード時に一度だけユーザーインタラクションの状態をセッションストレージから復元
  useEffect(() => {
    try {
      // 強制的に音声を有効化する試み
      if (typeof window !== 'undefined' && window.forceEnableAudio) {
        window.forceEnableAudio().then(success => {
          if (success) {
            console.log('AudioPlayer - 初期化時に音声を強制有効化しました');
          }
        });
      }
      
      // windowのグローバルフラグをチェック
      if (typeof window !== 'undefined' && window.hasUserInteracted) {
        console.log('AudioPlayer - グローバルユーザーインタラクション状態を復元');
        setHasInteracted(true);
        userInteractionAttemptedRef.current = true;
        setInitialNotification(false);
        return;
      }
      
      // セッションストレージを確認
      const interactionData = sessionStorage.getItem('userHasInteracted');
      if (interactionData === 'true') {
        console.log('AudioPlayer - 保存済みのユーザーインタラクション状態を復元');
        setHasInteracted(true);
        userInteractionAttemptedRef.current = true;
        setInitialNotification(false);
        
        // グローバルフラグにも設定
        if (typeof window !== 'undefined') {
          window.hasUserInteracted = true;
        }
      }
    } catch (e) {
      console.error('ユーザーインタラクション状態復元エラー:', e);
    }
  }, []);

  // ユーザーインタラクション検出
  useEffect(() => {
    const handleInteraction = () => {
      console.log('AudioPlayer - ユーザーインタラクションを検出');
      setHasInteracted(true);
      setInitialNotification(false);
      userInteractionAttemptedRef.current = true;
      
      // グローバルフラグに設定
      if (typeof window !== 'undefined') {
        window.hasUserInteracted = true;
      }
      
      // セッションストレージにインタラクション状態を保存
      try {
        sessionStorage.setItem('userHasInteracted', 'true');
      } catch (e) {
        console.error('セッションストレージへの保存エラー:', e);
      }

      // 再生待機中の音声があれば再生を試みる
      if (audioRef.current && audioUrl && autoPlay && !isPlaying) {
        console.log('AudioPlayer - インタラクション後の再生試行');
        audioRef.current.play()
          .then(() => {
            console.log('AudioPlayer - インタラクション後の再生成功');
            setIsPlaying(true);
            setShowPlayButton(false);
          })
          .catch(error => {
            console.error('インタラクション後の再生エラー:', error);
            setAudioError(`再生エラー: ${error instanceof Error ? error.message : String(error)}`);
            setShowPlayButton(true);
          });
      }
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, [audioUrl, autoPlay, isPlaying, setIsPlaying]);

  // 外部から音声URLが提供されている場合はそれを使用
  useEffect(() => {
    // 音声URLの変更をログ出力
    console.log('AudioPlayer - 音声URLが変更されました: –', cleanExternalAudioUrl);
    
    if (cleanExternalAudioUrl) {
      console.log('AudioPlayer - 外部音声URLを使用:', cleanExternalAudioUrl);
      
      // 既に同じURLが設定されている場合は再設定しない
      if (previousUrlRef.current === cleanExternalAudioUrl) {
        console.log('AudioPlayer - 同じURLが既に設定されているため、再設定をスキップします:', cleanExternalAudioUrl);
        return;
      }
      
      // 新しいURLを設定して記録
      const urlWithCacheBuster = addCacheBuster(cleanExternalAudioUrl);
      console.log('AudioPlayer - 音声をセット: –', urlWithCacheBuster);
      
      setAudioUrl(urlWithCacheBuster);
      previousUrlRef.current = cleanExternalAudioUrl; // オリジナルURLを保存
      setRetryCount(0); // リトライカウントをリセット
      onFinishedCalledRef.current = false; // 新しいURLが設定されたらフラグをリセット
      
      if (forceAutoPlay) {
        console.log('AudioPlayer - 音声URL変更時に音声を強制有効化しました');
        // 音声の強制有効化を試みる
        if (typeof window !== 'undefined' && window.forceEnableAudio) {
          window.forceEnableAudio().then(success => {
            if (success && audioRef.current) {
              // 少し遅延を入れて再生を試みる
              setTimeout(() => {
                if (audioRef.current) {
                  audioRef.current.play()
                    .then(() => {
                      console.log('AudioPlayer - URL変更後の強制再生成功');
                      setIsPlaying(true);
                    })
                    .catch(e => console.error('強制再生エラー:', e));
                }
              }, 300);
            }
          });
        }
      }
      
      return; // 外部URLがある場合はAPIを呼び出さない
    }
    
    if (!text || text.trim() === '') return;

    console.log('AudioPlayer - テキストから音声を生成:', text);
    onFinishedCalledRef.current = false; // 新しいテキストが設定されたらフラグをリセット
    
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
            if (onFinished && !onFinishedCalledRef.current) {
              onFinishedCalledRef.current = true;
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
              if (onFinished && !onFinishedCalledRef.current) {
                onFinishedCalledRef.current = true;
                onFinished();
              }
              return;
            }
            
            // ダミーの音声URLの場合は特別処理
            if (data.isDummy) {
              console.log('ダミー音声URLが返されました。APIキーが設定されていません。');
              setAudioError('APIキーが設定されていません');
              // ダミーURLでも処理を続行し、完了ハンドラを呼び出す
              if (onFinished && !onFinishedCalledRef.current) {
                onFinishedCalledRef.current = true;
                onFinished();
              }
              return;
            }
            
            // URLを整形してから設定
            if (!data.audioUrl) {
              console.error('AudioPlayer - 音声URLがレスポンスに含まれていません:', data);
              setAudioError('音声URLが取得できませんでした');
              if (onFinished && !onFinishedCalledRef.current) {
                onFinishedCalledRef.current = true;
                onFinished();
              }
              return;
            }
            
            const cleanUrl = sanitizeUrl(data.audioUrl);
            console.log('AudioPlayer - 音声URL設定:', cleanUrl);
            
            if (!cleanUrl) {
              console.error('AudioPlayer - 音声URLが無効です:', data.audioUrl);
              setAudioError('無効な音声URLです');
              if (onFinished && !onFinishedCalledRef.current) {
                onFinishedCalledRef.current = true;
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
          if (onFinished && !onFinishedCalledRef.current) {
            onFinishedCalledRef.current = true;
            onFinished();
          }
        }
      } catch (error) {
        console.error('TTS生成処理エラー:', error);
        setAudioError(`TTS処理エラー: ${error instanceof Error ? error.message : String(error)}`);
        // 最終的なエラーハンドリング：完了ハンドラを呼び出して処理を続行
        if (onFinished && !onFinishedCalledRef.current) {
          onFinishedCalledRef.current = true;
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
  }, [cleanExternalAudioUrl, text, forceAutoPlay, setIsPlaying]);

  // 音声URLが変更されたときに再生
  useEffect(() => {
    if (!audioUrl) return;
    
    // 既に同じURLに対する処理が行われている場合はスキップ
    if (previousUrlRef.current === audioUrl) {
      if (audioRef.current?.src && audioRef.current.src.includes(encodeURIComponent(audioUrl))) {
        console.log('AudioPlayer - 同じURLに対する再生処理が既に行われているためスキップします', audioUrl);
        return;
      }
    }
    
    // デバウンス処理: 連続してURLが変更された場合に処理を抑制する
    const currentUrl = audioUrl;
    const debounceDelay = 50;
    const debounceTimerRef = setTimeout(() => {
      // タイマー実行時に最新のURLと一致していることを確認
      if (currentUrl === audioUrl) {
        executeUrlChange(currentUrl);
      } else {
        console.log('AudioPlayer - URL変更処理がデバウンスされました');
      }
    }, debounceDelay);
    
    // クリーンアップ関数
    return () => {
      clearTimeout(debounceTimerRef);
    };
  }, [audioUrl, autoPlay, hasInteracted, retryCount, forceAutoPlay, onFinished]);

  // URLの変更を実際に処理する関数
  const executeUrlChange = (url: string) => {
    if (!url) return;
    
    // URLを記録
    previousUrlRef.current = url;
    console.log('AudioPlayer - 音声URLが変更されました:', url);
    
    let isEffectActive = true; // このエフェクト実行中かどうかを追跡
    onFinishedCalledRef.current = false; // 音声URL変更時にフラグをリセット
    setAutoPlayTriggered(false); // 自動再生トリガーをリセット

    // 強制的に音声を有効化する試み
    if (typeof window !== 'undefined' && window.forceEnableAudio) {
      window.forceEnableAudio().then(success => {
        if (success) {
          console.log('AudioPlayer - 音声URL変更時に音声を強制有効化しました');
        }
      });
    }

    const attemptAutoPlay = async () => {
      try {
        if (!audioRef.current || !isEffectActive || !audioRef.current.src) return;
        
        // 再生前に無音再生を試みる
        simulateUserInteraction();
        
        console.log('AudioPlayer - 自動再生を1回だけ試行します');
        
        // 音量を確実に設定
        audioRef.current.volume = 1.0;
        
        // 再生状態の確認（既に再生中なら再試行しない）
        if (!audioRef.current.paused) {
          console.log('AudioPlayer - 既に再生中のため再試行しません');
          setIsPlaying(true);
          setShowPlayButton(false);
          return;
        }
        
        // インタラクション状態を確認して、再度シミュレーション
        if (typeof window !== 'undefined' && window.forceEnableAudio) {
          await window.forceEnableAudio();
        }
        
        // 再生を試みる (1回のみ)
        await audioRef.current.play();
        console.log('AudioPlayer - 自動再生成功');
        setIsPlaying(true);
        setShowPlayButton(false);
      } catch (error) {
        console.warn('自動再生失敗:', error);
        setShowPlayButton(true);
        
        // 自動再生ができない場合は、完了ハンドラを呼び出す
        if (onFinished && !onFinishedCalledRef.current) {
          console.log('AudioPlayer - 自動再生失敗のため完了ハンドラを呼び出し');
          onFinishedCalledRef.current = true;
          setTimeout(() => {
            onFinished();
          }, 500);
        }
      }
    };

    const playAudio = async () => {
      try {
        if (!isEffectActive) return; // エフェクトが無効になっていたら処理を中止
        
        // 一箇所だけでオーディオ要素を準備する
        if (!audioRef.current) {
          // 新しいAudio要素を作成
          console.log('AudioPlayer - 新しいaudio要素を作成:', url);
          const audio = new Audio();
          audioRef.current = audio;
        }
        
        // URLをプロキシ経由に変換してからキャッシュバスティングを追加（一度だけ）
        const sanitizedUrl = sanitizeUrl(url);
        const urlWithCacheBuster = url.includes('t=') ? sanitizedUrl : addCacheBuster(sanitizedUrl);
        
        // 既に同じURLが設定されている場合は再設定しない
        const currentSrc = audioRef.current.src;
        if (currentSrc && currentSrc.includes(encodeURIComponent(sanitizedUrl))) {
          console.log('AudioPlayer - 同じURLが既に設定されているため、src再設定をスキップします');
        } else {
          console.log('AudioPlayer - 音声をセット:', urlWithCacheBuster);
          
          // 音声ファイルが存在するか確認
          try {
            const response = await fetch(urlWithCacheBuster, { method: 'HEAD' });
            if (!response.ok) {
              console.error(`AudioPlayer - 音声ファイルが存在しないか、アクセスできません: ${response.status} ${response.statusText}`);
              throw new Error(`音声ファイルが存在しないか、アクセスできません: ${response.status}`);
            }
            console.log('AudioPlayer - 音声ファイルの存在を確認:', response.ok);
          } catch (fetchError) {
            console.error('AudioPlayer - 音声ファイル確認エラー:', fetchError);
            // エラー発生時も処理を継続するため、ここでは例外を再スローしない
          }
          
          // 音声ファイルを設定
          audioRef.current.src = urlWithCacheBuster || '';
          audioRef.current.preload = 'auto';
          audioRef.current.crossOrigin = 'anonymous'; // CORSを有効化
          audioRef.current.volume = 1.0; // 音量を最大に設定
          
          // 音声ファイルの読み込み開始
          console.log('AudioPlayer - 音声ファイルの読み込みを開始');
          audioRef.current.load();
        }
        
        // エラーハンドラーを設定
        audioRef.current.onerror = (e) => {
          const error = e as ErrorEvent;
          console.error('音声読み込みエラー:', error);
          const errorMsg = `音声ファイルの読み込みに失敗しました: ${urlWithCacheBuster}, エラー: ${error.message || '不明なエラー'}`;
          console.error(errorMsg);
          setAudioError(errorMsg);
          
          // エラー時は再生を行わず、完了ハンドラを呼び出して処理を続行
          if (onFinished && !onFinishedCalledRef.current) {
            console.log('AudioPlayer - エラー発生のため完了ハンドラを呼び出し');
            onFinishedCalledRef.current = true;
            setTimeout(() => {
              onFinished();
            }, 100);
          }
        };
        
        // 再生終了時のイベントリスナー
        audioRef.current.onended = () => {
          if (!isEffectActive) return; // エフェクトが無効になっていたら処理を中止
          console.log('AudioPlayer - 音声再生完了');
          setIsPlaying(false);
          
          // 完了ハンドラが未呼び出しの場合のみ実行
          if (onFinished && !onFinishedCalledRef.current) {
            console.log('AudioPlayer - 再生完了時に完了ハンドラを呼び出し');
            onFinishedCalledRef.current = true;
            setTimeout(() => {
              onFinished();
            }, 100);
          }
        };
        
        // 音声の読み込みが完了したらautoPlayが有効なら再生を試みる
        audioRef.current.onloadeddata = () => {
          console.log('AudioPlayer - 音声データ読み込み完了');
          
          // 自動再生がすでに試行されていて成功している場合はスキップ
          if (autoPlayTriggered && isPlaying) {
            console.log('AudioPlayer - 既に自動再生が成功しているため再試行しません');
            return;
          }
          
          if (autoPlay && !autoPlayTriggered) {
            setAutoPlayTriggered(true); // 自動再生を試みた状態にする
            
            // ユーザーインタラクションがあるか強制再生フラグがある場合は再生を試みる
            if (hasInteracted || userInteractionAttemptedRef.current || forceAutoPlay || (typeof window !== 'undefined' && window.hasUserInteracted)) {
              console.log('AudioPlayer - 自動再生を開始します');
              attemptAutoPlay();
            } else {
              // インタラクションなしの場合は再生ボタンを表示
              console.log('AudioPlayer - インタラクションなし、再生ボタン表示');
              setShowPlayButton(true);
              
              // 自動再生ができない場合は、ユーザーインタラクションなしで完了ハンドラを呼び出す
              if (onFinished && !onFinishedCalledRef.current) {
                console.log('AudioPlayer - インタラクションなしのため完了ハンドラを呼び出し');
                onFinishedCalledRef.current = true;
                setTimeout(() => {
                  onFinished();
                }, 500);
              }
            }
          }
        };
        
        // 代替手段: 音声ファイルをフェッチしてからBlobとして再生
        if (forceAutoPlay) {
          try {
            console.log('AudioPlayer - 代替手段: フェッチによる音声読み込みを試行');
            fetch(urlWithCacheBuster)
              .then(response => {
                if (!response.ok) {
                  throw new Error(`音声ファイルのフェッチに失敗: ${response.status}`);
                }
                return response.blob();
              })
              .then(blob => {
                if (!isEffectActive) return;
                
                const blobUrl = URL.createObjectURL(blob);
                console.log('AudioPlayer - Blob URLを作成:', blobUrl);
                
                if (audioRef.current) {
                  audioRef.current.src = blobUrl;
                  audioRef.current.load();
                  
                  // 読み込み完了後に1回だけ自動再生を試みる
                  audioRef.current.oncanplaythrough = () => {
                    console.log('AudioPlayer - Blob音声の再生準備完了');
                    if (autoPlay && !isPlaying && !autoPlayTriggered) {
                      setAutoPlayTriggered(true);
                      console.log('AudioPlayer - Blob音声の再生を1回だけ試行します');
                      audioRef.current?.play().catch(error => {
                        console.warn('Blob音声自動再生失敗:', error);
                        setShowPlayButton(true);
                      });
                    }
                  };
                }
              })
              .catch(error => {
                console.error('AudioPlayer - フェッチによる音声読み込みエラー:', error);
                if (onFinished && !onFinishedCalledRef.current) {
                  onFinishedCalledRef.current = true;
                  setTimeout(() => {
                    onFinished();
                  }, 500);
                }
              });
          } catch (fetchError) {
            console.error('AudioPlayer - フェッチエラー:', fetchError);
          }
        }
        
      } catch (error) {
        console.error('音声再生エラー:', error);
        setAudioError(`再生エラー: ${error instanceof Error ? error.message : String(error)}`);
        setShowPlayButton(true);
        
        // エラー発生時も会話フローを継続するために完了ハンドラを呼び出す
        if (onFinished && !onFinishedCalledRef.current) {
          onFinishedCalledRef.current = true;
          setTimeout(() => {
            onFinished();
          }, 500);
        }
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
        audioRef.current.onloadeddata = null; // 読み込み完了リスナーを削除
        audioRef.current.oncanplaythrough = null; // 再生準備完了リスナーを削除
      }
    };
  };

  // 手動で音声を再生
  const handlePlay = async () => {
    if (!audioRef.current || !audioUrl) return;
    
    try {
      console.log('AudioPlayer - 手動再生を試みます');
      setAudioError(null);
      // 再生前にフラグをリセット
      onFinishedCalledRef.current = false;
      userInteractionAttemptedRef.current = true; // ユーザーインタラクションフラグを設定
      
      // 音声を読み込み直して再生
      audioRef.current.load();
      await audioRef.current.play();
      setIsPlaying(true);
      setShowPlayButton(false);
    } catch (error) {
      console.error('再生エラー:', error);
      setAudioError(`再生エラー: ${error instanceof Error ? error.message : String(error)}`);
      
      // 再生エラーでも会話を進める
      if (onFinished && !onFinishedCalledRef.current) {
        onFinishedCalledRef.current = true;
        onFinished();
      }
    }
  };

  // 音声を事前に準備する関数（iOS Safari対策）
  useEffect(() => {
    // コンポーネントマウント時に一度だけ実行
    const prepareAudio = () => {
      if (!audioRef.current) {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.volume = 0;
        audio.muted = true;
        
        // 短い無音ファイルを再生して音声コンテキストを有効化
        audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        
        audio.play().then(() => {
          console.log('AudioPlayer - 音声コンテキスト初期化成功');
          audio.pause();
        }).catch(err => {
          console.log('AudioPlayer - 音声コンテキスト初期化失敗:', err);
        });
        
        audioRef.current = audio;
      }
    };
    
    prepareAudio();
  }, []);

  // 手動再生ボタンのクリックハンドラ
  const handlePlayButtonClick = async () => {
    if (!audioRef.current || !audioUrl) return;
    
    try {
      console.log('AudioPlayer - 手動再生ボタンがクリックされました');
      
      // 強制的に音声を有効化する試み
      if (typeof window !== 'undefined' && window.forceEnableAudio) {
        await window.forceEnableAudio();
      }
      
      // インタラクション状態を更新
      setHasInteracted(true);
      userInteractionAttemptedRef.current = true;
      setInitialNotification(false);
      
      // グローバルフラグに設定
      if (typeof window !== 'undefined') {
        window.hasUserInteracted = true;
      }
      
      // セッションストレージにインタラクション状態を保存
      try {
        sessionStorage.setItem('userHasInteracted', 'true');
      } catch (e) {
        console.error('セッションストレージへの保存エラー:', e);
      }
      
      // 音声を再生
      await audioRef.current.play();
      setIsPlaying(true);
      setShowPlayButton(false);
    } catch (error) {
      console.error('手動再生エラー:', error);
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
        onClick={handlePlayButtonClick}
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