"""
英会話学習サービスのテストコード

このモジュールでは、英会話学習サービスの各コンポーネントをテストします。
単体テストと統合テストを含みます。
"""

import os
import tempfile
import unittest
import json
from unittest.mock import MagicMock, patch

# テスト対象のモジュール
from src.english_learning_service.core import EnglishLearningService
from src.english_learning_service.scenarios import ConversationScenario, ScenarioManager
from src.english_learning_service.progress import LearningProgress, PerformanceAnalyzer


class TestEnglishLearningService(unittest.TestCase):
    """英会話学習サービスの基本機能テスト"""
    
    def setUp(self):
        """テスト前の準備"""
        # 環境変数のバックアップ
        self.original_api_key = os.environ.get("OPENAI_API_KEY")
        
        # テスト用のAPIキー設定
        os.environ["OPENAI_API_KEY"] = "dummy_api_key"
        
        # モックを使用してAPIクライアントをパッチ
        self.patcher = patch('src.english_learning_service.core.OpenAI')
        self.mock_openai = self.patcher.start()
        
        # モックのAPIクライアントインスタンス
        self.mock_client = MagicMock()
        self.mock_openai.return_value = self.mock_client
        
        # モックの応答を設定
        mock_completion = MagicMock()
        mock_completion.choices = [MagicMock(message=MagicMock(content="Test response"))]
        self.mock_client.chat.completions.create.return_value = mock_completion
        
        mock_audio = MagicMock()
        self.mock_client.audio.speech.create.return_value = mock_audio
        
        mock_transcription = MagicMock(text="Transcribed text")
        self.mock_client.audio.transcriptions.create.return_value = mock_transcription
        
        # テスト対象のサービスインスタンス
        self.service = EnglishLearningService()
    
    def tearDown(self):
        """テスト後のクリーンアップ"""
        # モックのパッチを元に戻す
        self.patcher.stop()
        
        # 環境変数を元に戻す
        if self.original_api_key:
            os.environ["OPENAI_API_KEY"] = self.original_api_key
        else:
            os.environ.pop("OPENAI_API_KEY", None)
    
    def test_initialization(self):
        """初期化テスト"""
        # APIキーが正しく設定されているか
        self.assertEqual(self.service.api_key, "dummy_api_key")
        
        # クライアントが初期化されているか
        self.assertIsNotNone(self.service.client)
        
        # デフォルト設定が正しいか
        self.assertEqual(self.service.current_level, "初級")
        self.assertEqual(self.service.current_theme, "日常会話")
        self.assertEqual(len(self.service.conversation_history), 0)
    
    def test_generate_response(self):
        """応答生成テスト"""
        # テスト用の入力
        user_input = "Hello, how are you?"
        
        # 応答の生成
        response = self.service.generate_response(user_input)
        
        # 期待される応答
        self.assertEqual(response, "Test response")
        
        # APIが正しく呼ばれたことを確認
        self.mock_client.chat.completions.create.assert_called_once()
        
        # 会話履歴が更新されたことを確認
        self.assertEqual(len(self.service.conversation_history), 2)  # ユーザー入力とAI応答
        self.assertEqual(self.service.conversation_history[0]["role"], "user")
        self.assertEqual(self.service.conversation_history[0]["content"], user_input)
        self.assertEqual(self.service.conversation_history[1]["role"], "assistant")
        self.assertEqual(self.service.conversation_history[1]["content"], "Test response")
    
    @patch('src.english_learning_service.core.os.path.exists', return_value=True)
    @patch('src.english_learning_service.core.open', new_callable=unittest.mock.mock_open, read_data=b'dummy audio data')
    def test_transcribe_audio(self, mock_open, mock_exists):
        """音声認識テスト"""
        # テスト用の音声ファイルパス
        audio_file = "test_audio.mp3"
        
        # 音声認識
        transcription = self.service.transcribe_audio(audio_file)
        
        # 期待される文字起こし
        self.assertEqual(transcription, "Transcribed text")
        
        # APIが正しく呼ばれたことを確認
        self.mock_client.audio.transcriptions.create.assert_called_once()
    
    @patch('src.english_learning_service.core.tempfile.NamedTemporaryFile')
    @patch('src.english_learning_service.core.subprocess.run')
    def test_text_to_speech(self, mock_run, mock_tempfile):
        """音声合成テスト"""
        # テスト用の一時ファイル
        mock_temp = MagicMock()
        mock_temp.name = "/tmp/test_audio.mp3"
        mock_tempfile.return_value.__enter__.return_value = mock_temp
        
        # 音声合成
        result = self.service.text_to_speech("Hello, this is a test.")
        
        # APIが正しく呼ばれたことを確認
        self.mock_client.audio.speech.create.assert_called_once()
        
        # 音声ファイルが再生されたことを確認
        mock_run.assert_called()
    
    def test_reset_conversation(self):
        """会話リセットテスト"""
        # 会話履歴にデータを追加
        self.service.conversation_history = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there"}
        ]
        
        # 会話をリセット
        self.service.reset_conversation()
        
        # 会話履歴が空になっていることを確認
        self.assertEqual(len(self.service.conversation_history), 0)


