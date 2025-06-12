'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/app/context/AdminContext';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { isAdmin, login } = useAdmin();
  const router = useRouter();

  // 既に管理者ログイン済みの場合はダッシュボードにリダイレクト
  useEffect(() => {
    if (isAdmin) {
      router.push('/admin/dashboard');
    }
  }, [isAdmin, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 簡易的なバリデーション
    if (!password.trim()) {
      setError('パスワードを入力してください');
      setIsLoading(false);
      return;
    }

    // ログイン試行
    const success = login(password);
    
    if (success) {
      // ログイン成功
      router.push('/admin/dashboard');
    } else {
      // ログイン失敗
      setError('パスワードが正しくありません');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 via-indigo-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
            <h1 className="text-2xl font-bold text-white text-center">管理者ログイン</h1>
          </div>
          
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="管理者パスワードを入力"
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                    isLoading
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  disabled={isLoading}
                >
                  {isLoading ? 'ログイン中...' : 'ログイン'}
                </button>
              </div>
            </form>
            
            <div className="mt-6 text-center">
              <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
                ホームに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <Link href="/admin/lessons" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-6 rounded-lg shadow-md text-center">
          レッスン管理
        </Link>
        <Link href="/admin/recordings" className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-4 px-6 rounded-lg shadow-md text-center">
          録音管理
        </Link>
        <Link href="/admin/voice-settings" className="bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-lg shadow-md text-center">
          音声設定
        </Link>
        <Link href="/admin/tts-debug" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-4 px-6 rounded-lg shadow-md text-center">
          TTSデバッグツール
        </Link>
      </div>
    </div>
  );
} 