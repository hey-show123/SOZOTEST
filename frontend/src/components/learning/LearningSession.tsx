import { useState } from 'react'
import { Lesson } from '@/services/api'

interface LearningSessionProps {
  lesson: Lesson
  onComplete: () => void
}

export default function LearningSession({ lesson, onComplete }: LearningSessionProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: バックエンドAPIと連携して回答を評価
    setFeedback('正解です！')
    setTimeout(() => {
      setCurrentStep((prev) => prev + 1)
      setUserInput('')
      setFeedback(null)
    }, 2000)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-4">{lesson.title}</h2>
        <div className="mb-6">
          <p className="text-gray-600">{lesson.description}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="userInput"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              あなたの回答
            </label>
            <textarea
              id="userInput"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
              rows={4}
              placeholder="英語で回答を入力してください..."
            />
          </div>
          {feedback && (
            <div className="p-4 bg-green-50 text-green-700 rounded-md">
              {feedback}
            </div>
          )}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              disabled={currentStep === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              前へ
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              回答を送信
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 