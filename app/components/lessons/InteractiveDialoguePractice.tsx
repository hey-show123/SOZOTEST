'use client';

import { useState, useEffect, useRef } from 'react';
import AudioPlayer from '../AudioPlayer';
import AudioRecorder from '../AudioRecorder';

interface InteractiveDialoguePracticeProps {
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
  }
];

export default function InteractiveDialoguePractice({ onComplete }: InteractiveDialoguePracticeProps) {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [userTranscription, setUserTranscription] = useState('');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [completedScenes, setCompletedScenes] = useState<Set<number>>(new Set());
  const [completedLines, setCompletedLines] = useState<Set<string>>(new Set());
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string; text: string; isUser?: boolean}>>([]);
  const [waitingForCustomerResponse, setWaitingForCustomerResponse] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [audioText, setAudioText] = useState('');
  const [customerAudioPlayed, setCustomerAudioPlayed] = useState(false);
  const [isExamplePlaying, setIsExamplePlaying] = useState(false);

  const conversationEndRef = useRef<HTMLDivElement>(null);

  // 現在のシーン
  const currentScene = dialogueScenes[currentSceneIndex];
  // 現在の会話ライン
  const currentLine = currentLineIndex < currentScene.conversation.length 
    ? currentScene.conversation[currentLineIndex] 
    : null;

  // 会話履歴を自動スクロール
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationHistory]);

  // コンポーネントがマウントされたら最初のセリフを表示
  useEffect(() => {
    // すでに会話履歴がある場合は何もしない
    if (conversationHistory.length > 0) return;
    
    // 最初のラインがスタッフのものであることを確認
    if (currentLine && currentLine.role === 'staff') {
      setCurrentLineIndex(0);
    }
  }, []);

  // シーンを完了としてマーク
  const markSceneAsCompleted = (sceneId: number) => {
    setCompletedScenes(prev => new Set([...prev, sceneId]));
  };

  // シーンを切り替える
  const changeScene = (index: number) => {
    if (index >= 0 && index < dialogueScenes.length) {
      setCurrentSceneIndex(index);
      setCurrentLineIndex(0);
      setConversationHistory([]);
      setCompletedLines(new Set());
      setWaitingForCustomerResponse(false);
      setCustomerAudioPlayed(false);
    }
  };

  // 音声の再生が終了したときのハンドラー
  const handleAudioFinished = () => {
    setIsAudioPlaying(false);
    setIsExamplePlaying(false);
    console.log("音声再生完了：", audioText);
    
    // もし顧客のセリフを再生した後なら、次のスタッフのセリフに進む
    if (waitingForCustomerResponse) {
      setCustomerAudioPlayed(true);
      setWaitingForCustomerResponse(false);
      
      // 次のラインが存在し、それがスタッフのものなら表示
      if (currentLineIndex + 1 < currentScene.conversation.length) {
        if (currentScene.conversation[currentLineIndex + 1].role === 'staff') {
          setTimeout(() => {
            setCurrentLineIndex(currentLineIndex + 1);
          }, 1000); // 1秒後に次のスタッフセリフに進む
        }
      } else {
        // 会話が終了した場合
        markSceneAsCompleted(currentScene.id);
      }
    }
  };

  // 会話を進める
  const advanceConversation = () => {
    if (!currentLine) return;
    
    // 現在のラインが完了したとマーク
    const lineKey = `${currentScene.id}-${currentLineIndex}`;
    setCompletedLines(prev => new Set([...prev, lineKey]));
    
    if (currentLine.role === 'staff') {
      // スタッフのセリフを発話した後、お客さんのセリフをAIが読む
      if (currentLineIndex + 1 < currentScene.conversation.length) {
        const nextLine = currentScene.conversation[currentLineIndex + 1];
        if (nextLine.role === 'customer') {
          // 会話履歴にお客さんのセリフを追加
          setConversationHistory(prev => [
            ...prev, 
            { role: 'customer', text: nextLine.text }
          ]);
          
          // お客さんのセリフを再生する準備
          setCurrentLineIndex(currentLineIndex + 1);
          setAudioText(nextLine.text); // 読み上げるテキストを設定
          setCustomerAudioPlayed(false);
          
          // 少し遅延させてから音声再生を開始（UIの更新が完了するのを待つ）
          setTimeout(() => {
            setIsAudioPlaying(true);
            setWaitingForCustomerResponse(true);
          }, 500);
        }
      } else {
        // 最後のスタッフセリフの場合は会話完了としてマーク
        markSceneAsCompleted(currentScene.id);
      }
    } else if (currentLine.role === 'customer') {
      // お客さんのセリフの後、次のスタッフのセリフへ
      if (currentLineIndex + 1 < currentScene.conversation.length) {
        setCurrentLineIndex(currentLineIndex + 1);
      } else {
        // 会話が終了した場合
        markSceneAsCompleted(currentScene.id);
      }
    }
  };

  // 音声認識結果の処理
  const handleTranscription = (text: string) => {
    if (!currentLine || !text || text.trim() === '') return;
    
    setUserTranscription(text);
    setIsRecording(false);
    
    // フィードバックを計算
    const normalizedUserAnswer = text.toLowerCase().replace(/[.,?!]/g, '').trim();
    const normalizedLineText = currentLine.text.toLowerCase().replace(/[.,?!]/g, '').trim();
    const similarity = calculateSimilarity(normalizedUserAnswer, normalizedLineText);
    
    setShowFeedback(true);
    
    // 発音の精度に基づいてフィードバックを表示し、次のアクションを決定
    if (similarity > 0.7) {
      setFeedbackMessage('素晴らしい発音です！');
      
      // 会話履歴に追加して会話を進める
      setConversationHistory(prev => [
        ...prev, 
        { role: 'staff', text, isUser: true }
      ]);
      
      // フィードバック表示後、少し時間を置いて会話を進める
      setTimeout(() => {
        setShowFeedback(false);
        advanceConversation();
      }, 2000);
    } else if (similarity > 0.4) {
      setFeedbackMessage('良い発音です。もう少し練習が必要です。もう一度お試しください。');
      // フィードバックを表示するだけで会話は進めない
      setTimeout(() => {
        setShowFeedback(false);
      }, 3000);
    } else {
      setFeedbackMessage('もう一度挑戦してください。発音が正確ではありません。');
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

  // すべてのシーンが完了したかチェック
  const allScenesCompleted = completedScenes.size === dialogueScenes.length;

  // フレーズを再生
  const playPhrase = (text: string) => {
    console.log("フレーズ再生:", text);
    setAudioText(text);
    setIsExamplePlaying(true);
    setIsAudioPlaying(true);
  };

  return (
    <div className="w-full h-full p-4">
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h2 className="text-xl font-bold text-center mb-4 text-green-700">インタラクティブ会話練習</h2>

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

        {/* 会話履歴 */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4 h-64 overflow-y-auto">
          {conversationHistory.length === 0 ? (
            <p className="text-center text-gray-500">会話を始めましょう</p>
          ) : (
            conversationHistory.map((item, index) => (
              <div 
                key={index} 
                className={`mb-3 p-2 rounded-lg ${
                  item.role === 'staff' 
                    ? 'bg-blue-50 border border-blue-200 ml-auto mr-2' 
                    : 'bg-green-50 border border-green-200 mr-auto ml-2'
                } ${
                  item.isUser ? 'border-blue-400' : ''
                } max-w-[80%] inline-block`}
              >
                <div className="flex items-center mb-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 ${
                    item.role === 'staff' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                  }`}>
                    {item.role === 'staff' ? 'S' : 'C'}
                  </div>
                  <span className="text-xs font-medium">
                    {item.role === 'staff' ? '店員' : 'お客様'}
                    {item.isUser && ' (あなた)'}
                  </span>
                </div>
                <p className="text-sm ml-7 text-gray-800">{item.text}</p>
              </div>
            ))
          )}
          <div ref={conversationEndRef} />
        </div>

        {/* 現在のライン（スタッフの場合のみ表示） */}
        {currentLine && currentLine.role === 'staff' && !waitingForCustomerResponse && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center mr-2">
                S
              </div>
              <span className="font-medium">あなたのセリフ:</span>
              {currentLine.isKeyPhrase && (
                <span className="ml-2 text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">
                  重要フレーズ
                </span>
              )}
            </div>
            <p className={`text-lg mb-1 text-gray-800 ${currentLine.isKeyPhrase ? 'font-bold text-purple-800' : ''}`}>
              {currentLine.text}
            </p>
            <p className="text-sm text-gray-600 mb-3">{currentLine.translation}</p>
            
            <div className="flex gap-2">
              <button
                onClick={() => playPhrase(currentLine.text)}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm flex items-center"
                disabled={isExamplePlaying}
              >
                {isExamplePlaying ? (
                  <svg className="animate-spin mr-1" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-1" viewBox="0 0 16 16">
                    <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                  </svg>
                )}
                {isExamplePlaying ? '再生中...' : '聞く'}
              </button>
              
              <AudioRecorder 
                onTranscription={(text) => handleTranscription(text)}
                isRecording={isRecording}
                setIsRecording={setIsRecording}
              />
              
              <button
                onClick={() => {
                  setConversationHistory(prev => [
                    ...prev, 
                    { role: 'staff', text: currentLine.text, isUser: true }
                  ]);
                  advanceConversation();
                }}
                className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
              >
                スキップ
              </button>
            </div>
          </div>
        )}
        
        {/* お客様の返答待ち表示 */}
        {waitingForCustomerResponse && !customerAudioPlayed && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center mr-2">
                C
              </div>
              <span className="font-medium">お客様の返答:</span>
            </div>
            <div className="flex items-center justify-center p-2">
              <div className="animate-pulse flex space-x-1">
                <div className="h-3 w-3 bg-green-400 rounded-full"></div>
                <div className="h-3 w-3 bg-green-400 rounded-full"></div>
                <div className="h-3 w-3 bg-green-400 rounded-full"></div>
              </div>
            </div>
          </div>
        )}
        
        {/* フィードバックメッセージ */}
        {showFeedback && (
          <div className={`mb-4 p-3 rounded-lg text-center ${
            feedbackMessage.includes('素晴らしい') 
              ? 'bg-green-100 border border-green-300 text-green-800' 
              : feedbackMessage.includes('良い') 
                ? 'bg-blue-100 border border-blue-300 text-blue-800' 
                : 'bg-orange-100 border border-orange-300 text-orange-800'
          }`}>
            <div className="flex items-center justify-center">
              {feedbackMessage.includes('素晴らしい') ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="mr-2" viewBox="0 0 16 16">
                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                </svg>
              ) : feedbackMessage.includes('もう一度') ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="mr-2" viewBox="0 0 16 16">
                  <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
                  <path fillRule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="mr-2" viewBox="0 0 16 16">
                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                </svg>
              )}
              <p className="font-medium">{feedbackMessage}</p>
            </div>
            {!feedbackMessage.includes('素晴らしい') && (
              <p className="text-sm mt-2">
                「{currentLine?.text}」と発音してください
              </p>
            )}
          </div>
        )}
        
        {/* 音声プレーヤー */}
        <div className={isAudioPlaying ? "" : "hidden"}>
          <AudioPlayer 
            text={audioText} 
            autoPlay={true} 
            onFinished={handleAudioFinished}
            isPlaying={isAudioPlaying}
            setIsPlaying={setIsAudioPlaying}
          />
        </div>
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