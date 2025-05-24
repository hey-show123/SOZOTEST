from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import logging

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("api")


class APIErrorHandler:
    """API全体のエラーハンドリングクラス"""
    
    @staticmethod
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        """HTTPExceptionをJSONレスポンスに変換するハンドラー"""
        logger.error(f"HTTPException: {exc.detail} (status_code={exc.status_code})")
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )
    
    @staticmethod
    async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """一般的な例外をJSONレスポンスに変換するハンドラー"""
        logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "内部サーバーエラーが発生しました。しばらく経ってからもう一度お試しください。"},
        )


class LessonException(HTTPException):
    """レッスン関連の例外"""
    def __init__(self, detail: str, status_code: int = 400):
        super().__init__(status_code=status_code, detail=detail)


class OpenAIException(HTTPException):
    """OpenAI API関連の例外"""
    def __init__(self, detail: str, status_code: int = 500):
        super().__init__(status_code=status_code, detail=detail)


class AudioProcessingException(HTTPException):
    """音声処理関連の例外"""
    def __init__(self, detail: str, status_code: int = 400):
        super().__init__(status_code=status_code, detail=detail)


class PDFException(HTTPException):
    """PDF関連の例外"""
    def __init__(self, detail: str, status_code: int = 404):
        super().__init__(status_code=status_code, detail=detail) 