'use client';

import { useState, useEffect } from 'react';
import AudioPlayer from '../AudioPlayer';
import AudioRecorder from '../AudioRecorder';

interface QuestionTimeProps {
  onComplete: () => void;
}

type QuestionStep = {
  instruction: string;
  question?: string;
  questionJa?: string;
  suggestedPhrases?: string[];
  suggestedWords?: string[];
  shouldPause?: boolean;
  isEnding?: boolean;
};

export default function QuestionTime({ onComplete }: QuestionTimeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTtsText, setCurrentTtsText] = useState('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioFinished, setIsAudioFinished] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);

  // 質問タイムのステップ
  const questionSteps: QuestionStep[] = [
    {
      instruction: "最後に、簡単な質問に英語で答えてみましょう。今日学んだフレーズや単語を使って自由に答えてください。",
      suggestedPhrases: [
        "Would you like to do...?",
        "I'd like to...",
        "It feels..."
      ],
      suggestedWords: [
        "treatment", "haircut", "damage", "as well"
      ],
      shouldPause: false
    },
    {
      instruction: "Do you often get a haircut?",
      question: "Do you often get a haircut?",
      questionJa: "よくヘアカットに行きますか？",
      suggestedPhrases: [
        "Yes, I get a haircut every...",
        "No, I don't get haircuts often.",
        "I usually go to..."
      ],
      suggestedWords: [
        "monthly", "damage", "salon", "stylist"
      ],
      shouldPause: true
    },
    {
      instruction: "Great answer! Next question.",
      shouldPause: false
    },
    {
      instruction: "Have you ever had a hair treatment?",
      question: "Have you ever had a hair treatment?",
      questionJa: "これまでにヘアトリートメントを受けたことがありますか？",
      suggestedPhrases: [
        "Yes, I've had...",
        "I do treatments when my hair feels damaged.",
        "Would you recommend a treatment for...?"
      ],
      suggestedWords: [
        "treatment", "damage", "repair", "healthy"
      ],
      shouldPause: true
    },
    {
      instruction: "Nice! Last question.",
      shouldPause: false
    },
    {
      instruction: "What other salon services do you recommend to customers?",
      question: "What other salon services do you recommend to customers?",
      questionJa: "お客様に他にどんなサロンサービスをおすすめしますか？",
      suggestedPhrases: [
        "I often recommend...",
        "Would you like to try...?",
        "Many customers enjoy..."
      ],
      suggestedWords: [
        "head massage", "shampoo", "color", "as well"
      ],
      shouldPause: true
    },
    {
      instruction: "Excellent! You've completed today's English lesson. Let's review what we learned today. We practiced the phrase 'Would you like to do a treatment as well?' to offer additional services to customers. We also practiced a dialogue between a stylist and a customer, and learned vocabulary related to hair care. Keep practicing these phrases in your daily work. Great job!",
      isEnding: true,
      shouldPause: false
    }
  ];

  // 音声の再生が終了したときのハンドラー
  const handleAudioFinished = () => {
    setIsAudioPlaying(false);
    setIsAudioFinished(true);
    
    // 自動進行が有効で、ポーズが必要ないステップの場合は自動的に次へ
    if (autoAdvance && !questionSteps[currentStep].shouldPause) {
      handleNext();
    }
  };

  // 次のステップに進む
  const handleNext = () => {
    if (currentStep < questionSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setIsAudioFinished(false);
      setUserAnswer('');
    } else {
      // 全てのステップを完了したらレッスン終了
      onComplete();
    }
  };

  // 回答を送信
  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (userAnswer.trim() && isAudioFinished) {
      if (autoAdvance) {
        setTimeout(handleNext, 1000);
      }
    }
  };

  // 音声認識結果の処理
  const handleTranscription = (text: string, autoSubmit = false) => {
    if (text && text.trim() !== '') {
      setUserAnswer(text);
      
      // 音声認識が完了し、自動進行が有効ならば次へ進む
      if (autoAdvance && isAudioFinished) {
        setTimeout(handleNext, 1500);
      }
    }
  };

  // マイクなしで進む
  const handleSkipMic = () => {
    setIsAudioFinished(true);
    if (autoAdvance) {
      setTimeout(handleNext, 500);
    }
  };
  
  // 自動進行を切り替える
  const toggleAutoAdvance = () => {
    setAutoAdvance(!autoAdvance);
  };

  // フレーズをクリックして入力欄に追加
  const addPhraseToAnswer = (phrase: string) => {
    setUserAnswer(prev => prev ? `${prev} ${phrase}` : phrase);
  };

  // 現在のテキストをTTSで読み上げる
  useEffect(() => {
    setCurrentTtsText(questionSteps[currentStep].instruction);
    setIsAudioPlaying(true);
  }, [currentStep]);

  const currentStepData = questionSteps[currentStep];

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-center mb-6 text-green-700">
          質問タイム
        </h2>
        
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-lg text-blue-800">{currentStepData.instruction}</p>
        </div>
        
        {currentStepData.question && (
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-xl font-semibold text-center text-yellow-800">
              {currentStepData.question}
            </p>
            {currentStepData.questionJa && (
              <p className="text-center text-yellow-600 mt-2">
                {currentStepData.questionJa}
              </p>
            )}
          </div>
        )}
        
        {(currentStepData.suggestedPhrases || currentStepData.suggestedWords) && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-md font-semibold text-gray-700 mb-2">
              使ってみましょう:
            </h3>
            
            {currentStepData.suggestedPhrases && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-1">フレーズ:</p>
                <div className="flex flex-wrap gap-2">
                  {currentStepData.suggestedPhrases.map((phrase, index) => (
                    <button
                      key={index}
                      onClick={() => addPhraseToAnswer(phrase)}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {currentStepData.suggestedWords && (
              <div>
                <p className="text-sm text-gray-600 mb-1">単語:</p>
                <div className="flex flex-wrap gap-2">
                  {currentStepData.suggestedWords.map((word, index) => (
                    <button
                      key={index}
                      onClick={() => addPhraseToAnswer(word)}
                      className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {currentStepData.shouldPause && (
          <div className="mb-6">
            <form onSubmit={handleSubmitAnswer} className="flex flex-col">
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
                  type="button"
                  onClick={handleSkipMic}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                >
                  回答しました（マイクなし）
                </button>
              </div>
              
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="ここに英語で回答を入力（または声に出して答えるだけでもOK）"
                className="p-3 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="text-center text-sm text-gray-500 mb-4">
                英語で回答してください。フレーズや単語をクリックして使うこともできます。
              </div>
            </form>
            
            {userAnswer && (
              <div className="p-3 bg-green-50 rounded-lg mb-4">
                <p className="text-center text-green-600">
                  あなたの回答: {userAnswer}
                </p>
              </div>
            )}
          </div>
        )}
        
        {currentStepData.isEnding && (
          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-700 mb-2">
              今日のレッスンの復習
            </h3>
            <ul className="list-disc list-inside text-green-800 space-y-1">
              <li>「Would you like to do a treatment as well?」を使って追加サービスを提案</li>
              <li>美容師とお客様の会話練習</li>
              <li>ヘアケア関連の単語練習</li>
            </ul>
            <p className="mt-4 text-green-700">
              お疲れ様でした！これらのフレーズを実際の仕事で練習してみてください。
            </p>
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
              {currentStep < questionSteps.length - 1 ? '次へ' : 'レッスン終了'}
            </button>
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>{currentStep + 1} / {questionSteps.length}</p>
        </div>
      </div>
    </div>
  );
} 