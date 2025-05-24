from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
import logging

# ロガーの設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AppException(HTTPException):
    """アプリケーション共通の例外クラス"""
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str = None,
        headers: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code


class APIErrorHandler:
    """APIエラーハンドラー"""
    
    @staticmethod
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        """HTTPException をハンドリング"""
        
        # エラーログ出力
        logger.error(f"HTTPException: {exc.status_code} - {exc.detail}")
        
        # エラーレスポンス作成
        error_response = {
            "status": "error",
            "status_code": exc.status_code,
            "message": exc.detail,
        }
        
        # AppExceptionの場合はエラーコードも追加
        if isinstance(exc, AppException) and exc.error_code:
            error_response["error_code"] = exc.error_code
            
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response,
        )
    
    @staticmethod
    async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """一般的な例外をハンドリング"""
        
        # エラーログ出力
        logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
        
        # エラーレスポンス作成
        error_response = {
            "status": "error",
            "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "message": "内部サーバーエラーが発生しました。",
        }
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_response,
        )


# 具体的なエラーの定義

class OpenAIServiceError(AppException):
    """OpenAI API 関連のエラー"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
            error_code="openai_service_error"
        )


class AudioProcessingError(AppException):
    """音声処理関連のエラー"""
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="audio_processing_error"
        )


class ResourceNotFoundError(AppException):
    """リソースが見つからないエラー"""
    def __init__(self, resource_name: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource_name}が見つかりません。",
            error_code="resource_not_found"
        ) 