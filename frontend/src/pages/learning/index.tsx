import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/common/Layout';
import { Lesson, getLessons } from '@/services/api';

export default function LearningIndex() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        setLoading(true);
        // APIが実装されるまでは仮のデータを使用
        const mockLessons: Lesson[] = [
          {
            id: 'lesson-1',
            title: 'Would you like to do a treatment as well?',
            description: 'トリートメントの提案や追加サービスの案内など、美容院での会話を学びます。',
            difficulty: 'beginner',
            duration: 15,
            topics: ['美容院', 'サービス', '提案'],
            pdfUrl: '/pdfs/lesson-1.pdf'
          },
          {
            id: 'lesson-2',
            title: 'May I take your order?',
            description: 'レストランやカフェでの注文の仕方や、メニューの質問の仕方を学びます。',
            difficulty: 'intermediate',
            duration: 20,
            topics: ['レストラン', '注文', '飲食'],
            pdfUrl: '/pdfs/lesson-2.pdf'
          },
          {
            id: 'lesson-3',
            title: 'Where is the nearest station?',
            description: '道に迷ったときの道の尋ね方や、目的地への行き方を聞く表現を学びます。',
            difficulty: 'intermediate',
            duration: 25,
            topics: ['道案内', '交通', '質問'],
            pdfUrl: '/pdfs/lesson-3.pdf'
          }
        ];
        
        setLessons(mockLessons);
      } catch (err) {
        console.error('Failed to fetch lessons:', err);
        setError('レッスンの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, []);

  return (
    <>
      <Head>
        <title>学習コース一覧 | SOZO English Learning</title>
        <meta name="description" content="英会話学習のためのコース一覧" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Layout>
        <div className="max-w-4xl mx-auto p-4 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6">学習コース一覧</h1>
          
          {loading ? (
            <div className="flex justify-center items-center min-h-[300px]">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 text-red-600 p-4 rounded-lg">
              {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {lessons.map((lesson) => (
                <Link 
                  href={`/learning/${lesson.id}`} 
                  key={lesson.id}
                  className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="p-4 sm:p-6 border-b border-gray-100">
                    <div className="flex justify-between items-start">
                      <h2 className="text-xl font-semibold mb-2">{lesson.title}</h2>
                      <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                        lesson.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                        lesson.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {lesson.difficulty === 'beginner' ? '初級' :
                        lesson.difficulty === 'intermediate' ? '中級' : '上級'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{lesson.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center text-gray-500 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {lesson.duration}分
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
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
                  
                  <div className="p-4 flex justify-end">
                    <span className="text-primary font-medium text-sm flex items-center">
                      詳細を見る
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  );
} 