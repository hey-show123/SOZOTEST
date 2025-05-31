'use client';

import { useState, useEffect } from 'react';
import AudioPlayer from '../AudioPlayer';
import AudioRecorder from '../AudioRecorder';

interface SimplePhrasePracticeProps {
  onComplete: () => void;
}

export default function SimplePhrasePractice({ onComplete }: SimplePhrasePracticeProps) {
  // キーフレーズの情報
  const keyPhrase = {
    text: "Would you like to do a treatment as well?",
    translation: "トリートメントもされたいですか？",
  };

  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [practiceCount, setPracticeCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0); // 正しい発音に成功した回数
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showContinueButton, setShowContinueButton] = useState(false);
  const [audioText, setAudioText] = useState(keyPhrase.text); // 再生する音声テキスト

  // コンポーネントがマウントされたらキーフレーズを自動的に再生
  useEffect(() => {
    // 少し遅延させて再生（画面表示後に再生するため）
    const timer = setTimeout(() => {
      // 直接フレーズだけを再生するように設定
      setAudioText(keyPhrase.text);
      setIsAudioPlaying(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // 音声の再生が終了したときのハンドラー
  const handleAudioFinished = () => {
    setIsAudioPlaying(false);
  };

  // 音声認識結果の処理
  const handleTranscription = (text: string) => {
    if (text && text.trim() !== '') {
      setUserAnswer(text);
      
      // 練習回数を更新（処理の前に行う）
      const newPracticeCount = practiceCount + 1;
      setPracticeCount(newPracticeCount);
      
      // 簡易的な判定（完全一致でなくても、ある程度似ていれば良しとする）
      const normalizedUserAnswer = text.toLowerCase().replace(/[.,?!]/g, '').trim();
      const normalizedKeyPhrase = keyPhrase.text.toLowerCase().replace(/[.,?!]/g, '').trim();
      
      const similarity = calculateSimilarity(normalizedUserAnswer, normalizedKeyPhrase);
      
      if (similarity > 0.7) {
        const newSuccessCount = successCount + 1;
        setSuccessCount(newSuccessCount);
        
        // 成功回数に応じてメッセージを変更
        if (newSuccessCount === 1) {
          setFeedbackMessage('素晴らしい発音です！もう一度練習してみましょう。');
        } else {
          setFeedbackMessage('素晴らしい発音です！次のセクションに進みましょう。');
        }
        
        // 2回成功したら次へボタンを表示
        if (newSuccessCount >= 2) {
          setShowContinueButton(true);
        }
      } else if (similarity > 0.4) {
        setFeedbackMessage('良い発音です。もう少し練習してみましょう。');
      } else {
        setFeedbackMessage('もう一度挑戦してみましょう。');
      }
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

  // キーフレーズを再生
  const playKeyPhrase = () => {
    setAudioText(keyPhrase.text); // 直接フレーズのみを設定
    setIsAudioPlaying(true);
  };

  return (
    <div className="w-full h-full p-4 flex flex-col items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full">
        <h2 className="text-xl font-bold text-center mb-6 text-green-700">今日の一言</h2>
        
        <div className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-6 mb-6 transform transition-all hover:shadow-md relative">
          <p className="text-center text-sm text-yellow-800 mb-2 font-medium">今日のキーフレーズ</p>
          <p className="text-center text-2xl font-bold text-gray-800 mb-2">{keyPhrase.text}</p>
          <p className="text-center text-lg text-gray-700">{keyPhrase.translation}</p>
          
          {/* フレーズ再生ボタン（右上に配置） */}
          <button
            onClick={playKeyPhrase}
            className="absolute top-4 right-4 text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-100"
            title="キーフレーズを聞く"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/>
              <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/>
              <path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7.5 4v8a.5.5 0 0 1-.78.419l-3-2a.5.5 0 0 1 0-.838l3-2V4a.5.5 0 0 1-.003-.01l-.47-.94a.5.5 0 0 1-.117-.173l.002-.003.471-.942A.5.5 0 0 1 6.717 3.55z"/>
            </svg>
          </button>
        </div>
        
        <div className="bg-gray-100 rounded-lg p-4 mb-6 border border-gray-300">
          <p className="text-center text-gray-800 mb-6 font-medium">
            {successCount < 2 ? `正しい発音に ${successCount}/2 回成功しています。あと ${2 - successCount} 回成功すると次に進めます。` : '正しい発音に2回成功しました！次のセクションに進むことができます。'}
          </p>
          
          <div className="flex justify-center mb-4">
            {/* フリートークと同じスタイルの録音ボタン */}
            <AudioRecorder 
              onTranscription={(text) => {
                handleTranscription(text);
              }}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
            />
          </div>
        </div>
        
        {userAnswer && (
          <div className={`rounded-lg p-4 mb-6 border ${
            feedbackMessage.includes('素晴らしい') 
              ? 'bg-green-100 border-green-300 text-green-900' 
              : feedbackMessage.includes('良い') 
                ? 'bg-blue-100 border-blue-300 text-blue-900' 
                : 'bg-orange-100 border-orange-300 text-orange-900'
          }`}>
            <p className="text-center font-medium mb-2">
              {feedbackMessage}
            </p>
            <p className="text-center text-gray-800">
              あなたの発音: <span className="font-medium">{userAnswer}</span>
            </p>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-700 font-medium">
            練習回数: {practiceCount}
          </div>
          
          {showContinueButton && (
            <button
              onClick={onComplete}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
            >
              次のセクションへ
            </button>
          )}
        </div>
      </div>
      
      {/* 音声プレーヤー */}
      <div className="hidden">
        <AudioPlayer 
          text={audioText} 
          autoPlay={isAudioPlaying} 
          onFinished={handleAudioFinished}
          isPlaying={isAudioPlaying}
          setIsPlaying={setIsAudioPlaying}
        />
      </div>
    </div>
  );
} 