'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/app/context/AdminContext';
import Link from 'next/link';

export default function AdminDashboard() {
  const { isAdmin, logout } = useAdmin();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [copied, setCopied] = useState(false);
  const [appUrl, setAppUrl] = useState('');
  const [showIframeCode, setShowIframeCode] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // クライアントサイドでのみ現在のURLを取得
    if (typeof window !== 'undefined') {
      // ホスト名とプロトコルを取得（例：https://chatgpt-app-six-psi.vercel.app）
      const baseUrl = window.location.origin;
      setAppUrl(baseUrl);
    }
  }, []);

  // 管理者でない場合はログインページにリダイレクト
  useEffect(() => {
    if (isClient && !isAdmin) {
      router.push('/admin');
    }
  }, [isAdmin, router, isClient]);

  // ログアウト処理
  const handleLogout = () => {
    logout();
    router.push('/admin');
  };

  // URLをクリップボードにコピー
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // LearnWorlds用のiframeコードを生成
  const generateIframeCode = () => {
    return `<iframe src="${appUrl}?preview=1" width="100%" height="700" frameborder="0" allowfullscreen></iframe>`;
  };

  // LearnWorlds用のシンプルURLを生成
  const generateSimpleUrl = () => {
    return `${appUrl}?preview=1`;
  };

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
          <h1 className="text-xl font-bold text-gray-900">管理者ダッシュボード</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* LearnWorldsのURL生成セクション */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">LearnWorlds用URL</h2>
            <p className="text-sm text-gray-500 mt-1">
              このURLをLearnWorldsのコンテンツとして埋め込むことができます
            </p>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">アプリケーションURL</label>
              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={generateSimpleUrl()}
                  className="flex-1 p-2 border rounded-l focus:ring-blue-500 focus:border-blue-500 text-black"
                />
                <button
                  onClick={() => copyToClipboard(generateSimpleUrl())}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700 transition"
                >
                  {copied ? 'コピーしました!' : 'コピー'}
                </button>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">iframe埋め込みコード</label>
                <button
                  onClick={() => setShowIframeCode(!showIframeCode)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showIframeCode ? '隠す' : '表示'}
                </button>
              </div>
              
              {showIframeCode && (
                <div className="flex">
                  <textarea
                    readOnly
                    value={generateIframeCode()}
                    rows={3}
                    className="flex-1 p-2 border rounded-l focus:ring-blue-500 focus:border-blue-500 text-black font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(generateIframeCode())}
                    className="px-4 bg-blue-600 text-white rounded-r hover:bg-blue-700 transition"
                  >
                    {copied ? 'コピーしました!' : 'コピー'}
                  </button>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-500">
              <p className="mb-1">※ LearnWorldsに埋め込む場合の注意点:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>HTMLコンテンツブロックを使用して、iframeコードを貼り付けてください</li>
                <li>ユーザーの画面サイズに合わせて、width="100%"の設定を使用することをお勧めします</li>
                <li>height値は必要に応じて調整してください（推奨: 700px）</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">管理機能</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* レッスン管理カード */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition p-6">
              <div className="text-blue-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">レッスン管理</h3>
              <p className="text-gray-600 mb-4">レッスンの作成、編集、削除を行います。</p>
              <Link 
                href="/admin/lessons" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                管理する
              </Link>
            </div>

            {/* 音声設定カード */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition p-6">
              <div className="text-purple-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 010-7.072m12.728 0l-3.536 3.536m-9.192 0l3.536-3.536" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">音声設定</h3>
              <p className="text-gray-600 mb-4">AIの声や読み上げ速度などの設定を変更します。</p>
              <Link 
                href="/admin/voice-settings" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
              >
                設定する
              </Link>
            </div>

            {/* ホームページに戻るカード */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition p-6">
              <div className="text-green-600 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">ホームページ</h3>
              <p className="text-gray-600 mb-4">メインアプリケーションに戻ります。</p>
              <Link 
                href="/" 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
              >
                ホームに戻る
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 