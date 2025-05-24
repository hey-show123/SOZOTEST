import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# .envファイルを読み込む
load_dotenv()

class Settings(BaseSettings):
    """アプリケーション設定"""
    # アプリケーション設定
    APP_NAME: str = "English Learning API"
    APP_DESCRIPTION: str = "English Learning Application API"
    APP_VERSION: str = "1.0.0"
    
    # API設定
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # CORSオリジン設定
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    
    # PDFファイルパス
    PDF_DIRECTORY: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "pdfs")
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# シングルトンインスタンス
settings = Settings() 