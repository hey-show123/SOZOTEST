'use client';

import { useState, useEffect } from 'react';
import AudioPlayer from '../AudioPlayer';
import AudioRecorder from '../AudioRecorder';

interface AllInOnePhrasePracticeProps {
  onComplete: () => void;
}

export default function AllInOnePhrasePractice({ onComplete }: AllInOnePhrasePracticeProps) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [completedPhrases, setCompletedPhrases] = useState<Record<number, boolean>>({});
  
  // フレーズ一覧
  const phrases = [
    {
      phrase: "Would you like to do a treatment as well?",
      translation: "トリートメントもされたいですか？",
      hint: "〜もされたいですか？という形で追加のサービスを提案できます。"
    },
    {
      phrase: "Would you like to do a shampoo as well?",
      translation: "シャンプーもされたいですか？",
      hint: "各種サービスの名前を入れ替えて使用できます。"
    },
    {
      phrase: "Would you like to do a head massage as well?",
      translation: "ヘッドマッサージもされたいですか？",
      hint: "クライアントに追加のサービスを提案する際に役立ちます。"
    }
  ];

  // 音声の再生が終了したときのハンドラー
  const handleAudioFinished = () => {
    setIsAudioPlaying(false);
  };

  // 音声認識結果の処理
  const handleTranscription = (text: string) => {
    if (text && text.trim() !== '') {
      // 現在のフレーズの回答を記録
      setUserAnswers(prev => ({
        ...prev,
        [currentPhraseIndex]: text
      }));
      
      // フレーズを完了としてマーク
      setCompletedPhrases(prev => ({
        ...prev,
        [currentPhraseIndex]: true
      }));
    }
  };

  // フレーズを選択
  const selectPhrase = (index: number) => {
    setCurrentPhraseIndex(index);
  };

  // 次のセクションへ
  const handleNextSection = () => {
    onComplete();
  };

  // すべてのフレーズが完了したかチェック
  const allPhrasesCompleted = phrases.every((_, index) => completedPhrases[index]);

  // 現在選択されているフレーズ
  const currentPhrase = phrases[currentPhraseIndex];

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-center mb-6 text-green-700">
          キーフレーズ練習
        </h2>
        
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {phrases.map((phrase, index) => (
            <div
              key={index}
              onClick={() => selectPhrase(index)}
              className={`p-3 rounded-lg cursor-pointer ${
                currentPhraseIndex === index 
                  ? 'bg-blue-100 border-2 border-blue-300' 
                  : completedPhrases[index]
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <p className="font-medium truncate">
                {phrase.phrase}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {phrase.translation}
              </p>
              {completedPhrases[index] && (
                <div className="mt-1 text-xs text-green-600 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  練習済み
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xl font-semibold text-center text-yellow-800">
            {currentPhrase.phrase}
          </p>
          <p className="text-center text-yellow-600 mt-2">
            {currentPhrase.translation}
          </p>
          <p className="text-center text-yellow-500 text-sm mt-2 italic">
            {currentPhrase.hint}
          </p>
        </div>
        
        <div className="mb-6">
          <div className="p-3 bg-gray-100 rounded-lg mb-4">
            <p className="text-center text-gray-600">
              今日の一言: マイクに向かってお話ししましょう
            </p>
          </div>
          
          <div className="flex justify-center items-center gap-4 mb-4">
            <AudioRecorder 
              onTranscription={handleTranscription}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
            />
            <button
              onClick={() => {
                setUserAnswers(prev => ({
                  ...prev,
                  [currentPhraseIndex]: currentPhrase.phrase
                }));
                setCompletedPhrases(prev => ({
                  ...prev,
                  [currentPhraseIndex]: true
                }));
              }}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
            >
              スキップ
            </button>
          </div>
          
          {userAnswers[currentPhraseIndex] && (
            <div className="p-3 bg-green-50 rounded-lg mb-4">
              <p className="text-center text-green-600">
                あなたの発音: {userAnswers[currentPhraseIndex]}
              </p>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <AudioPlayer 
              text={currentPhrase.phrase} 
              autoPlay={false} 
              onFinished={handleAudioFinished}
              isPlaying={isAudioPlaying}
              setIsPlaying={setIsAudioPlaying}
            />
          </div>
          
          <div>
            {allPhrasesCompleted && (
              <button
                onClick={handleNextSection}
                className="px-6 py-2 rounded-lg transition-colors bg-blue-500 hover:bg-blue-600 text-white"
              >
                次のセクションへ
              </button>
            )}
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>完了: {Object.values(completedPhrases).filter(Boolean).length} / {phrases.length}</p>
        </div>
      </div>
    </div>
  );
} 