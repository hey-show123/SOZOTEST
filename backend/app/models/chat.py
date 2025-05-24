from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class Message(BaseModel):
    """チャットメッセージモデル"""
    role: str = Field(..., description="メッセージの送信者のロール（'user'または'assistant'）")
    content: str = Field(..., description="メッセージの内容")


class ChatRequest(BaseModel):
    """チャットリクエストモデル"""
    user_text: str = Field(..., description="ユーザーからのテキスト入力")
    conversation_history: List[Dict[str, Any]] = Field(default_factory=list, description="これまでの会話履歴")


class ChatResponse(BaseModel):
    """チャットレスポンスモデル"""
    ai_text: str = Field(..., description="AIからのテキスト応答")
    ai_audio_url: str = Field(..., description="AIの応答音声へのURL")
    updated_conversation_history: List[Dict[str, Any]] = Field(..., description="更新された会話履歴")


class TranscriptionResponse(BaseModel):
    """音声認識結果モデル"""
    text: str = Field(..., description="音声から認識されたテキスト") 