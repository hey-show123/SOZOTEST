'use client';

import { useState, useRef } from 'react';
import AudioPlayer from '../AudioPlayer';
import AudioRecorder from '../AudioRecorder';

interface AllInOneDialoguePracticeProps {
  onComplete: () => void;
}

type DialogueScene = {
  id: number;
  title: string;
  description: string;
  conversation: DialogueLine[];
};

type DialogueLine = {
  role: 'staff' | 'customer';
  text: string;
  translation: string;
  isKeyPhrase?: boolean;
};

// 会話シナリオデータ
const dialogueScenes: DialogueScene[] = [
  {
    id: 1,
    title: "ヘアサロンでの会話",
    description: "美容師とお客様の会話です。追加サービスの提案を練習しましょう。",
    conversation: [
      {
        role: 'staff',
        text: "What would you like to do today?",
        translation: "今日はどうされますか？"
      },
      {
        role: 'customer',
        text: "A haircut please, my hair feels damaged.",
        translation: "カットでお願いします。髪がダメージしているように感じます。"
      },
      {
        role: 'staff',
        text: "OK, would you like to do a treatment as well?",
        translation: "わかりました。トリートメントもされますか？",
        isKeyPhrase: true
      },
      {
        role: 'customer',
        text: "Sure.",
        translation: "はい、お願いします。"
      }
    ]
  },
  {
    id: 2,
    title: "レストランでの会話",
    description: "ウェイターとお客様の会話です。追加注文の提案を練習しましょう。",
    conversation: [
      {
        role: 'staff',
        text: "Have you decided on your order?",
        translation: "ご注文はお決まりですか？"
      },
      {
        role: 'customer',
        text: "Yes, I'll have the pasta please.",
        translation: "はい、パスタをお願いします。"
      },
      {
        role: 'staff',
        text: "Would you like to order a drink as well?",
        translation: "お飲み物もご注文されますか？",
        isKeyPhrase: true
      },
      {
        role: 'customer',
        text: "Yes, a glass of water please.",
        translation: "はい、水をお願いします。"
      }
    ]
  }
];

