'use client';

import { useState, useEffect } from 'react';
import AudioPlayer from '../AudioPlayer';

interface VocabularyPracticeProps {
  onComplete: () => void;
}

type VocabularyItem = {
  word: string;
  translation: string;
  example?: string;
  exampleJa?: string;
  options?: string[]; // 選択肢を追加
};

type VocabularyStep = {
  instruction: string;
  vocabulary?: VocabularyItem;
  shouldPause?: boolean;
};

export default function VocabularyPractice({ onComplete }: VocabularyPracticeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTtsText, setCurrentTtsText] = useState('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioFinished, setIsAudioFinished] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(false);

  // 単語練習のステップ
  const vocabularySteps: VocabularyStep[] = [
    {
      instruction: "次は、今日のレッスンで使う単語を練習しましょう。正しい意味の選択肢をクリックしてください。",
      shouldPause: false
    },
    {
      instruction: "最初の単語は「haircut」です。",
      vocabulary: {
        word: "haircut",
        translation: "カット",
        example: "I need a haircut today.",
        exampleJa: "今日はカットが必要です。",
        options: ["カラーリング", "カット", "トリートメント", "シャンプー"]
      },
      shouldPause: true
    },
    {
      instruction: "次の単語は「damage」です。",
      vocabulary: {
        word: "damage",
        translation: "ダメージ",
        example: "My hair has a lot of damage from the sun.",
        exampleJa: "私の髪は日焼けでたくさんダメージを受けています。",
        options: ["ダメージ", "色落ち", "伸び", "艶"]
      },
      shouldPause: true
    },
    {
      instruction: "次の単語は「treatment」です。",
      vocabulary: {
        word: "treatment",
        translation: "トリートメント",
        example: "This treatment will help repair your damaged hair.",
        exampleJa: "このトリートメントはあなたのダメージヘアを修復するのに役立ちます。",
        options: ["シャンプー", "スタイリング", "トリートメント", "カット"]
      },
      shouldPause: true
    },
    {
      instruction: "次の単語は「feels」です。",
      vocabulary: {
        word: "feels",
        translation: "〜と感じる",
        example: "My hair feels dry after swimming.",
        exampleJa: "水泳の後、髪が乾燥していると感じます。",
        options: ["〜になる", "〜と感じる", "〜を見る", "〜を洗う"]
      },
      shouldPause: true
    },
    {
      instruction: "最後の単語は「as well」です。",
      vocabulary: {
        word: "as well",
        translation: "〜も、同様に",
        example: "Would you like a shampoo as well?",
        exampleJa: "シャンプーもされますか？",
        options: ["いつも", "たくさん", "〜も、同様に", "とても"]
      },
      shouldPause: true
    },
    {
      instruction: "素晴らしいです！これらの単語を使うと、お客様のヘアケアについての会話がスムーズになります。次の質問タイムに進みましょう。",
      shouldPause: false
    }
  ];

  // 音声の再生が終了したときのハンドラー
  const handleAudioFinished = () => {
    setIsAudioPlaying(false);
    setIsAudioFinished(true);
    
    // 自動進行が有効で、ポーズが必要ないステップの場合は自動的に次へ
    if (autoAdvance && !vocabularySteps[currentStep].shouldPause) {
      handleNext();
    }
  };

  // 次のステップに進む
  const handleNext = () => {
    if (currentStep < vocabularySteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setIsAudioFinished(false);
      setSelectedOption(null);
    } else {
      // 全てのステップを完了したら次のセクションへ
      onComplete();
    }
  };

  // 選択肢を選んだときの処理
  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
    
    // 正解かどうかをチェック
    const currentVocab = vocabularySteps[currentStep].vocabulary;
    if (currentVocab && option === currentVocab.translation) {
      setUserAnswer("正解です！");
    } else if (currentVocab) {
      setUserAnswer(`不正解です。正解は「${currentVocab.translation}」です。`);
    }
    
    // 自動進行が有効なら少し待ってから次へ
    if (autoAdvance) {
      setTimeout(handleNext, 1500);
    }
  };
  
  // 自動進行を切り替える
  const toggleAutoAdvance = () => {
    setAutoAdvance(!autoAdvance);
  };

  // 現在のテキストをTTSで読み上げる
  useEffect(() => {
    setCurrentTtsText(vocabularySteps[currentStep].instruction);
    setIsAudioPlaying(true);
  }, [currentStep]);

  const currentStepData = vocabularySteps[currentStep];

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-center mb-6 text-green-700">
          単語練習
        </h2>
        
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-lg text-blue-800">{currentStepData.instruction}</p>
        </div>
        
        {currentStepData.vocabulary && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex justify-between items-center mb-2">
              <p className="text-xl font-semibold text-yellow-800">
                {currentStepData.vocabulary.word}
              </p>
            </div>
            
            {currentStepData.vocabulary.example && (
              <div className="mt-4 p-2 bg-white rounded">
                <p className="text-gray-800">{currentStepData.vocabulary.example}</p>
                {currentStepData.vocabulary.exampleJa && (
                  <p className="text-sm text-gray-600 mt-1">{currentStepData.vocabulary.exampleJa}</p>
                )}
              </div>
            )}
          </div>
        )}
        
        {currentStepData.shouldPause && currentStepData.vocabulary && currentStepData.vocabulary.options && (
          <div className="mb-6">
            <div className="p-3 bg-gray-100 rounded-lg mb-4">
              <p className="text-center text-gray-600">
                ↓ 正しい意味を選んでください ↓
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              {currentStepData.vocabulary.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectOption(option)}
                  className={`p-3 rounded-lg transition-colors ${
                    selectedOption === option
                      ? option === currentStepData.vocabulary?.translation
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                  disabled={selectedOption !== null}
                >
                  {option}
                </button>
              ))}
            </div>
            
            {userAnswer && (
              <div className={`p-3 rounded-lg mb-4 ${
                userAnswer.startsWith("正解") ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
              }`}>
                <p className="text-center">{userAnswer}</p>
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
              {currentStep < vocabularySteps.length - 1 ? '次へ' : '次のセクションへ'}
            </button>
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>{currentStep + 1} / {vocabularySteps.length}</p>
        </div>
      </div>
    </div>
  );
} 