import logging
from typing import List, Dict, Any, Optional
from .openai_service import openai_service
from ..core.exceptions import LessonException

logger = logging.getLogger("api.lesson")


class LessonService:
    """英語レッスンのビジネスロジックを実装するサービスクラス"""
    
    def __init__(self):
        """初期化"""
        self.openai = openai_service
        # AIの役割設定
        self.system_message = {
            "role": "system",
            "content": """
            あなたは英語教師です。フレンドリーで忍耐強く、ユーザーが英語を学ぶのを手助けします。
            間違いを見つけたら優しく訂正し、正しい表現を教えてください。
            詳細な文法解説は避け、実践的な会話を重視します。
            英語学習者が自信を持って話せるよう励ましてください。
            レッスンは5つのフェーズで構成されます:
            1. 最初のあいさつ (約1分): 日本語での挨拶・説明、練習フレーズ提示
            2. フレーズ練習 (約1.5分): 発音練習、リピート、フィードバック、応用
            3. ダイアログ練習 (約3分): ロールプレイ形式の会話練習
            4. 単語練習 (約2.5分): 重要単語の発音と例文練習
            5. 質問タイム (約2分): 簡単な英語での質問と自由回答
            """
        }
    
    async def start_lesson(self, pdf_filename: Optional[str] = None) -> Dict[str, Any]:
        """レッスンを開始する"""
        try:
            # レッスン開始メッセージの生成
            messages = [
                self.system_message,
                {
                    "role": "user", 
                    "content": "レッスンを始めたいです。日本語で挨拶をして、今日学ぶフレーズの説明をしてください。"
                }
            ]
            
            # PDFファイル名が指定されている場合は内容に反映
            if pdf_filename:
                messages[1]["content"] += f" PDFファイル '{pdf_filename}' に基づいたレッスンを行います。"
            
            # OpenAI APIで応答を生成
            ai_response = await self.openai.generate_chat_response(messages)
            
            # 音声合成
            audio_base64 = await self.openai.generate_speech(ai_response, voice="nova")
            
            return {
                "message": ai_response,
                "audio": audio_base64,
                "phase": 1,  # 初期フェーズ
                "pdf": pdf_filename
            }
        
        except Exception as e:
            logger.error(f"レッスン開始エラー: {str(e)}")
            raise LessonException(f"レッスンの開始に失敗しました: {str(e)}")
    
    async def process_chat(
        self, 
        user_message: str, 
        conversation_history: List[Dict[str, str]],
        phase: int,
        audio_feedback: bool = True
    ) -> Dict[str, Any]:
        """ユーザーのメッセージを処理し、AIの応答を生成する"""
        try:
            # 会話履歴にシステムメッセージを追加
            messages = [self.system_message] + conversation_history
            
            # ユーザーメッセージを追加
            messages.append({"role": "user", "content": user_message})
            
            # フェーズに応じた指示をプロンプトに追加
            phase_instructions = self._get_phase_instructions(phase)
            if phase_instructions:
                # フェーズごとの指示を会話履歴の最後（ユーザーメッセージの前）に挿入
                messages.insert(-1, {"role": "system", "content": phase_instructions})
            
            # OpenAI APIで応答を生成
            ai_response = await self.openai.generate_chat_response(messages)
            
            result = {
                "message": ai_response,
                "phase": phase,
            }
            
            # 音声フィードバックが必要な場合は音声合成
            if audio_feedback:
                audio_base64 = await self.openai.generate_speech(ai_response, voice="nova")
                result["audio"] = audio_base64
            
            return result
        
        except Exception as e:
            logger.error(f"チャット処理エラー: {str(e)}")
            raise LessonException(f"メッセージの処理に失敗しました: {str(e)}")
    
    def _get_phase_instructions(self, phase: int) -> Optional[str]:
        """各フェーズに応じた指示を取得する"""
        phase_instructions = {
            1: """
                最初のあいさつフェーズです。日本語で親しみやすく挨拶し、今日のレッスンの内容を簡単に説明してください。
                英語の基本的なフレーズを1つ紹介し、これから練習することを伝えてください。
            """,
            2: """
                フレーズ練習フェーズです。先ほど紹介したフレーズを英語で発音し、ユーザーに繰り返してもらってください。
                発音のアドバイスがあれば優しく伝え、フレーズの応用例も紹介してください。
                ユーザーの発言に対して、間違いがあれば優しく訂正してください。
            """,
            3: """
                ダイアログ練習フェーズです。簡単な日常会話のロールプレイをリードしてください。
                カフェでの注文や道案内など、実用的な場面を想定し、ユーザーが応答しやすい質問をしてください。
                ユーザーの返答に対して自然に会話を続け、間違いがあれば優しく訂正してください。
            """,
            4: """
                単語練習フェーズです。今日のレッスンに関連する重要な単語を3〜5つ選び、一つずつ練習してください。
                各単語について、発音方法、意味、簡単な例文を提示し、ユーザーに繰り返してもらってください。
                ユーザーの発音に問題があれば優しくアドバイスしてください。
            """,
            5: """
                質問タイムフェーズです。今日学んだ内容に関連する簡単な英語の質問を2〜3つ用意し、
                ユーザーが自由に答えられるよう促してください。質問は簡単な英語で、
                Yes/Noで答えられるものから始め、徐々に自由回答を促す質問にしてください。
                最後にレッスンのまとめと励ましの言葉を日本語で伝えてください。
            """,
        }
        
        return phase_instructions.get(phase)


# シングルトンパターンでサービスを提供
lesson_service = LessonService() 