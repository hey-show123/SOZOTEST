'use client';

import { useState, useEffect } from 'react';
import AudioPlayer from '../AudioPlayer';

interface PhraseIntroductionProps {
  onComplete: () => void;
}

export default function PhraseIntroduction({ onComplete }: PhraseIntroductionProps) {
  // キーフレーズの情報
  const keyPhrase = {
    text: "Would you like to do a treatment as well?",
    translation: "トリートメントもされたいですか？",
  };

  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [guidanceText, setGuidanceText] = useState('');

  // フィードバックメッセージの配列
  const feedbackMessages = [
    "これはトリートメントをおすすめするときのフレーズだよ。やってみよう！",
    "お客さんによく言うセリフだよ。まずは聞いてまねしてみて！",
    "英語はリズムが大事。一緒にやってみよう！",
    "今回はこのフレーズからスタート。声に出すのがコツだよ！",
    "この英語、すぐ使えるから覚えておいて損なし！やってみよう",
    "緊張しなくてOK！マネして言うだけでもすごく成長です！"
  ];

  // コンポーネントがマウントされたときに音声を設定
  useEffect(() => {
    // ランダムなメッセージを選択
    const randomIndex = Math.floor(Math.random() * feedbackMessages.length);
    const selectedMessage = feedbackMessages[randomIndex];
    setGuidanceText(selectedMessage);
    
    // コンポーネントがマウントされてから少し遅延させて再生
    const timer = setTimeout(() => {
      setIsAudioPlaying(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // 音声の再生が終了したときのハンドラー
  const handleAudioFinished = () => {
    setIsAudioPlaying(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 sm:p-6 overflow-auto">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-8 shadow-xl cursor-pointer transition-transform fade-in"
        onClick={onComplete}
      >
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4 text-gradient">まずは1フレーズ、声に出してみよう！</h1>
          <div className="h-1.5 w-32 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full mx-auto"></div>
        </div>

        {/* キーフレーズの表示 */}
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 sm:p-5 rounded-xl mb-6 sm:mb-8 text-center">
          <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300 mb-2 break-words">{keyPhrase.text}</p>
          <p className="text-base sm:text-lg text-blue-600 dark:text-blue-400">{keyPhrase.translation}</p>
        </div>

        <div className="mb-6 sm:mb-10 flex justify-center">
          <div className="w-48 h-48 sm:w-64 sm:h-64 relative">
            {/* マイクのイラスト */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" fill="currentColor" className="text-blue-500 dark:text-blue-400 sm:w-[160px] sm:h-[160px]" viewBox="0 0 16 16">
                <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
                <path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0v5zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3z"/>
              </svg>
            </div>
            {/* アニメーションリング */}
            <div className="absolute inset-0 rounded-full border-4 border-blue-300 dark:border-blue-700 opacity-75 animate-ping"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-200 dark:border-blue-800 opacity-50 animate-ping" style={{ animationDelay: '0.5s' }}></div>
          </div>
        </div>

        <div className="text-center p-4 sm:p-6 bg-blue-50 dark:bg-slate-700/50 rounded-2xl border border-blue-100 dark:border-slate-600">
          <p className="text-lg sm:text-xl font-medium text-gray-800 dark:text-gray-200 mb-3 sm:mb-4">
            会話の中でよく使う「トリートメントを提案する」フレーズを練習します。
          </p>
          <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300">
            音声を聞いたら、声に出してマネしてみましょう！
          </p>
        </div>
        
        <div className="mt-6 sm:mt-10 text-center">
          <p className="text-blue-600 dark:text-blue-400 font-medium animate-pulse">
            クリックして次へ進む
          </p>
        </div>
      </div>

      <div className="text-center mt-4 text-sm text-gray-500">
        © 2025 SOZOの教室
      </div>

      {/* 音声プレーヤー */}
      <AudioPlayer 
        text={guidanceText} 
        autoPlay={isAudioPlaying} 
        onFinished={handleAudioFinished}
        isPlaying={isAudioPlaying}
        setIsPlaying={setIsAudioPlaying}
      />
    </div>
  );
} 