class TestConversationScenario(unittest.TestCase):
    """会話シナリオのテスト"""
    
    def test_scenario_creation(self):
        """シナリオ作成テスト"""
        # テスト用のシナリオデータ
        scenario = ConversationScenario(
            scenario_id="test_scenario",
            title="テストシナリオ",
            description="テスト用のシナリオです",
            level="初級",
            theme="テスト",
            example_phrases=[
                {"en": "This is a test", "ja": "これはテストです"}
            ],
            key_vocabulary=[
                {"term": "test", "definition": "テスト", "example": "This is a test"}
            ],
            grammar_points=[
                {"point": "This is ~", "explanation": "これは〜です", "example": "This is a pen"}
            ]
        )
        
        # 基本プロパティのテスト
        self.assertEqual(scenario.scenario_id, "test_scenario")
        self.assertEqual(scenario.title, "テストシナリオ")
        self.assertEqual(scenario.level, "初級")
        self.assertEqual(scenario.theme, "テスト")
        
        # コレクションのテスト
        self.assertEqual(len(scenario.example_phrases), 1)
        self.assertEqual(scenario.example_phrases[0]["en"], "This is a test")
        
        self.assertEqual(len(scenario.key_vocabulary), 1)
        self.assertEqual(scenario.key_vocabulary[0]["term"], "test")
        
        self.assertEqual(len(scenario.grammar_points), 1)
        self.assertEqual(scenario.grammar_points[0]["point"], "This is ~")
    
    def test_scenario_to_dict(self):
        """シナリオのディクショナリ変換テスト"""
        # テスト用のシナリオ
        scenario = ConversationScenario(
            scenario_id="test_scenario",
            title="テストシナリオ",
            description="テスト用のシナリオです",
            level="初級",
            theme="テスト",
            example_phrases=[
                {"en": "This is a test", "ja": "これはテストです"}
            ],
            key_vocabulary=[
                {"term": "test", "definition": "テスト", "example": "This is a test"}
            ],
            grammar_points=[
                {"point": "This is ~", "explanation": "これは〜です", "example": "This is a pen"}
            ]
        )
        
        # ディクショナリに変換
        scenario_dict = scenario.to_dict()
        
        # 期待される構造かテスト
        self.assertIsInstance(scenario_dict, dict)
        self.assertEqual(scenario_dict["scenario_id"], "test_scenario")
        self.assertEqual(scenario_dict["title"], "テストシナリオ")
        self.assertEqual(scenario_dict["level"], "初級")
        self.assertEqual(len(scenario_dict["example_phrases"]), 1)
        self.assertEqual(len(scenario_dict["key_vocabulary"]), 1)
        self.assertEqual(len(scenario_dict["grammar_points"]), 1)
    
    def test_scenario_from_dict(self):
        """ディクショナリからシナリオ作成テスト"""
        # テスト用のシナリオデータ
        scenario_data = {
            "scenario_id": "test_scenario",
            "title": "テストシナリオ",
            "description": "テスト用のシナリオです",
            "level": "初級",
            "theme": "テスト",
            "example_phrases": [
                {"en": "This is a test", "ja": "これはテストです"}
            ],
            "key_vocabulary": [
                {"term": "test", "definition": "テスト", "example": "This is a test"}
            ],
            "grammar_points": [
                {"point": "This is ~", "explanation": "これは〜です", "example": "This is a pen"}
            ]
        }
        
        # ディクショナリからシナリオを作成
        scenario = ConversationScenario.from_dict(scenario_data)
        
        # 期待されるシナリオかテスト
        self.assertEqual(scenario.scenario_id, "test_scenario")
        self.assertEqual(scenario.title, "テストシナリオ")
        self.assertEqual(scenario.level, "初級")
        self.assertEqual(scenario.theme, "テスト")
        self.assertEqual(len(scenario.example_phrases), 1)
        self.assertEqual(scenario.example_phrases[0]["en"], "This is a test")


