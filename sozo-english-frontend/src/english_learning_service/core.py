"""
英会話学習サービスコア

このモジュールは英会話学習サービスの主要コンポーネントを提供します。
OpenAIのAPI（ChatGPT-4o、Whisper、TTS）を活用した実践的な英会話学習をサポート。
"""

import os
import tempfile
import subprocess
import platform
from typing import Dict, List, Optional, Tuple, Union

try:
    import openai
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class EnglishLearningService:
    """英会話学習支援サービスの主要クラス"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        英会話学習サービスの初期化
        
        Args:
            api_key: OpenAI APIキー。指定がない場合は環境変数から取得
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        if not self.api_key:
            print("警告: OpenAI APIキーが設定されていません。機能が制限されます。")
            self.client = None
        else:
            if OPENAI_AVAILABLE:
                self.client = OpenAI(api_key=self.api_key)
            else:
                print("警告: openaiライブラリがインストールされていません。pip install openaiでインストールしてください。")
                self.client = None
        
        # 会話履歴の初期化
        self.conversation_history = []
        
        # 学習テーマ・レベルの設定
        self.current_level = "初級"  # 初級・中級・上級
        self.current_theme = "日常会話"  # 日常会話・ビジネス・旅行など

    def transcribe_audio(self, audio_file_path: str) -> str:
        """
        音声ファイルをテキストに変換（Whisper API使用）
        
        Args:
            audio_file_path: 音声ファイルパス
            
        Returns:
            変換されたテキスト
        """
        if not self.client:
            return "APIキーが設定されていないため、音声認識を実行できません。"
        
        try:
            with open(audio_file_path, "rb") as audio_file:
                transcription = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file
                )
            return transcription.text
        except Exception as e:
            return f"音声認識エラー: {str(e)}"

    def generate_response(self, user_input: str) -> str:
        """
        ユーザーの入力に対するAI応答を生成（ChatGPT-4o使用）
        
        Args:
            user_input: ユーザーの入力テキスト
            
        Returns:
            AI生成の応答テキスト
        """
        if not self.client:
            return "APIキーが設定されていないため、応答生成を実行できません。"
        
        # 会話履歴にユーザー入力を追加
        self.conversation_history.append({"role": "user", "content": user_input})
        
        # システムメッセージを設定
        system_message = {
            "role": "system", 
            "content": f"""あなたは英会話学習者をサポートする優秀な英語教師です。
            レベル: {self.current_level}
            テーマ: {self.current_theme}
            
            以下のガイドラインに従ってください：
            1. 簡潔で自然な英語表現を使い、{self.current_level}レベルに適した語彙と文法を使用すること
            2. 学習者の間違いを丁寧に修正し、改善点を提案すること
            3. 英語で応答しつつ、必要に応じて日本語で補足説明を加えること
            4. 対話を通じて実践的な英会話スキルを向上させるよう導くこと
            """
        }
        
        try:
            # メッセージリストの準備
            messages = [system_message] + self.conversation_history
            
            # Chat Completionリクエスト
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo-0125",
                messages=messages,
                max_tokens=500,
                temperature=0.7
            )
            
            # 応答を取得して会話履歴に追加
            ai_response = response.choices[0].message.content
            self.conversation_history.append({"role": "assistant", "content": ai_response})
            
            return ai_response
        except Exception as e:
            return f"応答生成エラー: {str(e)}"

    def text_to_speech(self, text: str, output_file: Optional[str] = None) -> Optional[str]:
        """
        テキストを音声に変換して再生（OpenAI TTS API使用）
        
        Args:
            text: 音声に変換するテキスト
            output_file: 音声ファイルの保存先（省略時は一時ファイル）
            
        Returns:
            音声ファイルのパス（エラー時はNone）
        """
        if not self.client:
            print("APIキーが設定されていないため、音声合成を実行できません。")
            return None
        
        try:
            # 出力ファイルの指定がない場合は一時ファイルを作成
            if not output_file:
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
                output_file = temp_file.name
                temp_file.close()
            
            # TTSリクエスト
            response = self.client.audio.speech.create(
                model="tts-1",
                voice="alloy",
                input=text
            )
            
            # ファイルに保存
            response.stream_to_file(output_file)
            
            # 音声ファイルを再生
            self._play_audio(output_file)
            
            return output_file
        except Exception as e:
            print(f"音声合成エラー: {str(e)}")
            return None
    
    def _play_audio(self, audio_file_path: str) -> None:
        """
        音声ファイルを再生する
        
        Args:
            audio_file_path: 再生する音声ファイルのパス
        """
        try:
            # OSによって再生コマンドを分ける
            if platform.system() == 'Darwin':  # macOS
                subprocess.run(['afplay', audio_file_path], check=True)
            elif platform.system() == 'Linux':
                subprocess.run(['aplay', audio_file_path], check=True)
            elif platform.system() == 'Windows':
                subprocess.run(['start', audio_file_path], check=True, shell=True)
            else:
                print(f"サポートされていないOS: {platform.system()}")
        except Exception as e:
            print(f"音声再生エラー: {str(e)}")
    
    def set_learning_level(self, level: str) -> None:
        """
        学習レベルを設定
        
        Args:
            level: 学習レベル（"初級"/"中級"/"上級"）
        """
        valid_levels = ["初級", "中級", "上級"]
        if level in valid_levels:
            self.current_level = level
            print(f"学習レベルを「{level}」に設定しました。")
        else:
            print(f"無効なレベルです。{valid_levels}から選択してください。")
    
    def set_learning_theme(self, theme: str) -> None:
        """
        学習テーマを設定
        
        Args:
            theme: 学習テーマ（例: "日常会話", "ビジネス", "旅行"）
        """
        self.current_theme = theme
        print(f"学習テーマを「{theme}」に設定しました。")
    
    def reset_conversation(self) -> None:
        """会話履歴をリセットする"""
        self.conversation_history = []
        print("会話履歴をリセットしました。")
    
    def get_conversation_summary(self) -> str:
        """
        会話の要約と学習ポイントを生成
        
        Returns:
            会話の要約と学習ポイント
        """
        if not self.client or not self.conversation_history:
            return "会話履歴がないか、APIキーが設定されていません。"
        
        try:
            # 要約を生成するプロンプト
            summary_prompt = f"""
            これまでの会話を分析し、以下の内容を含む学習サマリーを作成してください：
            1. 学習者の強み
            2. 改善が必要な点（発音、文法、語彙など）
            3. 実用的な学習アドバイス
            4. 次回の学習のための提案
            
            日本語で回答してください。
            """
            
            # 会話履歴とサマリープロンプトを結合
            messages = [
                {"role": "system", "content": "あなたは英語学習の専門家です。"},
                *self.conversation_history,
                {"role": "user", "content": summary_prompt}
            ]
            
            # 要約を生成
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                max_tokens=800,
                temperature=0.7
            )
            
            return response.choices[0].message.content
        except Exception as e:
            return f"要約生成エラー: {str(e)}" 