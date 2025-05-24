import { NextApiRequest, NextApiResponse } from 'next'
import { PDF } from '@/services/api'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // PDF一覧のモックデータ
    const pdfs: PDF[] = [
      {
        id: 'pdf-1',
        title: 'Lesson 1: Would you like to do a treatment as well?',
        description: '美容院での会話練習用PDF',
        url: '/pdfs/lesson-1.pdf',
        createdAt: new Date().toISOString()
      },
      {
        id: 'pdf-2',
        title: 'Lesson 2: May I take your order?',
        description: 'レストランでの会話練習用PDF',
        url: '/pdfs/lesson-2.pdf',
        createdAt: new Date().toISOString()
      },
      {
        id: 'pdf-3',
        title: 'Lesson 3: Where is the nearest station?',
        description: '道案内の会話練習用PDF',
        url: '/pdfs/lesson-3.pdf',
        createdAt: new Date().toISOString()
      },
      {
        id: 'pdf-29',
        title: 'Lesson 29: What symptoms are you experiencing?',
        description: '医療シーンでの会話練習用PDF',
        url: '/pdfs/sozo_med_29.pdf',
        createdAt: new Date().toISOString()
      }
    ]
    
    res.status(200).json(pdfs)
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
} 