class TestScenarioManager(unittest.TestCase):
    """シナリオマネージャーのテスト"""
    
    def setUp(self):
        """テスト前の準備"""
        # テスト用の一時ディレクトリ
        self.temp_dir = tempfile.TemporaryDirectory()
        
        # テスト用のシナリオデータ
        self.scenario1 = ConversationScenario(
            scenario_id="scenario1",
            title="シナリオ1",
            description="テスト用シナリオ1",
            level="初級",
            theme="日常会話",
            example_phrases=[{"en": "Test 1", "ja": "テスト1"}],
            key_vocabulary=[{"term": "test", "definition": "テスト", "example": "Test"}],
            grammar_points=[{"point": "Test", "explanation": "テスト", "example": "Test"}]
        )
        
        self.scenario2 = ConversationScenario(
            scenario_id="scenario2",
            title="シナリオ2",
            description="テスト用シナリオ2",
            level="中級",
            theme="ビジネス",
            example_phrases=[{"en": "Test 2", "ja": "テスト2"}],
            key_vocabulary=[{"term": "business", "definition": "ビジネス", "example": "Business"}],
            grammar_points=[{"point": "Business", "explanation": "ビジネス", "example": "Business"}]
        )
        
        # シナリオマネージャーの初期化
        self.manager = ScenarioManager(self.temp_dir.name)
        
        # 初期シナリオの保存
        self.manager.save_scenario(self.scenario1)
        self.manager.save_scenario(self.scenario2)
    
    def tearDown(self):
        """テスト後のクリーンアップ"""
        self.temp_dir.cleanup()
    
    def test_get_scenario(self):
        """シナリオ取得テスト"""
        # シナリオの取得
        scenario = self.manager.get_scenario("scenario1")
        
        # 正しいシナリオが取得できているかテスト
        self.assertIsNotNone(scenario)
        self.assertEqual(scenario.scenario_id, "scenario1")
        self.assertEqual(scenario.title, "シナリオ1")
        
        # 存在しないシナリオの場合
        nonexistent = self.manager.get_scenario("nonexistent")
        self.assertIsNone(nonexistent)
    
    def test_get_scenarios_by_level(self):
        """レベル別シナリオ取得テスト"""
        # 初級シナリオの取得
        beginner_scenarios = self.manager.get_scenarios_by_level("初級")
        
        # 正しく取得できているかテスト
        self.assertEqual(len(beginner_scenarios), 1)
        self.assertEqual(beginner_scenarios[0].scenario_id, "scenario1")
        
        # 中級シナリオの取得
        intermediate_scenarios = self.manager.get_scenarios_by_level("中級")
        self.assertEqual(len(intermediate_scenarios), 1)
        self.assertEqual(intermediate_scenarios[0].scenario_id, "scenario2")
        
        # 存在しないレベルの場合
        nonexistent_level = self.manager.get_scenarios_by_level("上級")
        self.assertEqual(len(nonexistent_level), 0)
    
    def test_get_scenarios_by_theme(self):
        """テーマ別シナリオ取得テスト"""
        # 日常会話テーマの取得
        daily_scenarios = self.manager.get_scenarios_by_theme("日常会話")
        
        # 正しく取得できているかテスト
        self.assertEqual(len(daily_scenarios), 1)
        self.assertEqual(daily_scenarios[0].scenario_id, "scenario1")
        
        # ビジネステーマの取得
        business_scenarios = self.manager.get_scenarios_by_theme("ビジネス")
        self.assertEqual(len(business_scenarios), 1)
        self.assertEqual(business_scenarios[0].scenario_id, "scenario2")
        
        # 存在しないテーマの場合
        nonexistent_theme = self.manager.get_scenarios_by_theme("旅行")
        self.assertEqual(len(nonexistent_theme), 0)
    
    def test_get_all_scenarios(self):
        """全シナリオ取得テスト"""
        # 全シナリオの取得
        all_scenarios = self.manager.get_all_scenarios()
        
        # 正しく取得できているかテスト
        self.assertEqual(len(all_scenarios), 2)
        
        # シナリオIDでソート
        all_scenarios.sort(key=lambda s: s.scenario_id)
        
        self.assertEqual(all_scenarios[0].scenario_id, "scenario1")
        self.assertEqual(all_scenarios[1].scenario_id, "scenario2")
    
    def test_save_scenario(self):
        """シナリオ保存テスト"""
        # 新しいシナリオ
        new_scenario = ConversationScenario(
            scenario_id="new_scenario",
            title="新シナリオ",
            description="新しいテスト用シナリオ",
            level="上級",
            theme="旅行",
            example_phrases=[{"en": "New test", "ja": "新テスト"}],
            key_vocabulary=[{"term": "new", "definition": "新しい", "example": "New"}],
            grammar_points=[{"point": "New", "explanation": "新しい", "example": "New"}]
        )
        
        # シナリオの保存
        result = self.manager.save_scenario(new_scenario)
        
        # 保存が成功したかテスト
        self.assertTrue(result)
        
        # 保存されたシナリオが取得できるかテスト
        saved_scenario = self.manager.get_scenario("new_scenario")
        self.assertIsNotNone(saved_scenario)
        self.assertEqual(saved_scenario.title, "新シナリオ")
        
        # ファイルが実際に作成されたかテスト
        scenario_file = os.path.join(self.temp_dir.name, "new_scenario.json")
        self.assertTrue(os.path.exists(scenario_file))


