/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    APP_ENV: process.env.APP_ENV || 'development',
  },
  // OpenAI APIキーはサーバーサイドのみで使用する
  serverRuntimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY,
  },
  // API URLなど、クライアント側でも使用する環境変数
  publicRuntimeConfig: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  },
  // 本番環境ではローカルAPIリダイレクトを使用しない
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: 'http://localhost:8000/api/:path*',
  //     },
  //   ]
  // },
}

module.exports = nextConfig 