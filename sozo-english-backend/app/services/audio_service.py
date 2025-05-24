import logging
import base64
from typing import Optional
from .openai_service import openai_service
from ..core.exceptions import AudioProcessingException

logger = logging.getLogger("api.audio")


class AudioService:
    """音声処理を行うサービスクラス"""
    
    def __init__(self):
        """初期化"""
        self.openai = openai_service
    
    async def speech_to_text(self, audio_data: bytes, language: str = "en") -> str:
        """音声データをテキストに変換する"""
        try:
            # OpenAI Whisper APIで音声認識
            transcription = await self.openai.transcribe_audio(audio_data, language)
            return transcription
        except Exception as e:
            logger.error(f"音声認識エラー: {str(e)}")
            raise AudioProcessingException(f"音声認識に失敗しました: {str(e)}")
    
    async def text_to_speech(self, text: str, voice: str = "nova") -> str:
        """テキストを音声に変換し、Base64エンコードされた文字列を返す"""
        try:
            # OpenAI TTS APIで音声合成
            audio_base64 = await self.openai.generate_speech(text, voice)
            return audio_base64
        except Exception as e:
            logger.error(f"音声合成エラー: {str(e)}")
            raise AudioProcessingException(f"音声合成に失敗しました: {str(e)}")
    
    def decode_base64_audio(self, base64_audio: str) -> bytes:
        """Base64エンコードされた音声データをバイナリデータに変換する"""
        try:
            audio_bytes = base64.b64decode(base64_audio)
            return audio_bytes
        except Exception as e:
            logger.error(f"Base64デコードエラー: {str(e)}")
            raise AudioProcessingException(f"音声データのデコードに失敗しました: {str(e)}")
    
    def encode_audio_to_base64(self, audio_data: bytes) -> str:
        """音声データをBase64エンコードする"""
        try:
            base64_audio = base64.b64encode(audio_data).decode("utf-8")
            return base64_audio
        except Exception as e:
            logger.error(f"Base64エンコードエラー: {str(e)}")
            raise AudioProcessingException(f"音声データのエンコードに失敗しました: {str(e)}")


# シングルトンパターンでサービスを提供
audio_service = AudioService() 