class TestLearningProgress(unittest.TestCase):
    """学習進捗管理のテスト"""
    
    def setUp(self):
        """テスト前の準備"""
        # テスト用の一時ディレクトリ
        self.temp_dir = tempfile.TemporaryDirectory()
        
        # テスト用のユーザーID
        self.user_id = "test_user"
        
        # 学習進捗インスタンス
        self.progress = LearningProgress(self.user_id, self.temp_dir.name)
    
    def tearDown(self):
        """テスト後のクリーンアップ"""
        self.temp_dir.cleanup()
    
    def test_record_session(self):
        """学習セッション記録テスト"""
        # 初期状態の確認
        self.assertEqual(self.progress.progress_data["learning_stats"]["total_sessions"], 0)
        
        # セッションの記録
        self.progress.record_session(
            scenario_id="test_scenario",
            duration_minutes=30,
            conversation_turns=20,
            accuracy_rate=0.75
        )
        
        # セッションが記録されたかテスト
        self.assertEqual(self.progress.progress_data["learning_stats"]["total_sessions"], 1)
        self.assertEqual(self.progress.progress_data["learning_stats"]["total_time_minutes"], 30)
        self.assertEqual(self.progress.progress_data["learning_stats"]["total_conversation_turns"], 20)
        
        # シナリオが完了リストに追加されたかテスト
        self.assertIn("test_scenario", self.progress.progress_data["scenarios_completed"])
        
        # セッション履歴に追加されたかテスト
        self.assertEqual(len(self.progress.progress_data["session_history"]), 1)
        session = self.progress.progress_data["session_history"][0]
        self.assertEqual(session["scenario_id"], "test_scenario")
        self.assertEqual(session["duration_minutes"], 30)
        self.assertEqual(session["accuracy_rate"], 0.75)
    
    def test_record_vocabulary_progress(self):
        """語彙学習進捗記録テスト"""
        # 初期状態の確認
        self.assertEqual(len(self.progress.progress_data["vocabulary_progress"]), 0)
        
        # 語彙学習の記録（正解）
        self.progress.record_vocabulary_progress("test", True)
        
        # 語彙が記録されたかテスト
        self.assertIn("test", self.progress.progress_data["vocabulary_progress"])
        word_progress = self.progress.progress_data["vocabulary_progress"]["test"]
        self.assertEqual(word_progress["total_count"], 1)
        self.assertEqual(word_progress["correct_count"], 1)
        
        # 学習済み単語数が更新されたかテスト
        self.assertEqual(self.progress.progress_data["learning_stats"]["vocab_learned"], 1)
        
        # 同じ単語の不正解を記録
        self.progress.record_vocabulary_progress("test", False)
        
        # 進捗が更新されたかテスト
        word_progress = self.progress.progress_data["vocabulary_progress"]["test"]
        self.assertEqual(word_progress["total_count"], 2)
        self.assertEqual(word_progress["correct_count"], 1)  # 正解回数は変わらない
    
    def test_update_level_assessment(self):
        """レベル評価更新テスト"""
        # 初期状態の確認
        self.assertEqual(self.progress.progress_data["level_assessment"]["overall"], "初級")
        
        # レベル評価の更新
        self.progress.update_level_assessment("overall", "中級")
        
        # 評価が更新されたかテスト
        self.assertEqual(self.progress.progress_data["level_assessment"]["overall"], "中級")
        
        # 無効なカテゴリの場合
        self.progress.update_level_assessment("invalid", "上級")
        
        # 既存の評価は変わっていないはず
        self.assertEqual(self.progress.progress_data["level_assessment"]["overall"], "中級")
        self.assertNotIn("invalid", self.progress.progress_data["level_assessment"])
    
    def test_get_learning_summary(self):
        """学習サマリー取得テスト"""
        # テスト用のセッション記録
        self.progress.record_session(
            scenario_id="scenario1",
            duration_minutes=20,
            conversation_turns=15,
            accuracy_rate=0.8
        )
        
        self.progress.record_session(
            scenario_id="scenario2",
            duration_minutes=30,
            conversation_turns=25,
            accuracy_rate=0.7
        )
        
        # 語彙記録
        self.progress.record_vocabulary_progress("word1", True)
        self.progress.record_vocabulary_progress("word2", False)
        
        # 強みと弱点の設定
        self.progress.update_strengths_weaknesses(
            strengths=["語彙", "リスニング"],
            weaknesses=["文法", "発音"]
        )
        
        # 学習サマリー取得
        summary = self.progress.get_learning_summary()
        
        # サマリーの内容テスト
        self.assertEqual(summary["total_sessions"], 2)
        self.assertEqual(summary["total_time_minutes"], 50)
        self.assertEqual(summary["vocab_learned"], 2)
        self.assertEqual(summary["scenarios_completed"], 2)
        self.assertEqual(summary["strengths"], ["語彙", "リスニング"])
        self.assertEqual(summary["weaknesses"], ["文法", "発音"])


