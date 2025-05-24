# 英会話学習アプリケーション

AIを活用した英会話学習アプリケーションです。リアルタイムの会話練習と発音フィードバックを通じて英語力を向上させます。

## 機能

- AIを用いたリアルタイム会話練習
- 音声認識による発音評価
- テキスト入力と音声入力の両方に対応
- 会話履歴の保存と振り返り
- PDFレッスン教材の閲覧

## 技術スタック

### バックエンド
- FastAPI 0.104.1
- Python 3.9+
- OpenAI API (GPT-4, Whisper, TTS)
- Uvicorn

### フロントエンド
- Next.js 14
- React 18
- TypeScript
- Material UI 5

## プロジェクト構成

```
/
├── backend/                 # バックエンドアプリケーション
│   ├── app/                 # アプリケーションパッケージ
│   │   ├── api/             # APIエンドポイント
│   │   ├── core/            # コア機能
│   │   ├── models/          # データモデル
│   │   └── services/        # ビジネスロジック
│   ├── pdfs/                # PDFファイル
│   ├── main.py              # エントリーポイント
│   └── requirements.txt     # 依存関係
│
├── frontend/                # フロントエンドアプリケーション
│   ├── src/                 # ソースコード
│   │   ├── components/      # Reactコンポーネント
│   │   ├── pages/           # ページコンポーネント
│   │   ├── services/        # APIサービス
│   │   ├── hooks/           # カスタムフック
│   │   ├── utils/           # ユーティリティ関数
│   │   └── contexts/        # コンテキスト
│   ├── tsconfig.json        # TypeScript設定
│   ├── package.json         # 依存関係
│   └── next.config.js       # Next.js設定
│
├── tests/                   # テストディレクトリ
├── README.md                # プロジェクト説明
└── @todo.md                 # タスク管理
```

## セットアップ手順

### 前提条件
- Python 3.9+
- Node.js 18+
- OpenAI APIキー

### バックエンドセットアップ

1. リポジトリのクローン
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. Python仮想環境の作成と有効化
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Linux/Mac
   # または
   .venv\Scripts\activate     # Windows
   ```

3. 依存関係のインストール
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. 環境変数の設定
   ```bash
   # .envファイルを作成
   echo "OPENAI_API_KEY=your_api_key_here" > .env
   ```

5. アプリケーションの起動
   ```bash
   python main.py
   ```

### フロントエンドセットアップ

1. 依存関係のインストール
   ```bash
   cd frontend
   npm install
   ```

2. 環境変数の設定
   ```bash
   # .env.localファイルを作成
   echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local
   ```

3. 開発サーバーの起動
   ```bash
   npm run dev
   ```

4. ブラウザでアクセス
   ```
   http://localhost:3000
   ```

## 使い方

1. ブラウザで`http://localhost:3000`にアクセス
2. 「録音開始」ボタンをクリックして英語で話す
3. 「録音停止」ボタンをクリックして送信
4. AIからのフィードバックを聞く
5. テキスト入力も可能

## 開発者向け情報

- APIエンドポイント: `http://localhost:8000/api/docs`
- タスク管理: `@todo.md`ファイルを参照

## ライセンス

このプロジェクトは[MITライセンス](LICENSE)の下で公開されています。 