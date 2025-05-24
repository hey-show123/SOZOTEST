from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime


class PDFMetadata(BaseModel):
    """PDFファイルのメタデータモデル"""
    filename: str = Field(..., description="PDFファイル名")
    title: str = Field(..., description="PDFのタイトル")
    description: Optional[str] = Field(None, description="PDFの説明")
    lesson_id: Optional[str] = Field(None, description="関連するレッスンID")
    tags: List[str] = Field(default_factory=list, description="タグリスト")
    uploaded_at: datetime = Field(default_factory=datetime.now, description="アップロード日時")
    size_bytes: int = Field(..., description="ファイルサイズ（バイト）")


class PDFUploadResponse(BaseModel):
    """PDFアップロードレスポンスモデル"""
    success: bool = Field(..., description="アップロード成功したかどうか")
    filename: str = Field(..., description="保存されたファイル名")
    metadata: PDFMetadata = Field(..., description="PDFのメタデータ")


class PDFListItem(BaseModel):
    """PDFリスト項目モデル"""
    filename: str = Field(..., description="PDFファイル名")
    title: str = Field(..., description="PDFのタイトル")
    description: Optional[str] = Field(None, description="PDFの説明")
    lesson_id: Optional[str] = Field(None, description="関連するレッスンID")
    tags: List[str] = Field(default_factory=list, description="タグリスト")
    uploaded_at: datetime = Field(..., description="アップロード日時")
    size_bytes: int = Field(..., description="ファイルサイズ（バイト）")
    url: str = Field(..., description="PDFのURL") 