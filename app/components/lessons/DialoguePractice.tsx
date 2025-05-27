'use client';

import { useState, useEffect } from 'react';
import AudioPlayer from '../AudioPlayer';
import AudioRecorder from '../AudioRecorder';

interface DialoguePracticeProps {
  onComplete: () => void;
}

type DialogueStep = {
  instruction: string;
  rolePlay?: {
    staff?: string;
    customer?: string;
    staffJa?: string;
    customerJa?: string;
    highlighted?: boolean;
  };
  userRole?: 'staff' | 'customer';
  shouldPause?: boolean;
};

// 会話履歴の型定義
type DialogueHistory = {
  role: 'staff' | 'customer';
  text: string;
  translation?: string;
};

export default function DialoguePractice({ onComplete }: DialoguePracticeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTtsText, setCurrentTtsText] = useState('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioFinished, setIsAudioFinished] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [dialogueHistory, setDialogueHistory] = useState<DialogueHistory[]>([]);

  // ダイアログ練習のステップ
  const dialogueSteps: DialogueStep[] = [
    {
      instruction: "では次に、実際の会話の中でこのフレーズを使ってみましょう。まずは会話の例を聞いてください。",
      shouldPause: false
    },
    {
      instruction: "これから美容師とお客様の会話を紹介します。",
      rolePlay: {},
      shouldPause: false
    },
    {
      instruction: "Staff: What would you like to do today?",
      rolePlay: {
        staff: "What would you like to do today?",
        staffJa: "今日はどうされますか？"
      },
      shouldPause: false
    },
    {
      instruction: "Customer: A haircut please, my hair feels damaged.",
      rolePlay: {
        customer: "A haircut please, my hair feels damaged.",
        customerJa: "カットでお願いします。髪がダメージしているように感じます。"
      },
      shouldPause: false
    },
    {
      instruction: "Staff: OK, would you like to do a treatment as well?",
      rolePlay: {
        staff: "OK, would you like to do a treatment as well?",
        staffJa: "わかりました。トリートメントもされますか？",
        highlighted: true
      },
      shouldPause: false
    },
    {
      instruction: "Customer: Sure.",
      rolePlay: {
        customer: "Sure.",
        customerJa: "はい、お願いします。"
      },
      shouldPause: false
    },
    {
      instruction: "では、この会話を一緒に練習してみましょう。私がお客様役、あなたが美容師役です。",
      shouldPause: false
    },
    {
      instruction: "あなたは美容師です。「今日はどうされますか？」と英語で聞いてください。",
      userRole: 'staff',
      rolePlay: {
        staff: "What would you like to do today?",
        staffJa: "今日はどうされますか？"
      },
      shouldPause: true
    },
    {
      instruction: "A haircut please, my hair feels damaged.",
      rolePlay: {
        customer: "A haircut please, my hair feels damaged.",
        customerJa: "カットでお願いします。髪がダメージしているように感じます。"
      },
      shouldPause: false
    },
    {
      instruction: "お客様がカットを希望し、髪のダメージについて言及しました。トリートメントを提案してみてください。",
      userRole: 'staff',
      rolePlay: {
        staff: "OK, would you like to do a treatment as well?",
        staffJa: "わかりました。トリートメントもされますか？",
        highlighted: true
      },
      shouldPause: true
    },
    {
      instruction: "Sure.",
      rolePlay: {
        customer: "Sure.",
        customerJa: "はい、お願いします。"
      },
      shouldPause: false
    },
    {
      instruction: "素晴らしいです！次に役割を交代して、今度はあなたがお客様役になります。",
      shouldPause: false
    },
    {
      instruction: "What would you like to do today?",
      rolePlay: {
        staff: "What would you like to do today?",
        staffJa: "今日はどうされますか？"
      },
      shouldPause: false
    },
    {
      instruction: "あなたはお客様です。カットを希望して、髪のダメージについて英語で伝えてください。",
      userRole: 'customer',
      rolePlay: {
        customer: "A haircut please, my hair feels damaged.",
        customerJa: "カットでお願いします。髪がダメージしているように感じます。"
      },
      shouldPause: true
    },
    {
      instruction: "OK, would you like to do a treatment as well?",
      rolePlay: {
        staff: "OK, would you like to do a treatment as well?",
        staffJa: "わかりました。トリートメントもされますか？",
        highlighted: true
      },
      shouldPause: false
    },
    {
      instruction: "トリートメントを勧められました。「はい、お願いします」と英語で答えてください。",
      userRole: 'customer',
      rolePlay: {
        customer: "Sure.",
        customerJa: "はい、お願いします。"
      },
      shouldPause: true
    },
    {
      instruction: "とても良い会話ができました！このように、お客様の髪の状態に合わせて追加のサービスを提案することができます。次のセクションでは、関連する単語を練習しましょう。",
      shouldPause: false
    }
  ];

  // 音声の再生が終了したときのハンドラー
  const handleAudioFinished = () => {
    setIsAudioPlaying(false);
    setIsAudioFinished(true);
    
    // 自動進行が有効で、ポーズが必要ないステップの場合は自動的に次へ
    if (autoAdvance && !dialogueSteps[currentStep].shouldPause) {
      handleNext();
    }
  };

  // 会話履歴に追加する
  const addToDialogueHistory = (step: DialogueStep) => {
    if (!step.rolePlay) return;

    if (step.rolePlay.staff) {
      setDialogueHistory(prev => [...prev, {
        role: 'staff', 
        text: step.rolePlay!.staff!, 
        translation: step.rolePlay!.staffJa
      }]);
    }
    
    if (step.rolePlay.customer) {
      setDialogueHistory(prev => [...prev, {
        role: 'customer', 
        text: step.rolePlay!.customer!, 
        translation: step.rolePlay!.customerJa
      }]);
    }
  };

  // ユーザーの発言を会話履歴に追加
  const addUserAnswerToHistory = () => {
    if (!userAnswer || !dialogueSteps[currentStep].userRole) return;
    
    setDialogueHistory(prev => [...prev, {
      role: dialogueSteps[currentStep].userRole!,
      text: userAnswer
    }]);
  };

  // 次のステップに進む
  const handleNext = () => {
    // ユーザーの発言を履歴に追加
    if (dialogueSteps[currentStep].userRole && userAnswer) {
      addUserAnswerToHistory();
    }
    // システムの発言（AIの応答）を履歴に追加
    else if (dialogueSteps[currentStep].rolePlay) {
      addToDialogueHistory(dialogueSteps[currentStep]);
    }

    if (currentStep < dialogueSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setIsAudioFinished(false);
      setUserAnswer(''); // 回答をリセット
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
        setTimeout(handleNext, 1000);
      }
    }
  };
  
  // 自動進行を切り替える
  const toggleAutoAdvance = () => {
    setAutoAdvance(!autoAdvance);
  };

  // 現在のテキストをTTSで読み上げる
  useEffect(() => {
    setCurrentTtsText(dialogueSteps[currentStep].instruction);
    setIsAudioPlaying(true);
  }, [currentStep]);

  const currentStepData = dialogueSteps[currentStep];

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="w-full max-w-5xl bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-center mb-6 text-green-700">
          ダイアログ練習
        </h2>
        
        {/* PC用の横長レイアウト */}
        <div className="flex flex-col lg:flex-row lg:space-x-6">
          {/* 左側：会話履歴（PCでは常に表示） */}
          <div className="lg:w-1/2 lg:order-1 order-2 mb-6 lg:mb-0">
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 h-full max-h-[60vh] overflow-y-auto">
              <h3 className="font-medium text-gray-700 mb-4 sticky top-0 bg-gray-50 py-2">会話履歴:</h3>
              {dialogueHistory.length > 0 ? (
                dialogueHistory.map((item, index) => (
                  <div key={index} className="mb-4 pb-4 border-b border-gray-100 last:border-b-0">
                    <p className="font-semibold text-black">
                      {item.role === 'staff' ? 'Staff' : 'Customer'}:
                    </p>
                    <p className="text-lg text-black">{item.text}</p>
                    {item.translation && (
                      <p className="text-sm text-gray-800">{item.translation}</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">会話がここに表示されます</p>
              )}
            </div>
          </div>
          
          {/* 右側：現在のステップと操作 */}
          <div className="lg:w-1/2 lg:order-2 order-1">
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-lg text-blue-800">{currentStepData.instruction}</p>
            </div>
            
            {currentStepData.rolePlay && (currentStepData.rolePlay.staff || currentStepData.rolePlay.customer) && (
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                {currentStepData.rolePlay.staff && (
                  <div className={`mb-3 ${currentStepData.rolePlay.highlighted ? 'bg-green-100 p-2 rounded' : ''}`}>
                    <p className="font-semibold text-black">Staff:</p>
                    <p className="text-lg text-black">{currentStepData.rolePlay.staff}</p>
                    {currentStepData.rolePlay.staffJa && (
                      <p className="text-sm text-gray-800">{currentStepData.rolePlay.staffJa}</p>
                    )}
                  </div>
                )}
                
                {currentStepData.rolePlay.customer && (
                  <div>
                    <p className="font-semibold text-black">Customer:</p>
                    <p className="text-lg text-black">{currentStepData.rolePlay.customer}</p>
                    {currentStepData.rolePlay.customerJa && (
                      <p className="text-sm text-gray-800">{currentStepData.rolePlay.customerJa}</p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {currentStepData.userRole && (
              <div className="mb-6">
                <div className="p-3 bg-gray-100 rounded-lg mb-4">
                  <p className="text-center text-gray-600">
                    ↓ {currentStepData.userRole === 'staff' ? '美容師' : 'お客様'}として英語で話してみてください ↓
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-4">
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
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg w-full sm:w-auto"
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
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
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
                  {currentStep < dialogueSteps.length - 1 ? '次へ' : '次のセクションへ'}
                </button>
              </div>
            </div>
            
            <div className="mt-6 text-center text-sm text-gray-500">
              <p>{currentStep + 1} / {dialogueSteps.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 