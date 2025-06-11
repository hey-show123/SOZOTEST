# SOZOの教室 AI英会話アプリ

AI(ChatGPT)を使った英会話学習アプリです。効果的に英語を学習するための様々な機能を提供します。

## 主な機能

- **AIレッスン**: 会話形式で英語を学びながら練習できます
- **フレーズ練習**: キーフレーズを集中的に練習できます
- **ダイアログ練習**: ロールプレイ形式でダイアログを練習できます
- **音声合成**: OpenAIのTTSを使用して自然な発音で英語を聞けます
- **レッスン管理**: 新しいレッスンの作成や編集ができます

## 技術スタック

- [Next.js](https://nextjs.org/) - Reactフレームワーク
- [TypeScript](https://www.typescriptlang.org/) - 型付きJavaScript
- [Tailwind CSS](https://tailwindcss.com/) - CSSフレームワーク
- [OpenAI API](https://platform.openai.com/) - ChatGPTとText-to-Speech
- [Supabase](https://supabase.com/) - データベースとストレージ

## セットアップ

### 前提条件

- Node.js 18.x 以上
- OpenAI APIキー
- Supabaseアカウント

### インストール

1. リポジトリをクローン:
```bash
git clone <repository-url>
cd chatgpt-app
```

2. 依存関係をインストール:
```bash
npm install
```

3. 環境変数を設定:
`.env.local`ファイルを作成し、以下の内容を追加:

```
# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabaseの設定

1. [Supabase](https://supabase.com/)にアカウントを作成し、新しいプロジェクトを作成します。

2. **データベースの設定**:
   - SQLエディタを開き、以下のSQLを実行してレッスンテーブルを作成します：

   ```sql
   CREATE TABLE lessons (
     id TEXT PRIMARY KEY,
     title TEXT NOT NULL,
     description TEXT,
     pdfUrl TEXT,
     systemPrompt TEXT,
     level TEXT,
     tags TEXT[],
     createdAt BIGINT,
     updatedAt BIGINT,
     audioGenerated BOOLEAN DEFAULT FALSE,
     headerTitle TEXT,
     startButtonText TEXT,
     keyPhrase JSONB,
     dialogueTurns JSONB[],
     goals JSONB[]
   );
   ```

3. **ストレージの設定**:
   - Storageセクションで新しいバケット「audio-files」を作成します
   - バケットを公開アクセス可能に設定します
   - 必要に応じてRLSポリシーを設定します

4. **API認証情報の取得**:
   - プロジェクト設定 → API からURLとAnon Keyをコピーします
   - これらの値を`.env.local`ファイルに設定します

### 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアプリケーションが起動します。

## デプロイ

### Vercelへのデプロイ

1. [Vercel](https://vercel.com/)にアカウントを作成
2. プロジェクトをインポート
3. 環境変数を設定
   - OPENAI_API_KEY
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
4. デプロイ

## データの共有について

- **開発環境**: ローカルストレージとローカルファイルシステムにデータを保存
- **本番環境**: Supabaseにデータを保存し、すべてのユーザー間で共有

### レッスンデータの共有

本番環境では、レッスンデータはSupabaseのデータベースに保存され、すべてのユーザー間で共有されます。レッスン管理画面で作成・編集したレッスンは、すべてのユーザーが利用できるようになります。

### 音声ファイルの共有

本番環境では、生成された音声ファイルはSupabaseのStorage「audio-files」バケットに保存され、すべてのユーザー間で共有されます。一度生成された音声ファイルは再利用され、OpenAI APIの呼び出しを節約します。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
