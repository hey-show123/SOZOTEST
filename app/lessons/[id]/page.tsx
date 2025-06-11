'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lesson } from '@/app/types/lesson';
import LessonDetail from '@/app/components/lessons/LessonDetail';
import { DEFAULT_LESSONS } from '@/app/constants/defaultLessons';
import Loading from '@/app/components/ui/Loading';

export default function LessonPage({ params }: { params: { id: string } }) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchLesson = async () => {
      setLoading(true);
      try {
        // APIからレッスンデータを取得
        const response = await fetch('/api/lessons');
        let foundLesson = null;
        
        if (response.ok) {
          const data = await response.json();
          if (data.lessons && Array.isArray(data.lessons)) {
            foundLesson = data.lessons.find((l: Lesson) => l.id === params.id);
          }
        }
        
        // APIから見つからない場合はローカルストレージを確認
        if (!foundLesson) {
          const savedLessons = localStorage.getItem('lessons');
          if (savedLessons) {
            const lessons = JSON.parse(savedLessons);
            foundLesson = lessons.find((l: Lesson) => l.id === params.id);
          }
        }
        
        // それでも見つからない場合はデフォルトレッスンを確認
        if (!foundLesson) {
          foundLesson = DEFAULT_LESSONS.find(l => l.id === params.id);
        }
        
        if (foundLesson) {
          setLesson(foundLesson);
        } else {
          console.error('レッスンが見つかりません');
          // 見つからない場合はレッスン一覧ページにリダイレクト
          router.push('/lessons');
        }
      } catch (error) {
        console.error('レッスン取得エラー:', error);
        // エラー時はレッスン一覧ページにリダイレクト
        router.push('/lessons');
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loading />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <p className="text-xl font-medium mb-4">レッスンが見つかりませんでした</p>
        <button
          onClick={() => router.push('/lessons')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          レッスン一覧に戻る
        </button>
      </div>
    );
  }

  return <LessonDetail lesson={lesson} />;
} 