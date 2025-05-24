import openai
import base64
import logging
from typing import List, Dict, Any, Optional
from ..core.config import settings
from ..core.exceptions import OpenAIException

logger = logging.getLogger("api.openai")


class OpenAIService:
    """OpenAI APIを利用するためのサービスクラス"""
    
    def __init__(self):
        """APIキーを設定して初期化"""
        openai.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL
        self.tts_model = settings.OPENAI_TTS_MODEL
        self.whisper_model = settings.OPENAI_WHISPER_MODEL
    
    async def generate_chat_response(
        self, 
        messages: List[Dict[str, str]], 
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        """ChatGPTを使用してテキスト応答を生成する"""
        try:
            response = await openai.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise OpenAIException(f"OpenAI APIでエラーが発生しました: {str(e)}")
    
    async def generate_speech(self, text: str, voice: str = "alloy") -> str:
        """テキストから音声を生成しBase64エンコードされた文字列を返す"""
        try:
            response = await openai.audio.speech.create(
                model=self.tts_model,
                voice=voice,
                input=text,
            )
            
            # レスポンスの音声データをBase64エンコード
            audio_data = response.content
            base64_audio = base64.b64encode(audio_data).decode("utf-8")
            return base64_audio
        except Exception as e:
            logger.error(f"TTS API error: {str(e)}")
            raise OpenAIException(f"音声合成でエラーが発生しました: {str(e)}")
    
    async def transcribe_audio(self, audio_data: bytes, language: str = "en") -> str:
        """音声データからテキストに変換する"""
        try:
            import tempfile
            
            # 一時ファイルに音声データを書き込み
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as temp_file:
                temp_file.write(audio_data)
                temp_file.flush()
                
                # WhisperモデルでSTT実行
                with open(temp_file.name, "rb") as audio_file:
                    response = await openai.audio.transcriptions.create(
                        model=self.whisper_model,
                        file=audio_file,
                        language=language,
                    )
                
            return response.text
        except Exception as e:
            logger.error(f"STT API error: {str(e)}")
            raise OpenAIException(f"音声認識でエラーが発生しました: {str(e)}")


# シングルトンパターンでサービスを提供
openai_service = OpenAIService() 