'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '../../context/AdminContext';
import Link from 'next/link';
import LessonManager from '../../components/lessons/LessonManager';
import { Lesson } from '../../components/lessons/LessonManager';

export default function AdminLessonsPage() {
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 管理者でない場合はログインページにリダイレクト
  useEffect(() => {
    if (isClient && !isAdmin) {
      router.push('/admin');
    }
  }, [isAdmin, router, isClient]);

  // レッスン選択時のハンドラー
  const handleSelectLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson);
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
          <h1 className="text-xl font-bold text-gray-900">レッスン管理</h1>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">レッスンの管理</h2>
              <p className="text-gray-600">
                レッスンの作成、編集、削除を行います。作成したレッスンは一般ユーザーがアクセスできます。
              </p>
            </div>
            
            {/* レッスン管理コンポーネント */}
            <LessonManager 
              onSelectLesson={handleSelectLesson} 
              currentLessonId={currentLesson?.id}
            />
            
            {/* レッスンURLの表示 */}
            {currentLesson && (
              <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-md font-medium text-blue-900 mb-2">選択中のレッスンURL</h3>
                <div className="flex items-center">
                  <code className="bg-white px-3 py-2 rounded text-blue-600 flex-1 truncate overflow-auto">
                    {typeof window !== 'undefined' ? 
                      `${window.location.origin}/lesson/${currentLesson.id}` : 
                      `/lesson/${currentLesson.id}`}
                  </code>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(`${window.location.origin}/lesson/${currentLesson.id}`);
                        alert('URLをコピーしました！');
                      }
                    }}
                    className="ml-2 p-2 text-blue-500 hover:text-blue-700 bg-white rounded shadow"
                    title="URLをコピー"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                  </button>
                </div>
                <p className="mt-2 text-sm text-blue-600">
                  このURLを共有することで、ユーザーは直接このレッスンにアクセスできます。
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 