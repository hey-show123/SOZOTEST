'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/app/context/AdminContext';
import Link from 'next/link';
import VoiceSelector from '../../components/VoiceSelector';
import { VoiceProvider } from '@/app/context/VoiceContext';
import ModelSelector from '../../components/ModelSelector';
import { ModelProvider } from '@/app/context/ModelContext';

// TTSテスト機能コンポーネント
function TTSTestTool() {
  const [testText, setTestText] = useState('これはテスト音声です。音声生成機能の動作確認をしています。');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // テスト音声を生成する
  const generateTestAudio = async () => {
    if (!testText.trim()) return;
    
    setIsTesting(true);
    setTestResult(null);
    setTestError(null);
    setAudioUrl(null);
    
    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: testText,
          voice: 'nova',
          model: 'tts-1-hd',
          save: true // ファイルとして保存
        }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        setTestError(`エラー: ${data.error}`);
      } else {
        setAudioUrl(data.audioUrl);
        setTestResult(`音声生成成功: ${data.audioUrl}`);
      }
    } catch (error) {
      setTestError(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsTesting(false);
    }
  };

  // Supabase ストレージの状態を確認
  const checkSupabaseStorage = async () => {
    setIsTesting(true);
    setTestResult(null);
    setTestError(null);
    
    try {
      const response = await fetch('/api/check-storage', {
        method: 'GET',
      });
      
      const data = await response.json();
      
      if (data.error) {
        setTestError(`Supabaseストレージエラー: ${data.error}`);
      } else {
        setTestResult(`Supabaseストレージ状態: ${data.message}\n${data.files ? `ファイル数: ${data.files.length}` : ''}`);
      }
    } catch (error) {
      setTestError(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-medium text-gray-900 mb-3">音声生成テスト</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">テストテキスト</label>
        <textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
          rows={3}
        />
      </div>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={generateTestAudio}
          disabled={isTesting}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isTesting ? '処理中...' : '音声テスト生成'}
        </button>
        
        <button
          onClick={checkSupabaseStorage}
          disabled={isTesting}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition disabled:opacity-50"
        >
          {isTesting ? '確認中...' : 'Supabaseストレージ確認'}
        </button>
      </div>
      
      {audioUrl && (
        <div className="mb-4">
          <audio src={audioUrl} controls className="w-full" />
        </div>
      )}
      
      {testResult && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800 mb-4">
          <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
        </div>
      )}
      
      {testError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 mb-4">
          <pre className="whitespace-pre-wrap text-sm">{testError}</pre>
        </div>
      )}
    </div>
  );
}

// 音声読み上げスピード設定コンポーネント
function SpeechRateSelector() {
  const [speechRate, setSpeechRate] = useState('1.0');
  
  // コンポーネントがマウントされた時に、ローカルストレージから値を読み込む
  useEffect(() => {
    try {
      const savedRate = localStorage.getItem('speechRate');
      if (savedRate) {
        setSpeechRate(savedRate);
      }
    } catch (error) {
      console.error('LocalStorage読み込みエラー:', error);
    }
  }, []);
  
  // 値が変更された時に、ローカルストレージに保存する
  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const newRate = e.target.value;
      setSpeechRate(newRate);
      localStorage.setItem('speechRate', newRate);
    } catch (error) {
      console.error('LocalStorage保存エラー:', error);
    }
  };
  
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-3">音声読み上げ速度</h3>
      <div className="flex items-center mb-2">
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={speechRate}
          onChange={handleRateChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      <div className="flex justify-between text-sm text-gray-500">
        <span>遅い (0.5x)</span>
        <span className="font-medium">{speechRate}x</span>
        <span>速い (2.0x)</span>
      </div>
    </div>
  );
}

export default function VoiceSettingsPage() {
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 管理者でない場合はログインページにリダイレクト
  useEffect(() => {
    if (isClient && !isAdmin) {
      router.push('/admin');
    }
  }, [isAdmin, router, isClient]);

  // クライアントサイドレンダリングの前は何も表示しない
  if (!isClient) {
    return null;
  }

  // 管理者でない場合は何も表示しない（リダイレクト処理中）
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">音声設定</h1>
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/dashboard"
              className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition"
            >
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">AIの音声設定</h2>
            <p className="mt-1 text-sm text-gray-500">
              AIの声の種類や読み上げ速度、使用するモデルなどを設定します。ここでの設定はすべてのユーザーに適用されます。
            </p>
          </div>
          
          <div className="p-6">
            <ModelProvider>
              <VoiceProvider>
                {/* TTSテスト機能 */}
                <TTSTestTool />
                
                {/* 音声選択 */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">音声の種類</h3>
                  <VoiceSelector />
                </div>
                
                {/* 読み上げ速度設定 */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <SpeechRateSelector />
                </div>
                
                {/* AIモデル設定 */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">AIモデル設定</h3>
                  <ModelSelector />
                </div>
              </VoiceProvider>
            </ModelProvider>
            
            <div className="mt-8 flex justify-end">
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition mr-4"
              >
                キャンセル
              </Link>
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                設定を保存
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 