import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface Lesson {
  id: string
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration: number
  topics: string[]
}

export interface PDF {
  id: string
  title: string
  description: string
  url: string
  createdAt: string
}

export const getLessons = async (): Promise<Lesson[]> => {
  const response = await api.get('/lessons')
  return response.data
}

export const getPDFs = async (): Promise<PDF[]> => {
  const response = await api.get('/pdfs')
  return response.data
}

export const generatePDF = async (lessonId: string): Promise<PDF> => {
  const response = await api.post(`/pdfs/generate/${lessonId}`)
  return response.data
}

export default api 