class TestPerformanceAnalyzer(unittest.TestCase):
    """パフォーマンス分析のテスト"""
    
    def setUp(self):
        """テスト前の準備"""
        # テスト用の一時ディレクトリ
        self.temp_dir = tempfile.TemporaryDirectory()
        
        # テスト用のユーザーID
        self.user_id = "test_user"
        
        # 学習進捗インスタンス
        self.progress = LearningProgress(self.user_id, self.temp_dir.name)
        
        # テスト用のセッションデータ
        # 最初のセッション（1週間前）
        session1_date = "2023-05-01T10:00:00"
        session1 = {
            "date": session1_date,
            "scenario_id": "scenario1",
            "duration_minutes": 20,
            "conversation_turns": 15,
            "accuracy_rate": 0.7
        }
        
        # 2つ目のセッション（3日前）
        session2_date = "2023-05-05T14:30:00"
        session2 = {
            "date": session2_date,
            "scenario_id": "scenario2",
            "duration_minutes": 30,
            "conversation_turns": 25,
            "accuracy_rate": 0.8
        }
        
        # 最新のセッション（今日）
        session3_date = "2023-05-08T09:15:00"
        session3 = {
            "date": session3_date,
            "scenario_id": "scenario3",
            "duration_minutes": 25,
            "conversation_turns": 20,
            "accuracy_rate": 0.9
        }
        
        # セッションデータの設定
        self.progress.progress_data["session_history"] = [session1, session2, session3]
        
        # 語彙データの設定
        self.progress.progress_data["vocabulary_progress"] = {
            "word1": {"correct_count": 5, "total_count": 5, "last_practice": "2023-05-08T10:00:00"},
            "word2": {"correct_count": 3, "total_count": 5, "last_practice": "2023-05-07T15:30:00"},
            "word3": {"correct_count": 1, "total_count": 5, "last_practice": "2023-05-06T14:20:00"},
            "word4": {"correct_count": 0, "total_count": 1, "last_practice": "2023-05-08T09:45:00"}
        }
    
    def tearDown(self):
        """テスト後のクリーンアップ"""
        self.temp_dir.cleanup()
    
    def test_analyze_session_history(self):
        """セッション履歴分析テスト"""
        # セッション履歴の分析
        analysis = PerformanceAnalyzer.analyze_session_history(self.progress)
        
        # 分析結果のテスト
        self.assertAlmostEqual(analysis["average_accuracy"], 0.8, places=1)  # 平均正答率
        self.assertEqual(analysis["total_sessions"], 3)  # 総セッション数
        self.assertEqual(analysis["total_time"], 75)  # 総学習時間
        
        # トレンドは上昇傾向のはず（最新セッションの正答率が高い）
        self.assertEqual(analysis["trend"], "上昇傾向")
    
    def test_analyze_vocabulary_mastery(self):
        """語彙習得状況分析テスト"""
        # 語彙習得状況の分析
        analysis = PerformanceAnalyzer.analyze_vocabulary_mastery(self.progress)
        
        # 分析結果のテスト
        self.assertEqual(analysis["total_vocabulary"], 4)  # 総単語数
        self.assertEqual(analysis["mastered_count"], 1)  # 習得済み単語数（word1のみ）
        self.assertEqual(analysis["struggling_count"], 2)  # 苦手な単語数（word2, word3）
        self.assertEqual(analysis["learning_count"], 1)  # 学習中の単語数（word4）
        
        # 習得率は1/4 = 0.25
        self.assertAlmostEqual(analysis["mastery_rate"], 0.25, places=2)
    
    def test_generate_learning_insights(self):
        """学習洞察生成テスト"""
        # 学習洞察の生成
        insights = PerformanceAnalyzer.generate_learning_insights(self.progress)
        
        # 洞察リストが生成されたかテスト
        self.assertIsInstance(insights, list)
        self.assertTrue(len(insights) > 0)
        
        # 各洞察が文字列かテスト
        for insight in insights:
            self.assertIsInstance(insight, str)
            self.assertTrue(len(insight) > 0)


if __name__ == "__main__":
    unittest.main()