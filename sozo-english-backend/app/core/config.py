import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "SOZO English Learning API"
    APP_DESCRIPTION: str = "英語学習サービスのバックエンドAPI"
    APP_VERSION: str = "0.1.0"
    
    # CORSの設定
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",  # ローカル開発環境
        "https://sozo-english-frontend.vercel.app",  # 本番フロントエンド（例）
        "*",  # 開発中は全てのオリジンを許可（本番環境では具体的なオリジンに制限すべき）
    ]
    
    # OpenAI API設定
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o")
    OPENAI_TTS_MODEL: str = os.getenv("OPENAI_TTS_MODEL", "tts-1")
    OPENAI_WHISPER_MODEL: str = os.getenv("OPENAI_WHISPER_MODEL", "whisper-1")
    
    # PDFファイル保存ディレクトリ
    PDF_DIRECTORY: str = os.getenv("PDF_DIRECTORY", "./pdf_files")
    
    # タイムアウト設定
    API_TIMEOUT: int = 60  # 秒
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# シングルトンパターンで設定オブジェクトを提供
settings = Settings() 