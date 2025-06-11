'use client';

import { useState, useEffect, useRef } from 'react';
import AudioPlayer from '../AudioPlayer';
import AudioRecorder from '../AudioRecorder';
import Image from 'next/image';
import { DialogueTurn } from './LessonManager';

interface InteractiveDialoguePracticeProps {
  onComplete: () => void;
  dialogueTurns?: DialogueTurn[];
  lessonTitle?: string;
}

type DialogueLine = {
  role: 'staff' | 'customer';
  text: string;
  translation: string;
  isKeyPhrase?: boolean;
  turnNumber?: number;
};

// 会話履歴用の型定義
type ConversationItem = {
  role: 'staff' | 'customer';
  text: string;
  translation: string;
  isUser?: boolean;
};

// デフォルトの会話シナリオデータ
const DEFAULT_DIALOGUE: DialogueTurn[] = [
  {
    role: 'staff',
    text: "What would you like to do today?",
    translation: "今日はどうされますか？",
    turnNumber: 1
  },
  {
    role: 'customer',
    text: "A haircut please, my hair feels damaged.",
    translation: "カットをお願いします。髪が傷んでいるように感じます。",
    turnNumber: 2
  },
  {
    role: 'staff',
    text: "Would you like to do a treatment as well?",
    translation: "トリートメントもされたいですか？",
    turnNumber: 3
  },
  {
    role: 'customer',
    text: "Sure.",
    translation: "はい",
    turnNumber: 4
  }
];

