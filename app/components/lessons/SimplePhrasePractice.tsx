'use client';

import { useState, useEffect } from 'react';
import AudioPlayer from '../AudioPlayer';
import AudioRecorder from '../AudioRecorder';
import Image from 'next/image';
import { Phrase } from './LessonManager';

interface SimplePhrasePracticeProps {
  onComplete: () => void;
  avatarImage?: string; // アバター画像のパスを受け取るプロパティを追加
  keyPhrase?: Phrase; // キーフレーズを受け取るプロパティを追加
}

export default function SimplePhrasePractice({ onComplete, avatarImage, keyPhrase }: SimplePhrasePracticeProps) {
  // デフォルトのキーフレーズ（keyPhraseが指定されていない場合に使用）
  const defaultKeyPhrase = {
    text: "Would you like to do a treatment as well?",
    translation: "トリートメントもされたいですか？",
  };

  // 使用するキーフレーズ（propsから受け取るか、デフォルト値を使用）
  const phraseToUse = keyPhrase || defaultKeyPhrase;

  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [practiceCount, setPracticeCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0); // 正しい発音に成功した回数
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [showContinueButton, setShowContinueButton] = useState(false);
  const [audioText, setAudioText] = useState(phraseToUse.text); // 初期値をキーフレーズに設定
  const [initialPlayDone, setInitialPlayDone] = useState(false);

  // コンポーネントがマウントされたら自動的にキーフレーズを再生する
  useEffect(() => {
    // すでに再生済みの場合は実行しない
    if (initialPlayDone) return;
    
    // 少し遅延させて再生（画面表示後に再生するため）
    const timer = setTimeout(() => {
      setIsAudioPlaying(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [initialPlayDone]);

  // 音声の再生が終了したときのハンドラー
  const handleAudioFinished = () => {
    setIsAudioPlaying(false);
    setInitialPlayDone(true); // 初回再生完了をマーク
  };

  // 音声認識結果の処理
  const handleTranscription = (text: string) => {
    if (text && text.trim() !== '') {
      setUserAnswer(text);
      
      // 練習回数を更新（処理の前に行う）
      const newPracticeCount = practiceCount + 1;
      setPracticeCount(newPracticeCount);
      
      // 正規化（小文字化、句読点除去、空白除去）
      const normalizedUserAnswer = text.toLowerCase().replace(/[.,?!]/g, '').trim();
      const normalizedKeyPhrase = phraseToUse.text.toLowerCase().replace(/[.,?!]/g, '').trim();
      
      // 完全一致のみを正解とする
      if (normalizedUserAnswer === normalizedKeyPhrase) {
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
      } else {
        setFeedbackMessage('もう一度挑戦してみましょう。発音が正確ではありません。');
      }
    }
  };

  // キーフレーズを再生
  const playKeyPhrase = () => {
    setAudioText(phraseToUse.text); // 直接フレーズのみを設定
    setIsAudioPlaying(true);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 flex flex-col items-center justify-center">
      <div className="w-full bg-white rounded-3xl shadow-lg p-6 relative">
        {/* キーフレーズの吹き出し */}
        <div className="relative mb-10">
          {/* 吹き出しの黄色い背景 */}
          <div className="bg-yellow-100 border-2 border-yellow-300 rounded-3xl p-6 mb-2 relative">
            {/* フレーズと訳文 */}
            <p className="text-center text-2xl font-bold text-gray-800 mb-4">{phraseToUse.text}</p>
            <p className="text-center text-lg text-gray-700">{phraseToUse.translation}</p>
            
            {/* フレーズ再生ボタン（右上に配置） */}
            <button
              onClick={playKeyPhrase}
              className="absolute top-4 right-4 text-blue-600 hover:text-blue-800"
              title="キーフレーズを聞く"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
                <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l-.708.707A7.476 7.476 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303l.708.707z"/>
                <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.483 5.483 0 0 1 11.025 8a5.483 5.483 0 0 1-1.61 3.89l.706.706z"/>
                <path d="M8.707 11.182A4.486 4.486 0 0 0 10.025 8a4.486 4.486 0 0 0-1.318-3.182L8 5.525A3.489 3.489 0 0 1 9.025 8 3.49 3.49 0 0 1 8 10.475l.707.707zM6.717 3.55A.5.5 0 0 1 7.5 4v8a.5.5 0 0 1-.78.419l-3-2a.5.5 0 0 1 0-.838l3-2V4a.5.5 0 0 1-.003-.01l-.47-.94a.5.5 0 0 1-.117-.173l.002-.003.471-.942A.5.5 0 0 1 6.717 3.55z"/>
              </svg>
            </button>
            
            {/* 吹き出しの三角形部分 */}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[20px] border-yellow-300"></div>
          </div>
        </div>
        
        {/* アバターとアシスタント名 */}
        <div className="flex items-center mb-6">
          <div className="relative w-16 h-16 bg-blue-100 rounded-full overflow-hidden mr-4 flex-shrink-0">
            {avatarImage ? (
              // カスタムアバター画像が指定されている場合
              <Image 
                src={avatarImage} 
                alt="SOZO Assistant" 
                fill 
                className="object-cover"
              />
            ) : (
              // デフォルトのシンプルなアバターアイコン
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="5" />
                  <path d="M20 21v-2a7 7 0 0 0-14 0v2" />
                  {/* ヘッドフォンの簡易表現 */}
                  <path d="M2 12h2v4h-2z" fill="currentColor" />
                  <path d="M20 12h2v4h-2z" fill="currentColor" />
                  <path d="M2 12c0-3 2-4 4-4" strokeLinecap="round" />
                  <path d="M22 12c0-3-2-4-4-4" strokeLinecap="round" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold">SOZO アシスタント</h3>
            <p className="text-lg text-gray-700">
              もうちょっと！あと{2 - successCount}回言えたらバッチリ！発音が合ってたら、次に進めるよ〜 がんばって！
            </p>
          </div>
        </div>
        
        {/* マイクボタン */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20">
            <AudioRecorder 
              onTranscription={(text) => {
                handleTranscription(text);
              }}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
            />
          </div>
        </div>
        
        {/* テスト用：次に進むボタン */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => {
              // 発音成功とみなして次に進む
              const newSuccessCount = 2; // 2回成功したことにする
              setSuccessCount(newSuccessCount);
              setShowContinueButton(true);
              setFeedbackMessage('素晴らしい発音です！次のセクションに進みましょう。');
            }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          >
            次に進む
          </button>
        </div>
        
        {/* フィードバックメッセージ */}
        {userAnswer && (
          <div className={`rounded-lg p-4 mb-6 text-center ${
            feedbackMessage.includes('素晴らしい') 
              ? 'text-green-600 font-medium' 
              : 'text-orange-600 font-medium'
          }`}>
            <p className="mb-2">{feedbackMessage}</p>
            <p className="text-gray-700">あなたの発音: <span className="font-medium">{userAnswer}</span></p>
          </div>
        )}
        
        {/* フッターメッセージ */}
        <p className="text-center text-gray-700 font-medium mb-4">
          最初の一歩です！がんばろう👍
        </p>
        
        {/* 次へボタン */}
        {showContinueButton && (
          <div className="flex justify-center">
            <button
              onClick={onComplete}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium shadow-md transition-transform transform hover:scale-105"
            >
              次のセクションへ
            </button>
          </div>
        )}
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