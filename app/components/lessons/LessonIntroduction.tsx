'use client';

import { useState, useEffect, useRef } from 'react';
import AudioPlayer from '../AudioPlayer';

interface LessonIntroductionProps {
  onComplete: () => void;
}

export default function LessonIntroduction({ onComplete }: LessonIntroductionProps) {
  const [audioText, setAudioText] = useState<string>('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const audioInitializedRef = useRef(false);

  // 再生するメッセージの配列
  const introMessages = [
    "これはトリートメントをおすすめするときのフレーズだよ。やってみよう！",
    "お客さんによく言うセリフだよ。まずは聞いてまねしてみて！",
    "英語はリズムが大事。一緒にやってみよう！",
    "今回はこのフレーズからスタート。声に出すのがコツだよ！",
    "この英語、すぐ使えるから覚えておいて損なし！やってみよう",
    "緊張しなくてOK！マネして言うだけでもすごく成長です！"
  ];

  // コンポーネントがマウントされたらランダムなメッセージを選択して再生
  useEffect(() => {
    // すでに初期化済みの場合は実行しない
    if (audioInitializedRef.current || audioPlayed) return;
    
    audioInitializedRef.current = true;
    
    const randomIndex = Math.floor(Math.random() * introMessages.length);
    const selectedMessage = introMessages[randomIndex];
    
    // 少し遅延させて再生（画面表示後に再生するため）
    const timer = setTimeout(() => {
      setAudioText(selectedMessage);
      setIsAudioPlaying(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // 音声の再生が終了したときのハンドラー
  const handleAudioFinished = () => {
    setIsAudioPlaying(false);
    setAudioPlayed(true); // 音声が再生されたことをマーク
  };
  
  // レッスンの次のステップへ進む
  const handleNext = () => {
    onComplete();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 sm:p-6 overflow-auto">
      <div className="w-full max-w-xl card-fancy bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-8 slide-in-up overflow-hidden">
        {/* グラデーションのタイトル部分 - モバイル対応 */}
        <div className="gradient-flow text-white rounded-2xl p-4 sm:p-6 -mt-8 sm:-mt-16 mb-6 sm:mb-8 shadow-lg transform -rotate-1 relative">
          <div className="absolute inset-0 bg-black opacity-10 rounded-2xl"></div>
          <h1 className="text-2xl sm:text-3xl font-bold text-center relative z-10 break-words">
            レッスン29: <br className="sm:hidden" />
            <span className="leading-tight">Would you like to do a treatment as well?</span>
          </h1>
          <div className="absolute -bottom-3 -right-3 w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center transform rotate-12 shadow-md">
            <span className="text-slate-900 font-bold text-sm">New!</span>
          </div>
        </div>
        
        <div className="mb-6 sm:mb-10 p-4 sm:p-6 bg-blue-50 dark:bg-slate-700/50 rounded-2xl border border-blue-100 dark:border-slate-600 neumorph dark:neumorph-dark">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 mr-2 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-gradient">レッスンの目標</span>
          </h2>
          <ul className="space-y-4 sm:space-y-5 overflow-y-auto max-h-[40vh] sm:max-h-none">
            <li className="flex items-start transform transition-all duration-300 hover:translate-x-2">
              <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white mr-3 shadow-md">•</span>
              <span className="text-gray-800 dark:text-gray-200 text-sm sm:text-base">トリートメントなどの追加メニューを自然におすすめできるようになる</span>
            </li>
            <li className="flex items-start transform transition-all duration-300 hover:translate-x-2">
              <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white mr-3 shadow-md">•</span>
              <span className="text-gray-800 dark:text-gray-200 text-sm sm:text-base">「Would you like to〜?」の言い方に慣れる</span>
            </li>
            <li className="flex items-start transform transition-all duration-300 hover:translate-x-2">
              <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white mr-3 shadow-md">•</span>
              <span className="text-gray-800 dark:text-gray-200 text-sm sm:text-base">サロンでよく使う英語の言葉を覚える</span>
            </li>
          </ul>
        </div>
        
        <div className="flex justify-center mt-6 sm:mt-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-violet-500/20 filter blur-xl rounded-xl"></div>
          <button
            onClick={handleNext}
            className="w-full relative py-3 sm:py-4 rounded-xl transition-all bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white text-lg sm:text-xl font-semibold shadow-md hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0 overflow-hidden group"
          >
            <span className="relative z-10">レッスン開始</span>
            <span className="absolute inset-0 w-full h-full shimmer"></span>
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
          </button>
        </div>
      </div>

      <div className="text-center mt-4 text-sm text-gray-500">
        © 2025 SOZOの教室
      </div>

      {/* 音声プレーヤー（非表示） */}
      {!audioPlayed && (
        <div className="hidden">
          <AudioPlayer 
            text={audioText} 
            autoPlay={isAudioPlaying} 
            onFinished={handleAudioFinished}
            isPlaying={isAudioPlaying}
            setIsPlaying={setIsAudioPlaying}
          />
        </div>
      )}
    </div>
  );
} 