export default function InteractiveDialoguePractice({ 
  onComplete, 
  dialogueTurns, 
  lessonTitle = 'レッスン: ヘアサロンでの会話' 
}: InteractiveDialoguePracticeProps) {
  // 使用するダイアログ（propsから受け取るか、デフォルト値を使用）
  const dialogue = dialogueTurns || DEFAULT_DIALOGUE;

  const [currentTurn, setCurrentTurn] = useState(1);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioText, setAudioText] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationItem[]>([]);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false); // アバターの話している状態
  const [currentAvatarIndex, setCurrentAvatarIndex] = useState(0); // 現在表示中のアバター画像インデックス
  const [currentTtsText, setCurrentTtsText] = useState('');
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isCustomerSpeaking, setIsCustomerSpeaking] = useState(false);
  const [isStaffSpeaking, setIsStaffSpeaking] = useState(false);
  const [currentLine, setCurrentLine] = useState<DialogueLine | null>(null);
  
  // アバター画像の配列
  const avatarImages = [
    '/images/avatar/Gemini_Generated_Image_no9r19no9r19no9r.png',
    '/images/avatar/Gemini_Generated_Image_wbi9nhwbi9nhwbi9.png'
  ];

  // アバター画像を切り替えるための効果
  useEffect(() => {
    if (isAvatarSpeaking) {
      const interval = setInterval(() => {
        setCurrentAvatarIndex(prev => (prev === 0 ? 1 : 0));
      }, 750); // 0.75秒ごとに切り替え
      
      return () => clearInterval(interval);
    }
  }, [isAvatarSpeaking]);
  
  // 会話履歴の自動スクロール用のref
  const conversationEndRef = useRef<HTMLDivElement>(null);

  // 会話履歴を自動スクロール
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationHistory]);
  
  // コンポーネントがマウントされたら初期設定
  useEffect(() => {
    // 最初の指示を表示するための遅延
    const timer = setTimeout(() => {
      if (currentLine && currentLine.role === 'staff') {
        // 最初はユーザーが話す番
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [currentLine]);

  // 現在のターンが変わった時、お客さんのセリフなら自動再生
  useEffect(() => {
    if (currentLine && currentLine.role === 'customer') {
      setTimeout(() => {
        // お客さんのセリフを自動再生
        setAudioText(currentLine.text);
        setIsAudioPlaying(true);
        setIsAvatarSpeaking(true); // 音声再生時にアバターの会話状態をON
        
        // 会話履歴に追加
        setConversationHistory(prev => [
          ...prev,
          {
            role: 'customer',
            text: currentLine.text,
            translation: currentLine.translation
          }
        ]);
      }, 500);
    }
  }, [currentTurn, currentLine]);

  // 音声の再生が終了したときのハンドラー
  const handleAudioFinished = () => {
    setIsAudioPlaying(false);
    
    // 現在のターンがお客さんの場合は自動で次へ進む
    if (currentLine && currentLine.role === 'customer') {
      setIsAvatarSpeaking(false);
      setTimeout(() => {
        const nextTurn = currentTurn + 1;
        setCurrentTurn(nextTurn);
        
        // 次の行がある場合は設定
        if (nextTurn <= dialogue.length) {
          setCurrentLine(dialogue[nextTurn - 1]);
        } else {
          setCurrentLine(null);
        }
        
        // スタッフのターンに入ったら自動再生する
        if (nextTurn <= dialogue.length && dialogue[nextTurn - 1].role === 'staff') {
          playDialogueAudio(dialogue[nextTurn - 1]);
        }
      }, 1000);
    } else {
      // スタッフのターンの場合は音声プレイヤーのみ止める
      setIsStaffSpeaking(false);
    }
  };

  // 音声認識結果の処理
  const handleTranscription = (text: string) => {
    if (!currentLine || !text || text.trim() === '') return;
    
    setIsRecording(false);
    
    // フィードバックを計算
    const normalizedUserAnswer = text.toLowerCase().replace(/[.,?!]/g, '').trim();
    const normalizedLineText = currentLine.text.toLowerCase().replace(/[.,?!]/g, '').trim();
    const similarity = calculateSimilarity(normalizedUserAnswer, normalizedLineText);
    
    setShowFeedback(true);
    
    // 発音の精度に基づいてフィードバックを表示し、次のアクションを決定
    if (similarity > 0.6) {  // 閾値を少し下げて許容度を高める
      setFeedbackMessage('素晴らしい発音です！');
      
      // 正しい発音の場合のみ会話履歴に追加
      setConversationHistory(prev => [
        ...prev,
        {
          role: 'staff',
          text: text,
          translation: currentLine.translation,
          isUser: true
        }
      ]);
      
      // フィードバック表示後、次の顧客のセリフへ
      setTimeout(() => {
        setShowFeedback(false);
        if (currentTurn < dialogue.length) {
          const nextTurn = currentTurn + 1;
          setCurrentTurn(nextTurn);
        } else {
          // 会話完了、次のセクションへ
          setTimeout(() => {
            onComplete();
          }, 1000);
        }
      }, 1500);
    } else {
      // 間違った発音の場合のフィードバック
      setFeedbackMessage('発音が正確ではありません。もう一度お試しください。');
      // フィードバックを表示するだけで会話は進めない
      setTimeout(() => {
        setShowFeedback(false);
      }, 3000);
    }
  };

  // 簡易的な文字列類似度計算（0～1の値を返す）
  const calculateSimilarity = (str1: string, str2: string): number => {
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    
    let matchCount = 0;
    for (const word1 of words1) {
      if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        matchCount++;
      }
    }
    
    return matchCount / Math.max(words1.length, words2.length);
  };

  // フレーズを再生
  const playPhrase = (text: string) => {
    setAudioText(text);
    setIsAudioPlaying(true);
    setIsAvatarSpeaking(true); // 音声再生開始時にアバターの会話状態をON
  };

  // スキップして次へ
  const skipToNext = () => {
    if (!currentLine) return;
    
    // スキップする場合も会話履歴に追加
    setConversationHistory(prev => [
      ...prev,
      {
        role: 'staff',
        text: currentLine.text,
        translation: currentLine.translation,
        isUser: true
      }
    ]);
    
    if (currentTurn < dialogue.length) {
      const nextTurn = currentTurn + 1;
      setCurrentTurn(nextTurn);
    } else {
      // 会話完了、次のセクションへ
      setTimeout(() => {
        onComplete();
      }, 1000);
    }
  };

  // 「もう一度」ボタンの処理 - 現在のセリフを再練習する
  const retryCurrentLine = () => {
    // 録音状態をリセット
    setIsRecording(false);
    // フィードバックを非表示
    setShowFeedback(false);
    // オーディオ再生をリセット
    setIsAudioPlaying(false);
    setIsAvatarSpeaking(false);
  };

  // 会話ターンの音声を再生
  const playDialogueAudio = (turn: DialogueTurn) => {
    // 事前生成された音声ファイルがある場合はそれを優先
    if (turn.audioUrl) {
      setCurrentAudioUrl(turn.audioUrl);
      setCurrentTtsText('');
    } else {
      setCurrentTtsText(turn.text);
      setCurrentAudioUrl(null);
    }
    
    setIsAudioPlaying(true);
    
    // 話者に応じてアバターの状態を設定
    if (turn.role === 'customer') {
      setIsCustomerSpeaking(true);
      setIsStaffSpeaking(false);
    } else {
      setIsCustomerSpeaking(false);
      setIsStaffSpeaking(true);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-3 sm:p-4 overflow-auto relative">
      {/* 背景画像 */}
      <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
        <Image
          src="/images/background/Gemini_Generated_Image_jp0msxjp0msxjp0m.png"
          alt="Salon Background"
          fill
          className="object-cover opacity-20"
        />
      </div>
      
      <div className="w-full max-w-xl bg-white/95 backdrop-blur-sm rounded-lg shadow-md p-4 sm:p-6 relative z-10">
        {/* レッスンタイトル */}
        <div className="text-center mb-3 sm:mb-4">
          <h1 className="text-xl sm:text-3xl font-bold mb-2 sm:mb-3 text-gray-800">{lessonTitle}</h1>
          <p className="text-base sm:text-lg text-gray-700 font-medium">
            あなたはスタッフ役です。お客さんとやりとりしてみよう！
          </p>
        </div>

        {/* アバター表示エリア */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="relative">
              <Image
                src={avatarImages[currentAvatarIndex]}
                alt="Customer Avatar"
                width={200}
                height={200}
                className={`${isAvatarSpeaking ? 'animate-pulse' : ''}`}
              />
            </div>
            
            {/* 音声再生中の表示 */}
            {isAvatarSpeaking && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-3 py-1 rounded-full">
                話し中...
              </div>
            )}
            
            {/* 会話吹き出し（最新の客のセリフ） */}
            {currentLine && currentLine.role === 'customer' && isAvatarSpeaking && (
              <div className="absolute -top-2 right-0 transform translate-x-full max-w-[200px] bg-blue-100 p-3 rounded-lg border border-blue-200 text-sm">
                <p className="font-medium">{currentLine.text}</p>
                <div className="absolute -left-2 top-4 w-0 h-0 border-t-[8px] border-t-transparent border-r-[12px] border-r-blue-100 border-b-[8px] border-b-transparent"></div>
              </div>
            )}
          </div>
        </div>

        {/* 会話履歴エリア */}
        <div className="mb-4 sm:mb-6 max-h-[30vh] overflow-y-auto pb-2">
          {conversationHistory.map((item, index) => (
            <div key={index} className="mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-bold mb-1 sm:mb-2 text-gray-800">
                {item.role === 'staff' ? 'あなたのセリフ:' : 'お客さんの返答:'}
              </h2>
              <div className={`p-3 sm:p-4 rounded-lg ${
                item.role === 'staff' 
                  ? 'bg-yellow-50 border border-yellow-100' 
                  : 'bg-blue-50 border border-blue-100'
              }`}>
                <p className="text-lg sm:text-xl font-medium mb-1 sm:mb-2 text-gray-800 break-words">{item.text}</p>
                <p className="text-sm sm:text-base text-gray-700">{item.translation}</p>
              </div>
            </div>
          ))}
          <div ref={conversationEndRef} />
        </div>

        {/* 現在のターン - スタッフ（ユーザー）の場合 */}
        {currentLine && currentLine.role === 'staff' && (
          <div className="mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-bold mb-1 sm:mb-2 text-gray-800">あなたのセリフ:</h2>
            <div className="bg-yellow-50 border border-yellow-100 p-3 sm:p-4 rounded-lg mb-3 sm:mb-4">
              <p className="text-lg sm:text-xl font-medium mb-1 sm:mb-2 text-gray-800 break-words">{currentLine.text}</p>
              <p className="text-sm sm:text-base text-gray-700">{currentLine.translation}</p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 sm:space-x-4">
              <button
                onClick={() => playDialogueAudio(currentLine)}
                className="flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm sm:text-base"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-1 sm:mr-2" viewBox="0 0 16 16">
                  <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/>
                  <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/>
                  <path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06z"/>
                </svg>
                聞く
              </button>
              
              <AudioRecorder 
                onTranscription={(text) => handleTranscription(text)}
                isRecording={isRecording}
                setIsRecording={setIsRecording}
              />
              
              <button
                onClick={retryCurrentLine}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm sm:text-base"
              >
                もう一度
              </button>

              <button
                onClick={skipToNext}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm sm:text-base"
              >
                スキップ
              </button>
            </div>
            
            {/* フィードバックメッセージ */}
            {showFeedback && (
              <div className={`mt-3 sm:mt-4 p-3 sm:p-4 rounded-lg text-center ${
                feedbackMessage.includes('素晴らしい') 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                <p className="font-medium text-sm sm:text-base">{feedbackMessage}</p>
                {!feedbackMessage.includes('素晴らしい') && (
                  <p className="text-xs sm:text-sm mt-1">「{currentLine.text}」と発音してください</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 現在のターン - お客さんの場合（自動再生） */}
        {currentLine && currentLine.role === 'customer' && (
          <div className="mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-bold mb-1 sm:mb-2 text-gray-800">お客さんの返答:</h2>
            <div className="bg-blue-50 border border-blue-100 p-3 sm:p-4 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="text-blue-600 font-medium text-sm sm:text-base">お客さんの返答を聞いています...</p>
                <div className="mt-2 flex justify-center">
                  <div className="animate-pulse flex space-x-1">
                    <div className="h-2 w-2 sm:h-3 sm:w-3 bg-blue-400 rounded-full"></div>
                    <div className="h-2 w-2 sm:h-3 sm:w-3 bg-blue-400 rounded-full animation-delay-200"></div>
                    <div className="h-2 w-2 sm:h-3 sm:w-3 bg-blue-400 rounded-full animation-delay-400"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 会話完了メッセージ */}
        {currentTurn > dialogue.length && (
          <div className="text-center">
            <p className="text-green-600 font-medium mb-3 sm:mb-4 text-sm sm:text-base">会話練習が完了しました！</p>
            <button
              onClick={onComplete}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm sm:text-base"
            >
              次へ
            </button>
          </div>
        )}

        {/* 音声プレーヤー（非表示） */}
        <AudioPlayer 
          text={currentTtsText}
          audioUrl={currentAudioUrl}
          autoPlay={isAudioPlaying}
          onFinished={handleAudioFinished}
          isPlaying={isAudioPlaying}
          setIsPlaying={setIsAudioPlaying}
        />
      </div>
      
      <div className="text-center mt-3 text-xs sm:text-sm text-gray-500">
        © 2025 SOZOの教室
      </div>
    </div>
  );
} 