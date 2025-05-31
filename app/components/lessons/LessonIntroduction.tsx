'use client';

import { useState, useEffect } from 'react';
import AudioPlayer from '../AudioPlayer';

interface LessonIntroductionProps {
  onComplete: () => void;
}

export default function LessonIntroduction({ onComplete }: LessonIntroductionProps) {
  const [currentTtsText, setCurrentTtsText] = useState('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioFinished, setIsAudioFinished] = useState(false);

  // レッスンの説明テキスト（一息で読み上げる）
  const introductionText = "このレッスンでは「Would you like to do a treatment as well?」を練習します。このフレーズは、お客様にトリートメントなどの追加サービスを提案するときに使えます。それではレッスンを始めましょう。";

  // 音声の再生が終了したときのハンドラー
  const handleAudioFinished = () => {
    setIsAudioPlaying(false);
    setIsAudioFinished(true);
  };

  // レッスンの次のステップへ進む
  const handleNext = () => {
    onComplete();
  };

  // 現在のテキストをTTSで読み上げる
  useEffect(() => {
    setCurrentTtsText(introductionText);
    setIsAudioPlaying(true);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="w-full max-w-5xl bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">
          レッスン29: Would you like to do a treatment as well?
        </h1>
        
        <div className="flex flex-col lg:flex-row lg:space-x-6">
          <div className="lg:w-1/2 mb-6 lg:mb-0">
            <div className="mb-8 p-4 bg-green-50 rounded-lg border border-green-200 h-full">
              <h2 className="text-xl font-semibold text-green-700 mb-4">レッスンの目標</h2>
              <ul className="list-disc list-inside text-green-800 space-y-2">
                <li>お客様に追加サービスを提案する表現を学ぶ</li>
                <li>「Would you like to」構文を正しく使えるようになる</li>
                <li>美容関連の英単語を身につける</li>
              </ul>
            </div>
          </div>
          
          <div className="lg:w-1/2">
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-lg text-blue-800">{introductionText}</p>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <AudioPlayer 
                  text={currentTtsText} 
                  autoPlay={true} 
                  onFinished={handleAudioFinished} 
                  isPlaying={isAudioPlaying}
                  setIsPlaying={setIsAudioPlaying}
                />
              </div>
              
              <button
                onClick={handleNext}
                className="px-6 py-2 rounded-lg transition-colors bg-blue-500 hover:bg-blue-600 text-white"
              >
                レッスン開始
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 