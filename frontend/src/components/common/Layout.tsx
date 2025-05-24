import Head from 'next/head'
import Link from 'next/link'
import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
  title?: string
}

export default function Layout({ children, title = 'SOZO English Learning' }: LayoutProps) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="英会話学習アプリケーション" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen flex flex-col">
        <header className="bg-white shadow-sm">
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <Link href="/" className="flex items-center">
                  <span className="text-xl font-bold text-primary">SOZO English</span>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  href="/learning"
                  className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
                >
                  学習
                </Link>
                <Link
                  href="/pdfs"
                  className="text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
                >
                  PDF教材
                </Link>
              </div>
            </div>
          </nav>
        </header>
        <main className="flex-grow bg-background">
          {children}
        </main>
        <footer className="bg-white shadow-sm mt-auto">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <p className="text-center text-gray-500 text-sm">
              © 2024 SOZO English Learning. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  )
} 