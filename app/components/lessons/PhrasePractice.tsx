'use client';

import { useState, useEffect } from 'react';
import AudioPlayer from '../AudioPlayer';
import AudioRecorder from '../AudioRecorder';

interface PhrasePracticeProps {
  onComplete: () => void;
}

export default function PhrasePractice({ onComplete }: PhrasePracticeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTtsText, setCurrentTtsText] = useState('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioFinished, setIsAudioFinished] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [autoAdvance, setAutoAdvance] = useState(false);

  // フレーズ練習のステップ
  const practiceSteps = [
    {
      instruction: "それでは、今日のフレーズを練習しましょう。私の後に続けて発音してください。",
      phrase: "",
      shouldPause: true
    },
    {
      instruction: "Would you like to do a treatment as well?",
      phrase: "Would you like to do a treatment as well?",
      translation: "トリートメントもされたいですか？",
      shouldPause: true
    },
    {
      instruction: "もう一度言ってみましょう。Would you like to do a treatment as well?",
      phrase: "Would you like to do a treatment as well?",
      translation: "トリートメントもされたいですか？",
      shouldPause: true
    },
    {
      instruction: "素晴らしいです！では、他のサービスでも練習してみましょう。",
      phrase: "",
      shouldPause: false
    },
    {
      instruction: "Would you like to do a shampoo as well?",
      phrase: "Would you like to do a shampoo as well?",
      translation: "シャンプーもされたいですか？",
      shouldPause: true
    },
    {
      instruction: "Would you like to do a head massage as well?",
      phrase: "Would you like to do a head massage as well?",
      translation: "ヘッドマッサージもされたいですか？",
      shouldPause: true
    },
    {
      instruction: "とても良いですね！このフレーズは「〜もされたいですか？」と追加のサービスを提案するときに使えます。次は会話の中でこのフレーズを使ってみましょう。",
      phrase: "",
      shouldPause: false
    }
  ];

  // 音声の再生が終了したときのハンドラー
  const handleAudioFinished = () => {
    setIsAudioPlaying(false);
    setIsAudioFinished(true);
    
    // 自動進行が有効で、ポーズが必要ないステップの場合は自動的に次へ
    if (autoAdvance && !practiceSteps[currentStep].shouldPause) {
      handleNext();
    }
  };

  // 次のステップに進む
  const handleNext = () => {
    if (currentStep < practiceSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setIsAudioFinished(false);
      setUserAnswer('');
    } else {
      // 全てのステップを完了したら次のセクションへ
      onComplete();
    }
  };

  // 音声認識結果の処理
  const handleTranscription = (text: string, autoSubmit = false) => {
    if (text && text.trim() !== '') {
      setUserAnswer(text);
      
      // 音声認識が完了し、自動進行が有効ならば次へ進む
      if (autoAdvance && isAudioFinished) {
        handleNext();
      }
    }
  };
  
  // 自動進行を切り替える
  const toggleAutoAdvance = () => {
    setAutoAdvance(!autoAdvance);
  };

  // 現在のテキストをTTSで読み上げる
  useEffect(() => {
    setCurrentTtsText(practiceSteps[currentStep].instruction);
    setIsAudioPlaying(true);
  }, [currentStep]);

  const currentStepData = practiceSteps[currentStep];

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-center mb-6 text-green-700">
          フレーズ練習
        </h2>
        
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-lg text-blue-800">{currentStepData.instruction}</p>
        </div>
        
        {currentStepData.phrase && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-xl font-semibold text-center text-yellow-800">
              {currentStepData.phrase}
            </p>
            {currentStepData.translation && (
              <p className="text-center text-yellow-600 mt-2">
                {currentStepData.translation}
              </p>
            )}
          </div>
        )}
        
        {currentStepData.shouldPause && (
          <div className="mb-6">
            <div className="p-3 bg-gray-100 rounded-lg mb-4">
              <p className="text-center text-gray-600">
                今日の一言: マイクに向かってお話ししましょう
              </p>
            </div>
            
            <div className="flex justify-center items-center gap-4 mb-4">
              <AudioRecorder 
                onTranscription={(text, autoSubmit) => {
                  handleTranscription(text, autoSubmit);
                  // 音声認識後に自動的にフォーカスを外して再録音の準備
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                }}
                isRecording={isRecording}
                setIsRecording={setIsRecording}
              />
              <button
                onClick={() => {
                  setIsAudioFinished(true);
                  if (autoAdvance) {
                    setTimeout(handleNext, 500);
                  }
                }}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
              >
                発音しました（マイクなし）
              </button>
            </div>
            
            {userAnswer && (
              <div className="p-3 bg-green-50 rounded-lg mb-4">
                <p className="text-center text-green-600">
                  あなたの回答: {userAnswer}
                </p>
              </div>
            )}
          </div>
        )}
        
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
          
          <div className="flex items-center gap-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={toggleAutoAdvance}
                className="form-checkbox h-5 w-5 text-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">自動進行</span>
            </label>
            
            <button
              onClick={handleNext}
              className="px-6 py-2 rounded-lg transition-colors bg-blue-500 hover:bg-blue-600 text-white"
            >
              {currentStep < practiceSteps.length - 1 ? '次へ' : '次のセクションへ'}
            </button>
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>{currentStep + 1} / {practiceSteps.length}</p>
        </div>
      </div>
    </div>
  );
} 