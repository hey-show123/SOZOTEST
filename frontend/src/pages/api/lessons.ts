import { NextApiRequest, NextApiResponse } from 'next'
import { Lesson } from '@/services/api'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // レッスン一覧のモックデータ
    const lessons: Lesson[] = [
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
      },
      {
        id: 'lesson-29',
        title: 'What symptoms are you experiencing?',
        description: '病院やクリニックでの診察や症状の説明に関する表現を学びます。',
        difficulty: 'advanced',
        duration: 30,
        topics: ['医療', '健康', '症状'],
        pdfUrl: '/pdfs/sozo_med_29.pdf'
      }
    ]
    
    res.status(200).json(lessons)
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
} 