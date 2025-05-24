# デプロイ手順

## 開発環境での実行
現在、アプリケーションはローカル開発環境で実行されています。

- バックエンド: http://localhost:8000 
- フロントエンド: http://localhost:3000

## 本番環境へのデプロイ

### バックエンド（FastAPI）のデプロイ

#### オプション1: Heroku

1. Herokuアカウントを作成し、Heroku CLIをインストールします。
2. プロジェクトのルートディレクトリで以下を実行:

```bash
# Herokuにログイン
heroku login

# アプリを作成
heroku create your-app-name

# Procfileの作成（もし存在しなければ）
echo "web: cd backend && gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app" > Procfile

# 環境変数の設定
heroku config:set OPENAI_API_KEY=your_openai_api_key

# デプロイ
git push heroku main
```

#### オプション2: Google Cloud Run

1. Google Cloudアカウントを設定し、gcloudコマンドラインツールをインストールします。
2. Dockerfileを作成（バックエンドディレクトリ内）:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

3. デプロイ:

```bash
# ビルドとデプロイ
gcloud builds submit --tag gcr.io/your-project-id/backend
gcloud run deploy backend --image gcr.io/your-project-id/backend --platform managed
```

### フロントエンド（Next.js）のデプロイ

#### オプション1: Vercel（推奨）

1. Vercelアカウントを作成し、Vercel CLIをインストールします。
2. フロントエンドディレクトリで以下を実行:

```bash
# Vercel CLIをインストール
npm install -g vercel

# ログイン
vercel login

# デプロイ
vercel
```

3. 環境変数の設定:
   - Vercelダッシュボードで`NEXT_PUBLIC_API_URL`をバックエンドのURLに設定します。

#### オプション2: Netlify

1. Netlifyアカウントを作成します。
2. netlify.tomlファイルを作成（フロントエンドディレクトリに）:

```toml
[build]
  command = "npm run build"
  publish = "out"

[build.environment]
  NEXT_PUBLIC_API_URL = "https://your-backend-url.com/api"
```

3. Netlify Dashboardから新しいサイトを追加し、GitHubリポジトリと接続します。

## CORS設定

バックエンドとフロントエンドを別々のドメインにデプロイする場合、バックエンドのCORS設定が重要です。`backend/main.py`で以下のように設定されていることを確認してください:

```python
# CORSミドルウェア設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],  # フロントエンドのURL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 環境変数

本番環境では、以下の環境変数を設定してください:

### バックエンド
- `OPENAI_API_KEY`: OpenAI APIキー
- `PDF_DIRECTORY`: PDFファイルの保存場所

### フロントエンド
- `NEXT_PUBLIC_API_URL`: バックエンドAPIのURL（例: "https://your-backend.herokuapp.com/api"）

## 本番環境での注意点

1. **パフォーマンス**: CloudflareやCloudfront等のCDNを活用してフロントエンドのパフォーマンスを向上させることを検討してください。

2. **セキュリティ**: APIキーを適切に管理し、必要に応じてAPIキーの定期的なローテーションを行ってください。

3. **ストレージ**: PDFファイルが増加することを想定し、適切なストレージソリューション（AWS S3など）への移行を検討してください。

4. **スケーリング**: トラフィックの増加に対応するため、バックエンドのスケーリングプランを検討してください。

5. **モニタリング**: Sentry、New Relic、または同様のサービスを使用してアプリケーションのパフォーマンスと可用性を監視してください。 