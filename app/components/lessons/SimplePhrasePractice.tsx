'use client';

import { useState, useEffect } from 'react';
import AudioPlayer from '../AudioPlayer';
import AudioRecorder from '../AudioRecorder';

interface SimplePhrasePracticeProps {
  onComplete: () => void;
}

export default function SimplePhrasePractice({ onComplete }: SimplePhrasePracticeProps) {
  const [currentPhrase, setCurrentPhrase] = useState('Would you like to do a treatment as well?');
  const [translation, setTranslation] = useState('トリートメントもされたいですか？');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioFinished, setIsAudioFinished] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [attemptsCount, setAttemptsCount] = useState(0);

  // 初期音声読み上げ
  const initialInstruction = "今日のキーフレーズを練習しましょう。私の後に続けて発音してください。";

  // 音声の再生が終了したときのハンドラー
  const handleAudioFinished = () => {
    setIsAudioPlaying(false);
    setIsAudioFinished(true);
  };

  // 次のステップに進む
  const handleNext = () => {
    onComplete();
  };

  // 音声認識結果の処理
  const handleTranscription = (text: string) => {
    if (text && text.trim() !== '') {
      setUserAnswer(text);
      setAttemptsCount(prev => prev + 1);
      
      // フィードバック生成（ここでは簡易的な実装）
      setShowFeedback(true);
      if (attemptsCount >= 2) {
        setFeedbackMessage("素晴らしい発音です！次のステップに進みましょう。");
      } else {
        setFeedbackMessage("良い発音です。もう一度練習してみましょう。");
      }
    }
  };

  // 再トライ
  const handleRetry = () => {
    setUserAnswer('');
    setShowFeedback(false);
    setIsAudioPlaying(true);
  };

  // 初回のオーディオ再生
  useEffect(() => {
    setIsAudioPlaying(true);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-center mb-6 text-green-700">
          今日のキーフレーズ
        </h2>
        
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-lg text-blue-800">{initialInstruction}</p>
        </div>
        
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xl font-semibold text-center text-yellow-800">
            {currentPhrase}
          </p>
          <p className="text-center text-yellow-600 mt-2">
            {translation}
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
          </div>
          
          {userAnswer && (
            <div className="p-3 bg-green-50 rounded-lg mb-4">
              <p className="text-center text-green-600">
                あなたの発音: {userAnswer}
              </p>
            </div>
          )}
          
          {showFeedback && (
            <div className="p-3 bg-purple-50 rounded-lg mb-4">
              <p className="text-center text-purple-600">
                {feedbackMessage}
              </p>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <AudioPlayer 
              text={isAudioFinished ? currentPhrase : initialInstruction} 
              autoPlay={true} 
              onFinished={handleAudioFinished}
              isPlaying={isAudioPlaying}
              setIsPlaying={setIsAudioPlaying}
            />
          </div>
          
          <div className="flex items-center gap-4">
            {userAnswer && (
              <>
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-black"
                >
                  もう一度
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2 rounded-lg transition-colors bg-blue-500 hover:bg-blue-600 text-white"
                >
                  次へ
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 