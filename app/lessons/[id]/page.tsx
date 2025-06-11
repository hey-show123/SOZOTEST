'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 旧URLから新URLへのリダイレクト
export default function LessonsIdPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;

  useEffect(() => {
    console.log(`/lessons/${id} から /lesson/${id} へリダイレクトします...`);
    router.push(`/lesson/${id}`);
  }, [id, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      <p className="mt-4 text-gray-700">リダイレクト中...</p>
    </div>
  );
} 