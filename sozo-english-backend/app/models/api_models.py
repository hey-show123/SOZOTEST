from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any


class ErrorResponse(BaseModel):
    """エラーレスポンスモデル"""
    detail: str = Field(..., description="エラーの詳細メッセージ")


class LessonStartRequest(BaseModel):
    """レッスン開始リクエストモデル"""
    pdf_filename: Optional[str] = Field(None, description="使用するPDFファイル名（オプション）")


class LessonStartResponse(BaseModel):
    """レッスン開始レスポンスモデル"""
    message: str = Field(..., description="AIからのレッスン開始メッセージ")
    audio: str = Field(..., description="Base64エンコードされた音声データ")
    phase: int = Field(1, description="現在のレッスンフェーズ（1-5）")
    pdf: Optional[str] = Field(None, description="使用しているPDFファイル名")


class ChatRequest(BaseModel):
    """チャットリクエストモデル"""
    message: str = Field(..., description="ユーザーからのメッセージ")
    conversation_history: List[Dict[str, str]] = Field(default_factory=list, description="会話履歴")
    phase: int = Field(..., description="現在のレッスンフェーズ（1-5）")
    audio_feedback: bool = Field(True, description="音声フィードバックを含めるかどうか")


class ChatResponse(BaseModel):
    """チャットレスポンスモデル"""
    message: str = Field(..., description="AIからの応答メッセージ")
    audio: Optional[str] = Field(None, description="Base64エンコードされた音声データ（audio_feedback=Trueの場合）")
    phase: int = Field(..., description="現在のレッスンフェーズ（1-5）")


class SpeechToTextRequest(BaseModel):
    """音声認識リクエストモデル"""
    language: str = Field("en", description="認識する言語（デフォルト: 'en'）")


class SpeechToTextResponse(BaseModel):
    """音声認識レスポンスモデル"""
    text: str = Field(..., description="認識されたテキスト")


class TextToSpeechRequest(BaseModel):
    """音声合成リクエストモデル"""
    text: str = Field(..., description="音声に合成するテキスト")
    voice: str = Field("nova", description="使用する音声（デフォルト: 'nova'）")


class TextToSpeechResponse(BaseModel):
    """音声合成レスポンスモデル"""
    audio: str = Field(..., description="Base64エンコードされた音声データ")


class PDFListResponse(BaseModel):
    """PDF一覧レスポンスモデル"""
    files: List[str] = Field(..., description="利用可能なPDFファイル名のリスト")


class PDFUploadResponse(BaseModel):
    """PDFアップロードレスポンスモデル"""
    filename: str = Field(..., description="保存されたPDFファイル名")
    message: str = Field(..., description="処理結果メッセージ")


class PDFDeleteResponse(BaseModel):
    """PDF削除レスポンスモデル"""
    filename: str = Field(..., description="削除されたPDFファイル名")
    message: str = Field(..., description="処理結果メッセージ") 