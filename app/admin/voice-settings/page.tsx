'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../context/AdminContext';
import Link from 'next/link';
import VoiceSelector from '../../components/VoiceSelector';
import { VoiceProvider } from '../../context/VoiceContext';
import ModelSelector from '../../components/ModelSelector';
import { ModelProvider } from '../../context/ModelContext';

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