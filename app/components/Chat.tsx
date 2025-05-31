'use client';

import { useState, useRef, useEffect } from 'react';
import AudioRecorder from './AudioRecorder';
import AudioPlayer from './AudioPlayer';
import AnimatedAvatar from './AnimatedAvatar';
import { useChatMode } from '../context/ChatModeContext';
import EnglishLesson from './lessons/EnglishLesson';
import ChatSettings from './ChatSettings';
import { useModel } from '../context/ModelContext';
import { useVoice } from '../context/VoiceContext';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  translation?: string; // 翻訳テキスト用のフィールドを追加
  audioUrl?: string; // 音声URLをキャッシュするフィールドを追加
};

// モードごとのシステムプロンプト
const SYSTEM_PROMPTS = {
  'free-talk': 'You are a customer visiting a hair salon. Respond in English as if you are the customer talking to a hairstylist (the user). Ask questions about hairstyles, express your preferences, and engage in natural conversation. Start with a simple greeting in English.',
  'ai-lesson': '英会話学習サポートとして振る舞ってください。日本人の英語学習者に対して英会話を教えるサポートをします。基本的に英語で会話してください。文法や単語の使い方を優しく指導し、会話の流れを重視してください。学習者の英語力を向上させるための質問や課題も提案してください。日本語で話しかけられた場合は、簡単な英語で返答し、必要に応じて日本語での説明を付け加えてください。最初の挨拶は英語でシンプルに始めてください。'
};

// モードごとのエラーメッセージ
const ERROR_MESSAGES = {
  'free-talk': 'Sorry, there was an error. Could you please try again?',
  'ai-lesson': 'すみません、エラーが発生しました。もう一度お試しください。'
};

// モードごとのデフォルトメッセージ
const DEFAULT_MESSAGES = {
  'free-talk': 'Hello! I\'m here for a haircut today. I\'m thinking about changing my hairstyle. What would you recommend?',
  'ai-lesson': 'Hello! I\'m your English conversation tutor. How can I help you today?'
};

