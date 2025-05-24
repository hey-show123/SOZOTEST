import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { Lesson, getLessons } from '@/services/api';
import Layout from '@/components/common/Layout';
import LearningSession from '@/components/learning/LearningSession';

export default function LearningPage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchLesson = async () => {
      try {
        setLoading(true);
        // APIが実装されるまではモックデータを使用
        const lessons = await getLessons();
        const foundLesson = lessons.find(lesson => lesson.id === id);
        
        if (foundLesson) {
          setLesson(foundLesson);
        } else {
          setError('レッスンが見つかりませんでした。');
          router.push('/');
        }
      } catch (err) {
        console.error('Failed to fetch lesson:', err);
        setError('レッスンの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [id, router]);

  const handleStartLesson = () => {
    setIsStarted(true);
  };

  const handleComplete = () => {
    // レッスン完了後の処理
    router.push('/');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="bg-red-100 text-red-600 p-4 rounded-lg max-w-md">
            {error}
          </div>
        </div>
      </Layout>
    );
  }

  if (!lesson) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{lesson.title} | SOZO English Learning</title>
        <meta name="description" content={lesson.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Head>

      {!isStarted ? (
        <Layout>
          <div className="max-w-4xl mx-auto p-4 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4">{lesson.title}</h1>
            <p className="text-base sm:text-lg text-gray-700 mb-6">{lesson.description}</p>
            
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-500 mb-1">難易度</span>
                  <span className={`font-semibold ${
                    lesson.difficulty === 'beginner' ? 'text-green-600' :
                    lesson.difficulty === 'intermediate' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {lesson.difficulty === 'beginner' ? '初級' :
                     lesson.difficulty === 'intermediate' ? '中級' : '上級'}
                  </span>
                </div>
                
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-500 mb-1">所要時間</span>
                  <span className="font-semibold">{lesson.duration}分</span>
                </div>
                
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-500 mb-1">トピック</span>
                  <div className="flex flex-wrap justify-center gap-1">
                    {lesson.topics.map((topic, index) => (
                      <span 
                        key={index}
                        className="bg-secondary bg-opacity-20 text-secondary px-2 py-1 rounded-full text-xs"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <button
                  onClick={handleStartLesson}
                  className="bg-primary text-white px-6 sm:px-8 py-3 rounded-lg font-semibold text-lg hover:bg-opacity-90 transition transform hover:scale-105"
                >
                  レッスンを始める
                </button>
                <p className="mt-4 text-gray-600 text-sm">
                  * レッスン中は、マイクとスピーカーをご利用ください。
                </p>
              </div>
            </div>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <h3 className="text-lg font-semibold text-yellow-800">準備ができていることを確認してください</h3>
              <ul className="mt-2 space-y-1 text-yellow-700">
                <li>・ 周囲が静かな環境</li>
                <li>・ マイクとスピーカーの動作確認</li>
                <li>・ 約{lesson.duration}分間の学習時間の確保</li>
                <li>・ iPhoneの場合はSafariブラウザを使用</li>
              </ul>
            </div>
          </div>
        </Layout>
      ) : (
        <LearningSession
          lesson={lesson}
          pdfUrl={lesson.pdfUrl || `/pdfs/${lesson.id}.pdf`}
          onComplete={handleComplete}
        />
      )}
    </>
  );
} 