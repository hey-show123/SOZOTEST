'use client';

import { useState } from 'react';
import AudioPlayer from '../AudioPlayer';
import AudioRecorder from '../AudioRecorder';

interface AllInOnePhrasePracticeProps {
  onComplete: () => void;
}

// フレーズ練習のデータ
const practiceData = [
  {
    id: 1,
    instruction: "Would you like to do a treatment as well?",
    phrase: "Would you like to do a treatment as well?",
    translation: "トリートメントもされたいですか？",
  },
  {
    id: 2,
    instruction: "Would you like to do a shampoo as well?",
    phrase: "Would you like to do a shampoo as well?",
    translation: "シャンプーもされたいですか？",
  },
  {
    id: 3,
    instruction: "Would you like to do a head massage as well?",
    phrase: "Would you like to do a head massage as well?",
    translation: "ヘッドマッサージもされたいですか？",
  },
  {
    id: 4,
    instruction: "Would you like to try a new hair style?",
    phrase: "Would you like to try a new hair style?",
    translation: "新しいヘアスタイルを試してみませんか？",
  },
  {
    id: 5,
    instruction: "Would you like to have a cup of tea?",
    phrase: "Would you like to have a cup of tea?",
    translation: "お茶はいかがですか？",
  },
  {
    id: 6,
    instruction: "Would you like to see the result with a mirror?",
    phrase: "Would you like to see the result with a mirror?",
    translation: "鏡で仕上がりを見てみますか？",
  },
  {
    id: 7,
    instruction: "Would you like to make another appointment?",
    phrase: "Would you like to make another appointment?",
    translation: "次の予約をされますか？",
  },
];

export default function AllInOnePhrasePractice({ onComplete }: AllInOnePhrasePracticeProps) {
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentPhraseId, setCurrentPhraseId] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [completedPhrases, setCompletedPhrases] = useState<Set<number>>(new Set());

  // 音声の再生が終了したときのハンドラー
  const handleAudioFinished = () => {
    setIsAudioPlaying(false);
  };

  // 音声認識結果の処理
  const handleTranscription = (phraseId: number, text: string) => {
    if (text && text.trim() !== '') {
      setUserAnswers(prev => ({ ...prev, [phraseId]: text }));
      setCompletedPhrases(prev => new Set([...prev, phraseId]));
    }
  };

  // フレーズの音声再生
  const playPhrase = (phraseId: number) => {
    setCurrentPhraseId(phraseId);
    setIsAudioPlaying(true);
  };

  // すべてのフレーズが完了したかチェック
  const allCompleted = completedPhrases.size === practiceData.length;

  return (
    <div className="w-full h-full p-4">
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <h2 className="text-xl font-bold text-center mb-4 text-green-700">フレーズ練習</h2>
        <p className="mb-4 text-gray-700">
          今日のフレーズを練習しましょう。各フレーズを聞いて、発音してみてください。
        </p>

        {currentPhraseId && (
          <div className="flex items-center mb-4">
            <AudioPlayer 
              text={practiceData.find(p => p.id === currentPhraseId)?.phrase || ''} 
              autoPlay={true} 
              onFinished={handleAudioFinished}
              isPlaying={isAudioPlaying}
              setIsPlaying={setIsAudioPlaying}
            />
            <span className="ml-2 text-sm text-gray-500">フレーズを再生</span>
          </div>
        )}

        <div className="overflow-y-auto max-h-[60vh]">
          {practiceData.map((practice) => (
            <div 
              key={practice.id} 
              className={`mb-4 p-4 rounded-lg transition-all ${
                completedPhrases.has(practice.id) 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">フレーズ {practice.id}</span>
                {completedPhrases.has(practice.id) && (
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                    完了
                  </span>
                )}
              </div>
              
              <div className="mb-2">
                <p className="text-lg font-semibold text-gray-800">{practice.phrase}</p>
                <p className="text-sm text-gray-600">{practice.translation}</p>
              </div>
              
              <div className="flex flex-wrap gap-2 items-center mt-2">
                <button
                  onClick={() => playPhrase(practice.id)}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-1" viewBox="0 0 16 16">
                    <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                  </svg>
                  聞く
                </button>
                
                <div className="flex-1 flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setCurrentPhraseId(practice.id);
                      setIsRecording(true);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm flex items-center ${
                      currentPhraseId === practice.id && isRecording
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-1" viewBox="0 0 16 16">
                      <path d="M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0V3z"/>
                      <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/>
                    </svg>
                    発音する
                  </button>
                  
                  <button
                    onClick={() => {
                      handleTranscription(practice.id, practice.phrase);
                    }}
                    className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm"
                  >
                    スキップ
                  </button>
                </div>
              </div>
              
              {userAnswers[practice.id] && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                  <p className="text-blue-700">あなたの発音: {userAnswers[practice.id]}</p>
                </div>
              )}
              
              {currentPhraseId === practice.id && isRecording && (
                <div className="mt-2">
                  <AudioRecorder 
                    onTranscription={(text) => {
                      handleTranscription(practice.id, text);
                      setIsRecording(false);
                    }}
                    isRecording={isRecording}
                    setIsRecording={setIsRecording}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {completedPhrases.size} / {practiceData.length} 完了
        </div>
        <button
          onClick={onComplete}
          disabled={!allCompleted}
          className={`px-6 py-2 rounded-lg transition-colors ${
            allCompleted
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