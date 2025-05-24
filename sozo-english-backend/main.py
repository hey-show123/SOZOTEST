from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from app.api.routes import router
from app.core.config import settings
from app.core.exceptions import APIErrorHandler

# FastAPIアプリケーションの作成
app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    docs_url="/docs",  # Swagger UIのURL
    redoc_url="/redoc",  # ReDocのURL
    openapi_url="/openapi.json"  # OpenAPI JSONのURL
)

# CORSミドルウェア設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# エラーハンドラーの追加
app.add_exception_handler(HTTPException, APIErrorHandler.http_exception_handler)
app.add_exception_handler(Exception, APIErrorHandler.general_exception_handler)

# ルーターのマウント
app.include_router(router, prefix="/api")

# ルートパスへのアクセス
@app.get("/")
async def root():
    """ルートパスへのアクセス用ハンドラー"""
    return {
        "message": "SOZO English Learning API サーバーが稼働中です",
        "version": settings.APP_VERSION,
        "docs": "/docs",  # Swagger UIのURL
    }

# PDFディレクトリの存在確認
if not os.path.exists(settings.PDF_DIRECTORY):
    os.makedirs(settings.PDF_DIRECTORY)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True) 