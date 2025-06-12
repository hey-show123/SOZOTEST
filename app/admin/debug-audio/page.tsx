'use client';

import { useState, useEffect } from 'react';
import { DialogueTurn } from '../../components/lessons/LessonManager';
import { useRouter } from 'next/navigation';

// デフォルトのダイアログデータ
const DEFAULT_DIALOGUE: DialogueTurn[] = [
  {
    role: 'staff',
    text: "What would you like to do today?",
    translation: "今日はどうされますか？",
    turnNumber: 1
  },
  {
    role: 'customer',
    text: "A haircut please, my hair feels damaged.",
    translation: "カットをお願いします。髪が傷んでいるように感じます。",
    turnNumber: 2
  },
  {
    role: 'staff',
    text: "Would you like to do a treatment as well?",
    translation: "トリートメントもされたいですか？",
    turnNumber: 3
  },
  {
    role: 'customer',
    text: "Sure.",
    translation: "はい",
    turnNumber: 4
  }
];

export default function DebugAudioPage() {
  const router = useRouter();
  const [audioUrls, setAudioUrls] = useState<{url: string, exists: boolean, error?: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [audioGeneration, setAudioGeneration] = useState<{text: string, url: string, status: string}[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // 音声ファイルの存在確認
  const checkAudioFileExists = async (url: string) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return {
        url,
        exists: response.ok,
        status: response.status,
        statusText: response.statusText
      };
    } catch (error) {
      return {
        url,
        exists: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  };

  // 初期ロード時に実行
  useEffect(() => {
    const loadAudioUrls = async () => {
      setIsLoading(true);
      
      try {
        // 各ダイアログターンの音声URLを生成
        const generatedUrls = DEFAULT_DIALOGUE.map(turn => {
          const fileName = generateFileName(turn.text, turn.role === 'customer' ? 'onyx' : 'nova');
          return `/audio/${fileName}`;
        });
        
        // 各URLの存在確認
        const results = await Promise.all(generatedUrls.map(url => checkAudioFileExists(url)));
        setAudioUrls(results);
      } catch (error) {
        console.error('音声URL確認エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAudioUrls();
  }, []);

  // 音声ファイル名の生成（APIと同じロジック）
  function generateFileName(text: string, voice: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(`${text}-${voice}`).digest('hex');
    return `${hash}.mp3`;
  }

  // 選択したダイアログの音声を生成
  const generateAudio = async (turn: DialogueTurn, index: number) => {
    try {
      setAudioGeneration(prev => [
        ...prev,
        { text: turn.text, url: '', status: '生成中...' }
      ]);
      
      const voice = turn.role === 'customer' ? 'onyx' : 'nova';
      
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: turn.text,
          voice: voice,
          model: 'tts-1-hd',
          save: true
        }),
      });
      
      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setAudioGeneration(prev => 
        prev.map((item, i) => 
          i === prev.length - 1 
            ? { ...item, url: data.audioUrl, status: '生成完了' } 
            : item
        )
      );
      
      // audioUrlsも更新
      setAudioUrls(prev => {
        const newUrls = [...prev];
        newUrls[index] = { 
          url: data.audioUrl, 
          exists: true
        };
        return newUrls;
      });
      
      return data.audioUrl;
    } catch (error) {
      console.error('音声生成エラー:', error);
      setAudioGeneration(prev => 
        prev.map((item, i) => 
          i === prev.length - 1 
            ? { ...item, status: `エラー: ${error instanceof Error ? error.message : String(error)}` } 
            : item
        )
      );
      return null;
    }
  };

  // すべてのダイアログの音声を生成
  const generateAllAudio = async () => {
    setIsGenerating(true);
    setAudioGeneration([]);
    
    try {
      for (let i = 0; i < DEFAULT_DIALOGUE.length; i++) {
        await generateAudio(DEFAULT_DIALOGUE[i], i);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">音声ファイル診断ツール</h1>
        <button 
          onClick={() => router.push('/admin')}
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          管理画面に戻る
        </button>
      </div>
      
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">サンプルダイアログの音声ファイル</h2>
          <button 
            onClick={generateAllAudio}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isGenerating ? '生成中...' : 'すべての音声を生成'}
          </button>
        </div>
        
        {isLoading ? (
          <div className="text-center py-4">読み込み中...</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">順番</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">役割</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">テキスト</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">音声URL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {DEFAULT_DIALOGUE.map((turn, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{turn.turnNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {turn.role === 'staff' ? 'スタッフ' : 'お客さん'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{turn.text}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {audioUrls[index]?.url || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {audioUrls[index]?.exists ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          存在する
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          存在しない
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => generateAudio(turn, index)}
                        disabled={isGenerating}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        生成
                      </button>
                      {audioUrls[index]?.exists && (
                        <button
                          onClick={() => {
                            const audio = new Audio(audioUrls[index].url);
                            audio.play();
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          再生
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {audioGeneration.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">音声生成ログ</h2>
          <div className="bg-black text-green-400 p-4 rounded-lg overflow-auto max-h-80 font-mono text-sm">
            {audioGeneration.map((item, index) => (
              <div key={index} className="mb-2">
                <div>テキスト: {item.text}</div>
                <div>状態: {item.status}</div>
                {item.url && <div>URL: {item.url}</div>}
                <hr className="border-gray-700 my-2" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 