export default function Chat() {
  const { mode } = useChatMode();
  const { ttsModel, ttsPromptSettings } = useModel();
  const { voice } = useVoice();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: SYSTEM_PROMPTS[mode] }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [lastSentMessage, setLastSentMessage] = useState('');
  const [lastSentTime, setLastSentTime] = useState(0);
  const [currentTtsText, setCurrentTtsText] = useState('');
  const [showTranslations, setShowTranslations] = useState<{[key: number]: boolean}>({});
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // クライアントサイドでのみ実行される処理
  useEffect(() => {
    setIsClient(true);
  }, []);

  // モードが変更されたときにシステムプロンプトを更新し、セッションをリセット
  useEffect(() => {
    if (!isClient) return;
    
    console.log('Mode changed to:', mode);
    setMessages([{ role: 'system', content: SYSTEM_PROMPTS[mode] }]);
    setCurrentTtsText('');
    setShowTranslations({});
    initialMessageSentRef.current = false;
    setSessionStarted(false);
  }, [mode, isClient]);

  // モードが変更されたときのリセット処理
  useEffect(() => {
    if (!isClient) return;
    
    // リセットイベントのリスナー
    const handleReset = () => {
      console.log('Chat reset triggered by mode change event');
      // メッセージは既にモード変更時のuseEffectでリセットされるので、
      // ここでは追加のリセット処理が必要な場合のみ行う
    };

    // イベントリスナーの登録
    window.addEventListener('reset-chat', handleReset);
    
    // クリーンアップ
    return () => {
      window.removeEventListener('reset-chat', handleReset);
    };
  }, [isClient]);

  // セッション開始時に初期メッセージを取得
  const startSession = () => {
    if (!sessionStarted && !initialMessageSentRef.current) {
      setSessionStarted(true);
      initialMessageSentRef.current = true;
      handleInitialMessage();
    }
  };

  // 初回メッセージの取得
  const handleInitialMessage = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('API応答エラー');
      }

      const data = await response.json();
      
      // アシスタントの応答を追加
      setMessages(prev => [...prev, data.message]);
      
      // 音声を生成してキャッシュ
      await generateAudioForMessage(data.message);
    } catch (error) {
      console.error('初回メッセージエラー:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: DEFAULT_MESSAGES[mode] }]);
    } finally {
      setIsLoading(false);
    }
  };

  // メッセージが追加されたら自動スクロール
  useEffect(() => {
    if (!isClient) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isClient]);

  // アシスタントのメッセージが追加されたらTTSを再生
  useEffect(() => {
    if (!isClient) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      console.log('アシスタントメッセージを検出、TTS再生準備');
      setCurrentTtsText(lastMessage.content);
    }
  }, [messages, isClient]);
  
  // TTSの再生状態をコンソールに出力（デバッグ用）
  useEffect(() => {
    if (isClient) {
      console.log('音声再生状態:', isAudioPlaying ? '再生中' : '停止中');
    }
  }, [isAudioPlaying, isClient]);

  // 翻訳表示の切り替え
  const toggleTranslation = async (index: number) => {
    const message = messages[index + 1]; // system メッセージをスキップ
    
    if (!message.translation) {
      // 翻訳がまだない場合、翻訳APIを呼び出す
      setIsLoading(true);
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: message.content,
            targetLang: 'ja',
          }),
        });

        if (!response.ok) {
          throw new Error('翻訳APIエラー');
        }

        const data = await response.json();
        
        // 翻訳を保存
        setMessages(prev => {
          const updated = [...prev];
          updated[index + 1] = { ...message, translation: data.translation };
          return updated;
        });
      } catch (error) {
        console.error('翻訳エラー:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    // 翻訳表示の切り替え
    setShowTranslations(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // 音声認識結果の処理
  const handleTranscription = (text: string, autoSubmit = false) => {
    if (text && text.trim() !== '') {
      console.log(`音声認識結果: "${text}" (モード: ${mode})`);
      
      // フリートークモードでは常に自動送信を有効にする
      const shouldAutoSubmit = mode === 'free-talk' || autoSubmit;
      
      // 自動送信が有効で、同じメッセージが連続で送信されないようにチェック
      if (shouldAutoSubmit) {
        const currentTime = Date.now();
        const timeSinceLastSent = currentTime - lastSentTime;
        
        console.log(`前回の送信からの経過時間: ${timeSinceLastSent}ms, 同一メッセージ: ${text === lastSentMessage}, 読み込み中: ${isLoading}`);
        
        // 前回の送信から3秒以上経過していて、同じメッセージではない場合のみ送信
        if (timeSinceLastSent > 3000 && text !== lastSentMessage && !isLoading) {
          console.log('メッセージを送信します:', text);
          handleSubmitMessage(text);
        } else {
          console.log('メッセージ送信をスキップしました (重複や間隔が短い)');
        }
      }
    }
  };

  // メッセージを送信（音声認識からの直接送信用）
  const handleSubmitMessage = async (messageText: string) => {
    if (messageText.trim() === '' || isLoading) return;

    // ユーザーメッセージを追加
    const userMessage: Message = { role: 'user', content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // 最後に送信したメッセージと時間を記録
    setLastSentMessage(messageText);
    setLastSentTime(Date.now());

    try {
      // APIリクエスト
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].filter(msg => msg.role !== 'system' || messages.indexOf(msg) === 0),
        }),
      });

      if (!response.ok) {
        throw new Error('API応答エラー');
      }

      const data = await response.json();
      
      // アシスタントの応答を追加
      setMessages(prev => [...prev, data.message]);
      
      // 音声を生成してキャッシュ
      await generateAudioForMessage(data.message);
    } catch (error) {
      console.error('エラー:', error);
      // エラーメッセージを表示
      setMessages(prev => [...prev, { role: 'assistant', content: ERROR_MESSAGES[mode] }]);
    } finally {
      setIsLoading(false);
    }
  };

  // メッセージの音声を生成してキャッシュする関数
  const generateAudioForMessage = async (message: Message) => {
    try {
      // TTS APIを呼び出し
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: message.content, 
          voice, 
          model: ttsModel,
          useCustomPrompt: ttsPromptSettings.useCustomPrompt,
          ttsPrompt: ttsPromptSettings.voicePrompt
        }),
      });

      if (!response.ok) {
        throw new Error('TTS APIエラー');
      }

      // 音声データを取得してBlobに変換
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // メッセージに音声URLを追加
      setMessages(prev => {
        const newMessages = [...prev];
        const messageIndex = newMessages.findIndex(msg => 
          msg.role === 'assistant' && 
          msg.content === message.content
        );
        
        if (messageIndex !== -1) {
          newMessages[messageIndex] = {
            ...newMessages[messageIndex],
            audioUrl
          };
        }
        
        return newMessages;
      });
      
      // 最初の応答は自動的に音声を再生
      setCurrentTtsText(message.content);
    } catch (error) {
      console.error('音声生成エラー:', error);
    }
  };

  // 音声を再生する関数
  const playMessageAudio = (message: Message) => {
    if (message.audioUrl) {
      // キャッシュされた音声を再生
      const audio = new Audio(message.audioUrl);
      setIsAudioPlaying(true);
      audio.play().catch(error => console.error('音声再生エラー:', error));
      
      // 音声の再生終了時にフラグをリセット
      audio.onended = () => {
        console.log('音声再生終了');
        setIsAudioPlaying(false);
      };
    } else {
      // 音声がキャッシュされていない場合はテキストを使って再生
      setCurrentTtsText(message.content);
    }
  };

  // サーバーサイドレンダリング時に一貫性のある内容を返す
  if (!isClient) {
    return (
      <div className="flex flex-col h-[80vh] max-w-2xl mx-auto bg-white rounded-lg shadow-md">
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">
                チャット読み込み中...
              </h2>
            </div>
          </div>
        </div>
        <div className="p-4 border-t">
          <div className="text-center text-gray-500">
            読み込み中...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[80vh] max-w-5xl mx-auto bg-white rounded-lg shadow-md relative">
      {/* TTSプレーヤー（非表示） */}
      <AudioPlayer 
        text={currentTtsText} 
        autoPlay={true} 
        isPlaying={isAudioPlaying}
        setIsPlaying={setIsAudioPlaying}
      />

      {/* AIレッスンモードの場合はレッスンコンポーネントを表示 */}
      {mode === 'ai-lesson' ? (
        <EnglishLesson />
      ) : (
        // フリートークモードの場合は通常のチャットを表示
        <>
          {/* 背景アバター - 会話開始後のみ表示 */}
          {sessionStarted && <AnimatedAvatar isPlaying={isAudioPlaying} />}
          
          <div className="p-2 flex justify-end z-10 relative">
            <ChatSettings />
          </div>
          
          {/* チャットエリアとマイクボタンの配置 */}
          <div className="flex-1 flex flex-col relative z-10">
            {/* チャット履歴エリア - 上部に十分なスペースを確保 */}
            {sessionStarted && <div className="h-[40%]"></div>}
            <div className={`${sessionStarted ? 'h-[60%]' : 'h-full'} p-4 overflow-y-auto bg-white bg-opacity-90 rounded-t-3xl`}>
              {sessionStarted ? (
                // セッション開始後の会話表示
                <>
                  {messages.filter(msg => msg.role !== 'system').map((message, index) => (
                    <div
                      key={index}
                      className={`mb-4 ${
                        message.role === 'user' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex items-start">
                          <div
                            className="p-3 rounded-lg max-w-[80%] bg-gray-200 text-gray-800"
                          >
                            {message.content}
                            <div className="flex items-center mt-1 space-x-2">
                              <button 
                                onClick={() => playMessageAudio(message)} 
                                className="text-sm text-gray-800 hover:text-black flex items-center gap-1 border border-gray-300 rounded px-2 py-1"
                                title="もう一度読み上げる"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/>
                                  <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/>
                                  <path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8A3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/>
                                </svg>
                                <span>音声</span>
                              </button>
                              
                              <button 
                                onClick={() => toggleTranslation(index)}
                                className="text-sm text-gray-800 hover:text-black flex items-center gap-1 border border-gray-300 rounded px-2 py-1"
                                title="翻訳を表示/非表示"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                  <path fillRule="evenodd" d="M0 5a2 2 0 0 1 2-2h7.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 4.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 13H2a2 2 0 0 1-2-2V5z"/>
                                </svg>
                                <span>翻訳</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {message.role === 'user' && (
                        <div
                          className="inline-block p-3 rounded-lg max-w-[80%] bg-blue-500 text-white"
                        >
                          {message.content}
                        </div>
                      )}
                      
                      {/* 翻訳テキストの表示 */}
                      {message.role === 'assistant' && showTranslations[index] && (
                        <div className="mt-1 text-left text-sm text-gray-800 px-3">
                          {message.translation ? message.translation : '翻訳中...'}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                // セッション開始前の案内表示
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-semibold mb-2 text-black">
                      {mode === 'free-talk' ? 'フリートークモード' : 'AIレッスンモード'}
                    </h2>
                    <p className="text-black mb-4">
                      {mode === 'free-talk' 
                        ? '自由な英会話を楽しむモードです。美容院のお客さんとして英語で会話できます。' 
                        : '英会話学習のためのAIレッスンモードです。英語のスキルアップをサポートします。'}
                    </p>
                    <button
                      onClick={startSession}
                      className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      会話を始める
                    </button>
                  </div>
                </div>
              )}
              
              {isLoading && (
                <div className="text-left mb-4">
                  <div className="p-3 rounded-lg bg-gray-200 text-gray-800">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div className="pb-20" ref={messagesEndRef} />
            </div>
            
            {/* マイクボタンを中央下部に固定配置 */}
            {sessionStarted && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center z-20">
                <div className="flex flex-col items-center bg-white bg-opacity-90 p-3 rounded-full shadow-lg">
                  <div className="mb-2 text-center text-sm text-gray-700 font-medium">
                    {isRecording ? "話し終わったらマイクをタップ" : "マイクをタップして話す"}
                  </div>
                  <div className="transform scale-150">
                    <AudioRecorder 
                      onTranscription={handleTranscription} 
                      isRecording={isRecording}
                      setIsRecording={setIsRecording}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 初期状態のみ表示 */}
          {!sessionStarted && (
            <div className="p-4 border-t flex justify-center items-center relative z-10">
              <div className="text-center text-black">
                「会話を始める」ボタンをクリックして会話を開始してください
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
} 