import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <Head>
        <title>SOZO English Learning</title>
        <meta name="description" content="英会話学習アプリケーション" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8">
            SOZO English Learning
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/learning"
              className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <h2 className="text-2xl font-semibold mb-4">学習を始める</h2>
              <p className="text-gray-600">
                英会話の学習を始めましょう。様々なシナリオで実践的な会話を練習できます。
              </p>
            </Link>
            <Link
              href="/pdfs"
              className="p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <h2 className="text-2xl font-semibold mb-4">PDF教材</h2>
              <p className="text-gray-600">
                学習用のPDF教材をダウンロードして、オフラインでも学習できます。
              </p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
} 