import { useEffect, useState } from 'react'
import Layout from '@/components/common/Layout'
import { PDF, getPDFs, generatePDF } from '@/services/api'

export default function PDFsPage() {
  const [pdfs, setPDFs] = useState<PDF[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPDFs = async () => {
      try {
        const data = await getPDFs()
        setPDFs(data)
      } catch (err) {
        setError('PDFの取得に失敗しました。')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchPDFs()
  }, [])

  const handleGeneratePDF = async (lessonId: string) => {
    try {
      const newPDF = await generatePDF(lessonId)
      setPDFs((prev) => [...prev, newPDF])
    } catch (err) {
      setError('PDFの生成に失敗しました。')
      console.error(err)
    }
  }

  if (loading) {
    return (
      <Layout title="PDF教材 - SOZO English Learning">
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="PDF教材 - SOZO English Learning">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8">PDF教材</h1>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pdfs.map((pdf) => (
            <div
              key={pdf.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">{pdf.title}</h2>
              <p className="text-gray-600 mb-4">{pdf.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {new Date(pdf.createdAt).toLocaleDateString()}
                </span>
                <a
                  href={pdf.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-dark"
                >
                  ダウンロード
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
} 