export default function AllInOneDialoguePractice({ onComplete }: AllInOneDialoguePracticeProps) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [practicingLineIndex, setPracticingLineIndex] = useState<number | null>(null);
  const [isStaffRole, setIsStaffRole] = useState(true);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [completedScenes, setCompletedScenes] = useState<Set<number>>(new Set());
  const dialogueContainerRef = useRef<HTMLDivElement>(null);

  // 現在のシーン
  const currentScene = dialogueScenes[currentSceneIndex];

  // シーンを完了としてマーク
  const markSceneAsCompleted = (sceneId: number) => {
    setCompletedScenes(prev => new Set([...prev, sceneId]));
  };

  // シーンを切り替える
  const changeScene = (index: number) => {
    if (index >= 0 && index < dialogueScenes.length) {
      setCurrentSceneIndex(index);
      setPracticingLineIndex(null);
    }
  };

  // 特定の行を練習する
  const startPracticingLine = (lineIndex: number, asStaff: boolean) => {
    setPracticingLineIndex(lineIndex);
    setIsStaffRole(asStaff);
    setIsRecording(false);
  };

  // 音声の再生が終了したときのハンドラー
  const handleAudioFinished = () => {
    setIsAudioPlaying(false);
  };

  // 音声認識結果の処理
  const handleTranscription = (sceneId: number, lineIndex: number, role: 'staff' | 'customer', text: string) => {
    if (text && text.trim() !== '') {
      const key = `${sceneId}-${lineIndex}-${role}`;
      setUserAnswers(prev => ({ ...prev, [key]: text }));

      // 録音を停止
      setIsRecording(false);
      setPracticingLineIndex(null);

      // 全ての行を少なくとも1回練習したかチェック
      const allLinesAttempted = currentScene.conversation.every((line, idx) => {
        const staffKey = `${sceneId}-${idx}-staff`;
        const customerKey = `${sceneId}-${idx}-customer`;
        return userAnswers[staffKey] || userAnswers[customerKey];
      });

      if (allLinesAttempted) {
        markSceneAsCompleted(sceneId);
      }
    }
  };

  // すべてのシーンが完了したかチェック
  const allScenesCompleted = completedScenes.size === dialogueScenes.length;

  // ダイアログライン用のコンポーネント
  const DialogueLine = ({ line, index }: { line: DialogueLine; index: number }) => {
    const isStaff = line.role === 'staff';
    const key = `${currentScene.id}-${index}-${line.role}`;
    const userAttempt = userAnswers[key];
    const isPracticing = practicingLineIndex === index && isStaffRole === isStaff;

    return (
      <div 
        className={`mb-4 p-3 rounded-lg ${
          isPracticing 
            ? 'bg-yellow-50 border border-yellow-300' 
            : isStaff 
              ? 'bg-blue-50 border border-blue-200' 
              : 'bg-green-50 border border-green-200'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
              isStaff ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
            }`}>
              {isStaff ? 'S' : 'C'}
            </div>
            <span className="text-sm font-medium">
              {isStaff ? '店員' : 'お客様'} ({index + 1}/{currentScene.conversation.length})
            </span>
          </div>
          
          {line.isKeyPhrase && (
            <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">
              重要フレーズ
            </span>
          )}
        </div>
        
        <div className="ml-8">
          <p className={`text-lg ${line.isKeyPhrase ? 'font-bold text-purple-800' : 'font-medium'}`}>
            {line.text}
          </p>
          <p className="text-sm text-gray-600">{line.translation}</p>
          
          {userAttempt && (
            <div className="mt-2 p-2 bg-white rounded border border-gray-200">
              <p className="text-sm text-gray-800">
                <span className="font-medium">あなたの回答:</span> {userAttempt}
              </p>
            </div>
          )}
          
          {isPracticing && isRecording && (
            <div className="mt-2">
              <AudioRecorder 
                onTranscription={(text) => {
                  handleTranscription(currentScene.id, index, line.role, text);
                }}
                isRecording={isRecording}
                setIsRecording={setIsRecording}
              />
            </div>
          )}
          
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              onClick={() => {
                setIsAudioPlaying(true);
              }}
              className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" className="mr-1" viewBox="0 0 16 16">
                <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
              </svg>
              聞く
            </button>
            
            <button
              onClick={() => {
                startPracticingLine(index, isStaff);
              }}
              className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" className="mr-1" viewBox="0 0 16 16">
                <path d="M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0V3z"/>
                <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
              </svg>
              練習する
            </button>
            
            {isPracticing && !isRecording && (
              <button
                onClick={() => setIsRecording(true)}
                className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" className="mr-1" viewBox="0 0 16 16">
                  <path d="M12 13c0 1.105-1.12 2-2.5 2S7 14.105 7 13s1.12-2 2.5-2 2.5.895 2.5 2z"/>
                  <path fillRule="evenodd" d="M12 3v10h-1V3h1z"/>
                  <path d="M11 2.82a1 1 0 0 1 .804-.98l3-.6A1 1 0 0 1 16 2.22V4l-5 1V2.82z"/>
                  <path fillRule="evenodd" d="M0 11.5a.5.5 0 0 1 .5-.5H4a.5.5 0 0 1 0 1H.5a.5.5 0 0 1-.5-.5zm0-4A.5.5 0 0 1 .5 7H8a.5.5 0 0 1 0 1H.5a.5.5 0 0 1-.5-.5zm0-4A.5.5 0 0 1 .5 3H8a.5.5 0 0 1 0 1H.5a.5.5 0 0 1-.5-.5z"/>
                </svg>
                録音開始
              </button>
            )}
            
            <button
              onClick={() => {
                handleTranscription(currentScene.id, index, line.role, line.text);
              }}
              className="px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-xs"
            >
              スキップ
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full p-4">
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h2 className="text-xl font-bold text-center mb-4 text-green-700">会話練習</h2>

        {/* シーン選択タブ */}
        <div className="flex mb-4 border-b">
          {dialogueScenes.map((scene, index) => (
            <button
              key={scene.id}
              onClick={() => changeScene(index)}
              className={`px-4 py-2 text-sm font-medium ${
                currentSceneIndex === index 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              } ${
                completedScenes.has(scene.id) ? 'bg-green-50' : ''
              }`}
            >
              {scene.title}
              {completedScenes.has(scene.id) && (
                <span className="ml-1 text-xs bg-green-500 text-white px-1 py-0.5 rounded-full">✓</span>
              )}
            </button>
          ))}
        </div>

        {/* 現在の会話シーンの説明 */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-gray-700">{currentScene.description}</p>
        </div>

        {/* 会話ライン */}
        <div className="overflow-y-auto max-h-[50vh]" ref={dialogueContainerRef}>
          {currentScene.conversation.map((line, index) => (
            <DialogueLine key={`${currentScene.id}-${index}`} line={line} index={index} />
          ))}
        </div>

        {/* 再生中の音声用のAudioPlayer */}
        {isAudioPlaying && practicingLineIndex !== null && (
          <div className="mt-4">
            <AudioPlayer 
              text={currentScene.conversation[practicingLineIndex].text} 
              autoPlay={true} 
              onFinished={handleAudioFinished}
              isPlaying={isAudioPlaying}
              setIsPlaying={setIsAudioPlaying}
            />
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {completedScenes.size} / {dialogueScenes.length} シーン完了
        </div>
        <button
          onClick={onComplete}
          disabled={!allScenesCompleted}
          className={`px-6 py-2 rounded-lg transition-colors ${
            allScenesCompleted
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          次のセクションへ
        </button>
      </div>
    </div>
  );
} 