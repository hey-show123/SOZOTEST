import os
import tempfile
import base64
from typing import Tuple, List, Dict, Any, Optional
from openai import AsyncOpenAI
from openai.types.audio import Transcription
from openai.types.chat import ChatCompletionMessage
import logging
from ..core.config import settings
from ..core.exceptions import OpenAIServiceError, AudioProcessingError

# ロガーの設定
logger = logging.getLogger(__name__)

class OpenAIService:
    """OpenAI APIを利用したサービスクラス"""
    
    def __init__(self):
        """初期化"""
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4-1106-preview"  # 適切なモデルを選択
        self.voice_model = "tts-1"
        self.voice = "alloy"  # デフォルトの音声
    
    async def generate_initial_greeting(self) -> Tuple[str, str]:
        """初期挨拶を生成"""
        system_prompt = """
        あなたは英会話の講師です。英会話を学ぶ日本人に対して、自然な英語で会話レッスンを提供します。
        初めての挨拶をして、どのような英会話の練習をしたいか尋ねてください。
        親しみやすく、励ましながら対応してください。
        """
        
        try:
            # テキスト生成
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "レッスンを始めてください。"}
            ]
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=150
            )
            
            ai_text = response.choices[0].message.content
            
            # 音声合成
            audio_url = await self._generate_speech(ai_text)
            
            return ai_text, audio_url
            
        except Exception as e:
            logger.error(f"初期挨拶生成エラー: {str(e)}", exc_info=True)
            raise OpenAIServiceError(f"AIによる挨拶生成に失敗しました: {str(e)}")
    
    async def generate_response(
        self, user_text: str, conversation_history: List[Dict[str, Any]]
    ) -> Tuple[str, str, List[Dict[str, Any]]]:
        """ユーザー入力に対する応答を生成"""
        system_prompt = """
        あなたは英会話の講師です。英会話を学ぶ日本人に対して、自然な英語で会話レッスンを提供します。
        ユーザーの英語の間違いを適切に修正し、より自然な表現を提案してください。
        親しみやすく、励ましながらも正確なフィードバックを提供してください。
        """
        
        try:
            # 会話履歴をOpenAI形式に変換
            messages = [{"role": "system", "content": system_prompt}]
            
            for msg in conversation_history:
                role = "assistant" if msg.get("is_ai", False) else "user"
                messages.append({"role": role, "content": msg.get("text", "")})
            
            # 新しいユーザーメッセージを追加
            messages.append({"role": "user", "content": user_text})
            
            # チャット完了リクエスト
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=300
            )
            
            ai_text = response.choices[0].message.content
            
            # 音声合成
            audio_url = await self._generate_speech(ai_text)
            
            # 会話履歴を更新
            updated_history = conversation_history.copy()
            updated_history.append({"text": user_text, "is_ai": False})
            updated_history.append({"text": ai_text, "is_ai": True})
            
            return ai_text, audio_url, updated_history
            
        except Exception as e:
            logger.error(f"応答生成エラー: {str(e)}", exc_info=True)
            raise OpenAIServiceError(f"AIによる応答生成に失敗しました: {str(e)}")
    
    async def transcribe_audio(self, audio_data: bytes) -> str:
        """音声データをテキストに変換"""
        if not audio_data:
            raise AudioProcessingError("音声データが空です")
            
        # 一時ファイルを作成して音声データを書き込む
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name
        
        try:
            with open(temp_file_path, "rb") as audio_file:
                # Whisper APIを使用して音声認識
                transcript = await self.client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-1",
                    language="en"
                )
            return transcript.text
        except Exception as e:
            logger.error(f"音声認識エラー: {str(e)}", exc_info=True)
            raise AudioProcessingError(f"音声認識に失敗しました: {str(e)}")
        finally:
            # 一時ファイルを削除
            try:
                os.unlink(temp_file_path)
            except Exception as e:
                logger.warning(f"一時ファイル削除エラー: {str(e)}")
    
    async def _generate_speech(self, text: str) -> str:
        """テキストから音声を生成しBase64エンコードして返す"""
        try:
            response = await self.client.audio.speech.create(
                model=self.voice_model,
                voice=self.voice,
                input=text
            )
            
            # 音声データをBase64エンコード
            audio_data = await response.read()
            audio_base64 = base64.b64encode(audio_data).decode("utf-8")
            
            # レスポンスにはdata:audio/mpegなどのプレフィックスを含む
            return f"data:audio/mpeg;base64,{audio_base64}"
        except Exception as e:
            logger.error(f"音声合成エラー: {str(e)}", exc_info=True)
            raise OpenAIServiceError(f"音声合成に失敗しました: {str(e)}") 