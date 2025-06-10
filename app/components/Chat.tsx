'use client';

import { useState, useRef, useEffect } from 'react';
import AudioRecorder from './AudioRecorder';
import AudioPlayer from './AudioPlayer';
import { useChatMode } from '../context/ChatModeContext';
import EnglishLesson from './lessons/EnglishLesson';
import { useModel } from '../context/ModelContext';
import { useVoice } from '../context/VoiceContext';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  translation?: string; // 翻訳テキスト用のフィールドを追加
  audioUrl?: string; // 音声URLをキャッシュするフィールドを追加
};

// AIレッスンモードのシステムプロンプト
const SYSTEM_PROMPT = '英会話学習サポートとして振る舞ってください。日本人の英語学習者に対して英会話を教えるサポートをします。基本的に英語で会話してください。文法や単語の使い方を優しく指導し、会話の流れを重視してください。学習者の英語力を向上させるための質問や課題も提案してください。日本語で話しかけられた場合は、簡単な英語で返答し、必要に応じて日本語での説明を付け加えてください。最初の挨拶は英語でシンプルに始めてください。';

// エラーメッセージ
const ERROR_MESSAGE = 'すみません、エラーが発生しました。もう一度お試しください。';

// デフォルトメッセージ
const DEFAULT_MESSAGE = 'Hello! I\'m your English conversation tutor. How can I help you today?';

// カスタムイベントの型定義
declare global {
  interface WindowEventMap {
    'reset-chat': CustomEvent;
    'start-lesson': CustomEvent;
  }
}

export default function Chat() {
  const { mode } = useChatMode();
  const { ttsModel, ttsPromptSettings } = useModel();
  const { voice } = useVoice();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: SYSTEM_PROMPT }
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

  // クライアントサイドでのみ実行される処理
  useEffect(() => {
    setIsClient(true);
  }, []);

  // システムプロンプトの更新
  useEffect(() => {
    if (!isClient) return;
    
    // レッスン固有のシステムプロンプトがあれば使用する
    let systemPrompt = SYSTEM_PROMPT;
    try {
      const customPrompt = sessionStorage.getItem('currentLessonPrompt');
      if (customPrompt) {
        systemPrompt = customPrompt;
        console.log('レッスン固有のシステムプロンプトを使用します');
      }
    } catch (error) {
      console.error('カスタムプロンプトの取得エラー:', error);
    }
    
    setMessages([{ role: 'system', content: systemPrompt }]);
    setCurrentTtsText('');
    setShowTranslations({});
    initialMessageSentRef.current = false;
    setSessionStarted(false);
  }, [isClient]);

  // リセットイベントのリスナー
  useEffect(() => {
    if (!isClient) return;
    
    const handleReset = () => {
      console.log('Chat reset triggered by event');
      // メッセージは既にuseEffectでリセットされるので、
      // ここでは追加のリセット処理が必要な場合のみ行う
    };

    // イベントリスナーの登録
    window.addEventListener('reset-chat', handleReset);
    
    // クリーンアップ
    return () => {
      window.removeEventListener('reset-chat', handleReset);
    };
  }, [isClient]);

  // レッスン開始イベントのリスナー
  useEffect(() => {
    if (!isClient) return;

    const handleStartLesson = () => {
      console.log('自動レッスン開始イベントを受信');
      if (!sessionStarted && !initialMessageSentRef.current) {
        startSession();
      }
    };

    // イベントリスナーの登録
    window.addEventListener('start-lesson', handleStartLesson);
    
    // クリーンアップ
    return () => {
      window.removeEventListener('start-lesson', handleStartLesson);
    };
  }, [isClient, sessionStarted]);

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
      setMessages(prev => [...prev, { role: 'assistant', content: DEFAULT_MESSAGE }]);
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
      setCurrentTtsText(lastMessage.content);
    }
  }, [messages, isClient]);

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
      console.log(`音声認識結果: "${text}"`);
      
      // 自動送信が有効な場合
      if (autoSubmit) {
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
      setMessages(prev => [...prev, { role: 'assistant', content: ERROR_MESSAGE }]);
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
      audio.play().catch(error => console.error('音声再生エラー:', error));
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
    <div className="flex flex-col h-[80vh] max-w-5xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl card-fancy">
      {/* TTSプレーヤー（非表示） */}
      <AudioPlayer text={currentTtsText} autoPlay={true} />

      {/* レッスンコンポーネントを表示 */}
        <EnglishLesson />
    </div>
  );
} 