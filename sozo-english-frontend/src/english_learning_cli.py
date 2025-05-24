"""
英会話学習サービスのコマンドラインインターフェース

このモジュールでは、英会話学習サービスをコマンドラインから利用するための
インターフェースを提供します。
"""

import os
import sys
import argparse
import time
import random
import tempfile
from typing import Optional, List, Dict, Any

# 内部モジュールのインポート
from src.english_learning_service.core import EnglishLearningService
from src.english_learning_service.scenarios import ScenarioManager, create_sample_scenarios
from src.english_learning_service.progress import LearningProgress, PerformanceAnalyzer


class EnglishLearningCLI:
    """英会話学習サービスのCLIクラス"""
    
    def __init__(self):
        """CLIの初期化"""
        # 学習サービスの初期化（APIキーは環境変数から取得）
        self.service = EnglishLearningService()
        
        # シナリオマネージャーの初期化
        self.scenario_manager = ScenarioManager()
        
        # サンプルデータディレクトリの作成
        data_dir = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "english_learning_service",
            "data"
        )
        os.makedirs(data_dir, exist_ok=True)
        
        # サンプルシナリオの作成（シナリオがない場合）
        scenarios_dir = os.path.join(data_dir, "scenarios")
        if not os.path.exists(scenarios_dir) or not os.listdir(scenarios_dir):
            os.makedirs(scenarios_dir, exist_ok=True)
            create_sample_scenarios(scenarios_dir)
        
        # ユーザーID（テスト用）
        self.user_id = "test_user"
        
        # 学習進捗の初期化
        progress_dir = os.path.join(data_dir, "progress")
        os.makedirs(progress_dir, exist_ok=True)
        self.progress = LearningProgress(self.user_id, progress_dir)

    def start(self):
        """CLIの起動"""
        self._print_welcome()
        
        while True:
            self._print_main_menu()
            choice = input("選択してください (1-6): ").strip()
            
            if choice == "1":
                self._start_conversation()
            elif choice == "2":
                self._practice_scenario()
            elif choice == "3":
                self._review_vocabulary()
            elif choice == "4":
                self._show_progress()
            elif choice == "5":
                self._settings()
            elif choice == "6" or choice.lower() == "q":
                print("\nご利用ありがとうございました。また学習しましょう！")
                break
            else:
                print("\n無効な選択です。もう一度お試しください。")

    def _print_welcome(self):
        """ウェルカムメッセージを表示"""
        print("\n" + "=" * 60)
        print("              美容院英会話学習サービス")
        print("=" * 60)
        print("\nOpenAIのAPIを活用した美容院での英会話学習支援へようこそ！")
        
        if not self.service.client:
            print("\n⚠️ 警告: OpenAI APIキーが設定されていません。")
            print("機能が制限されます。詳細はヘルプをご覧ください。")
        
        print("\nこのサービスでは以下の機能を提供しています：")
        print("- 美容院での英会話シナリオ練習")
        print("- 美容院での状況別会話練習")
        print("- 美容院で使える語彙の復習と強化")
        print("- 学習進捗の追跡")
        print()
    
    def _print_main_menu(self):
        """メインメニューを表示"""
        print("\n" + "-" * 40)
        print("メインメニュー")
        print("-" * 40)
        print("1. 美容院シナリオ（AIとの会話練習）")
        print("2. シナリオ練習（状況別会話練習）")
        print("3. 語彙復習（単語と表現の練習）")
        print("4. 学習進捗の確認")
        print("5. 設定")
        print("6. 終了")
        print("-" * 40)
    
    def _start_conversation(self):
        """美容院シナリオの英会話モードを開始"""
        print("\n" + "-" * 40)
        print("美容院シナリオ英会話モード")
        print("-" * 40)
        
        if not self.service.client:
            print("⚠️ この機能にはOpenAI APIキーが必要です。")
            print("APIキーを設定してから再度お試しください。")
            input("メインメニューに戻るには Enter キーを押してください...")
            return
        
        print("美容院のシナリオで英会話を練習しましょう！")
        print("あなたは美容院のスタッフ役です。AIは美容院の客役です。")
        print("会話を終了するには 'quit' または 'exit' と入力してください。")
        print()
        
        # 会話をリセット
        self.service.reset_conversation()
        
        # 美容院シナリオの設定
        self.service.set_learning_theme("美容院")
        
        # 会話開始メッセージ
        greeting = "Hello! I'd like to make an appointment for a haircut. Do you have any availability this afternoon?"
        print(f"AI (お客様): {greeting}")
        self.service.text_to_speech(greeting)
        
        # 会話のターン数と開始時間を記録
        conversation_turns = 1  # AIの最初の挨拶
        start_time = time.time()
        
        # システムプロンプトを設定
        system_prompt = """
あなたは英語を話す外国人のお客様です。
これから美容院のスタッフ（ユーザー）と、英会話講座「Lesson 29」の復習を行います。

【講座テーマ】
- サービスの提案（特にトリートメントの勧め）
- 今日のフレーズ：「Would you like to do a treatment as well?（トリートメントもされたいですか？）」
- 重要語彙：「haircut（カット）」「treatment（トリートメント）」「damage（ダメージ）」「feels~（～と感じる）」「style（スタイル）」「frizzy（広がる）」「straight perm（ストレートパーマ）」

【会話の流れ・誘導例】
1. スタッフが「What would you like to do today?」などでメニューを尋ねる
2. お客様（あなた）が「A haircut please, my hair feels damaged.」や「My hair is frizzy.」など、髪の悩みや状態を伝える
3. スタッフが「Would you like to do a treatment as well?」や「If you feel your hair is damaged, I recommend a treatment.」など、講座のフレーズや語彙を使って提案する
4. お客様（あなた）が「Sure.」や「That sounds good.」などと答える

【ルール】
- 必ずLesson 29の内容に沿ったやりとりのみを行う
- あなた（AI）は、髪のダメージや広がり、スタイルの悩みなどを自然に伝え、スタッフ（ユーザー）が「treatment」や「Would you like to do a treatment as well?」などのフレーズを使わざるを得ない流れに誘導する
- 会話の中で「haircut」「treatment」「damage」「feels~」「frizzy」「style」「straight perm」などの語彙が自然に出てくるようにする
- スタッフ（ユーザー）が講座のフレーズや語彙を使った場合は、さりげなく肯定的な反応や簡単なフィードバックを与える
- 会話は短く、講座の復習に集中する
- 難しい表現や脱線は避ける

【日本語補足】
- 会話は英語で行い、必要に応じて簡単な日本語の補足説明を加えてもよい

あなたはこのルールに従い、Lesson 29の復習会話の「お客様」役を演じてください。
"""
        
        # 会話履歴にシステムプロンプトを追加
        self.service.conversation_history = [
            {"role": "system", "content": system_prompt}
        ]
        
        while True:
            # ユーザー入力
            user_input = input("あなた (スタッフ): ").strip()
            
            if user_input.lower() in ["quit", "exit", "終了"]:
                break
            
            # AI応答を生成
            ai_response = self.service.generate_response(user_input)
            conversation_turns += 2  # ユーザー入力 + AI応答
            
            # 応答を表示と読み上げ
            print(f"AI (お客様): {ai_response}")
            self.service.text_to_speech(ai_response)
        
        # 会話の所要時間を計算（分単位）
        duration_minutes = (time.time() - start_time) / 60
        
        # 会話セッションを記録
        self.progress.record_session(
            scenario_id="beauty_salon_conversation",
            duration_minutes=int(duration_minutes),
            conversation_turns=conversation_turns,
            accuracy_rate=0.8  # 自由会話では仮の正答率を使用
        )
        
        print("\n会話を終了しました。")
        print(f"セッション時間: 約{int(duration_minutes)}分")
        print(f"会話ターン数: {conversation_turns}")
        
        input("メインメニューに戻るには Enter キーを押してください...")
    
    def _practice_scenario(self):
        """シナリオ練習モードを開始"""
        print("\n" + "-" * 40)
        print("シナリオ練習モード")
        print("-" * 40)
        
        if not self.service.client:
            print("⚠️ この機能にはOpenAI APIキーが必要です。")
            print("APIキーを設定してから再度お試しください。")
            input("メインメニューに戻るには Enter キーを押してください...")
            return
        
        # 利用可能なシナリオ一覧を表示
        print("利用可能なシナリオ:")
        
        scenarios = self.scenario_manager.get_all_scenarios()
        if not scenarios:
            print("シナリオが見つかりませんでした。")
            input("メインメニューに戻るには Enter キーを押してください...")
            return
        
        for i, scenario in enumerate(scenarios, 1):
            print(f"{i}. {scenario.title} ({scenario.level}) - {scenario.theme}")
        
        print("\n0. メインメニューに戻る")
        
        # シナリオ選択
        while True:
            choice = input("\nシナリオを選択してください (0-{}): ".format(len(scenarios))).strip()
            
            if choice == "0":
                return
            
            try:
                scenario_index = int(choice) - 1
                if 0 <= scenario_index < len(scenarios):
                    selected_scenario = scenarios[scenario_index]
                    break
                else:
                    print("無効な選択です。もう一度お試しください。")
            except ValueError:
                print("数字を入力してください。")
        
        # 選択したシナリオで練習を開始
        print(f"\n「{selected_scenario.title}」のシナリオ練習を開始します。")
        print(f"説明: {selected_scenario.description}")
        print("\n例文:")
        for phrase in selected_scenario.example_phrases[:3]:  # 最初の3つだけ表示
            print(f"- {phrase['en']} ({phrase['ja']})")
        
        print("\n会話を始めましょう！")
        print("会話を終了するには 'quit' または 'exit' と入力してください。")
        
        # AIの役割の説明
        if selected_scenario.theme == "日常会話":
            ai_role = "店員/スタッフ"
        elif selected_scenario.theme == "ビジネス":
            ai_role = "同僚/上司"
        elif selected_scenario.theme == "旅行":
            ai_role = "現地スタッフ"
        else:
            ai_role = "会話パートナー"
        
        # シナリオ開始メッセージ
        self.service.reset_conversation()
        
        scenario_prompt = f"""
        これからシミュレーションを始めます。あなたは{ai_role}として振る舞ってください。
        テーマ: {selected_scenario.title}
        状況: {selected_scenario.description}
        あなたは初めに状況に合った自然な英語で会話を始めてください。
        ユーザーの英語力は{selected_scenario.level}レベルです。
        """
        
        # AIに役割と状況を設定（ユーザーには見せない）
        hidden_response = self.service.generate_response(scenario_prompt)
        
        # AIからの最初の発話
        opening_message = self.service.generate_response("Let's start the conversation. Please say something to begin.")
        print(f"AI ({ai_role}): {opening_message}")
        self.service.text_to_speech(opening_message)
        
        # 会話のターン数と開始時間を記録
        conversation_turns = 2  # 内部のプロンプト + 最初の挨拶
        start_time = time.time()
        correct_phrases = 0
        total_phrases = 0
        
        while True:
            # ユーザー入力
            user_input = input("あなた: ").strip()
            
            if user_input.lower() in ["quit", "exit", "終了"]:
                break
            
            # 簡易的な正誤判定（シナリオの例文に部分一致するか）
            total_phrases += 1
            for phrase in selected_scenario.example_phrases:
                if any(word in user_input.lower() for word in phrase["en"].lower().split() if len(word) > 3):
                    correct_phrases += 1
                    break
            
            # AI応答を生成
            ai_response = self.service.generate_response(user_input)
            conversation_turns += 2  # ユーザー入力 + AI応答
            
            # 応答を表示と読み上げ
            print(f"AI ({ai_role}): {ai_response}")
            self.service.text_to_speech(ai_response)
        
        # 会話の所要時間を計算（分単位）
        duration_minutes = (time.time() - start_time) / 60
        
        # 正答率の計算（例文の使用率から簡易計算）
        accuracy_rate = correct_phrases / max(total_phrases, 1)
        
        # 会話セッションを記録
        self.progress.record_session(
            scenario_id=selected_scenario.scenario_id,
            duration_minutes=int(duration_minutes),
            conversation_turns=conversation_turns,
            accuracy_rate=accuracy_rate
        )
        
        # 単語進捗を記録
        for vocab in selected_scenario.key_vocabulary:
            # ランダムに正誤を設定（実際は学習者の応答から判断すべき）
            is_correct = random.random() > 0.3
            self.progress.record_vocabulary_progress(vocab["term"], is_correct)
        
        print("\n会話を終了しました。")
        print(f"セッション時間: 約{int(duration_minutes)}分")
        print(f"会話ターン数: {conversation_turns}")
        
        # 簡易的なフィードバック
        print("\n【セッションフィードバック】")
        print(f"使用例文: {correct_phrases}/{total_phrases}")
        
        # 正答率によるコメント
        if accuracy_rate >= 0.8:
            feedback = "素晴らしい！シナリオに沿った適切な表現を使うことができています。"
        elif accuracy_rate >= 0.5:
            feedback = "良い調子です。もう少しシナリオの例文を意識してみましょう。"
        else:
            feedback = "シナリオの例文をもっと活用してみましょう。"
        
        print(feedback)
        
        # 語彙確認
        print("\n【重要語彙の確認】")
        for i, vocab in enumerate(selected_scenario.key_vocabulary[:3], 1):
            print(f"{i}. {vocab['term']} - {vocab['definition']}")
            print(f"   例: {vocab['example']}")
        
        input("\nメインメニューに戻るには Enter キーを押してください...")
    
    def _review_vocabulary(self):
        """語彙復習モードを開始"""
        print("\n" + "-" * 40)
        print("語彙復習モード")
        print("-" * 40)
        
        # 復習対象の単語を取得
        vocab_to_review = self.progress.get_vocabulary_for_review(10)
        
        if not vocab_to_review:
            # 語彙がなければ、シナリオから単語を集める
            scenarios = self.scenario_manager.get_all_scenarios()
            for scenario in scenarios:
                for vocab in scenario.key_vocabulary:
                    vocab_to_review.append(vocab["term"])
                    if len(vocab_to_review) >= 10:
                        break
                if len(vocab_to_review) >= 10:
                    break
        
        if not vocab_to_review:
            print("復習する語彙が見つかりませんでした。")
            print("シナリオ練習を行って単語を増やしてください。")
            input("メインメニューに戻るには Enter キーを押してください...")
            return
        
        print("今日の復習語彙：")
        
        # 各単語の復習
        correct_count = 0
        for i, term in enumerate(vocab_to_review, 1):
            print(f"\n【単語 {i}/{len(vocab_to_review)}】")
            print(f"単語: {term}")
            
            # 単語の意味を入力してもらう（実際のアプリでは単語帳から取得）
            input("意味を思い出してから Enter キーを押してください...")
            
            # 単語の意味を表示（ダミーデータを使用）
            for scenario in self.scenario_manager.get_all_scenarios():
                for vocab in scenario.key_vocabulary:
                    if vocab["term"].lower() == term.lower():
                        print(f"意味: {vocab['definition']}")
                        print(f"例文: {vocab['example']}")
                        break
            
            # 正解かどうかの確認
            while True:
                answer = input("正解でしたか？ (y/n): ").strip().lower()
                if answer in ["y", "yes", "はい"]:
                    correct = True
                    correct_count += 1
                    break
                elif answer in ["n", "no", "いいえ"]:
                    correct = False
                    break
                else:
                    print("y または n で回答してください。")
            
            # 進捗を記録
            self.progress.record_vocabulary_progress(term, correct)
        
        # 復習結果の表示
        print("\n語彙復習が終了しました。")
        print(f"正解率: {correct_count}/{len(vocab_to_review)} ({int(correct_count/len(vocab_to_review)*100)}%)")
        
        if self.service.client:
            # AIからのアドバイス
            advice_prompt = f"""
            英語学習者が{len(vocab_to_review)}個の単語を復習し、{correct_count}個正解しました。
            この結果に基づいた効果的な単語学習のアドバイスを一つ、簡潔に日本語で提供してください。
            """
            advice = self.service.generate_response(advice_prompt)
            print("\n【AIからのアドバイス】")
            print(advice)
        
        input("\nメインメニューに戻るには Enter キーを押してください...")
    
    def _show_progress(self):
        """学習進捗を表示"""
        print("\n" + "-" * 40)
        print("学習進捗")
        print("-" * 40)
        
        # 進捗サマリー
        summary = self.progress.get_learning_summary()
        print(f"総セッション数: {summary['total_sessions']}")
        print(f"総学習時間: {summary['total_time_minutes']}分")
        print(f"学習済み単語数: {summary['vocab_learned']}")
        print(f"完了シナリオ数: {summary['scenarios_completed']}")
        print(f"現在のレベル: {summary['current_level']}")
        
        # パフォーマンス分析
        if summary['total_sessions'] > 0:
            print("\n【学習傾向分析】")
            performance = PerformanceAnalyzer.analyze_session_history(self.progress)
            
            print(f"平均正答率: {int(performance['average_accuracy']*100)}%")
            print(f"学習トレンド: {performance['trend']}")
            print(f"学習頻度: {performance['session_frequency']}")
            
            # 語彙習得分析
            vocab_analysis = PerformanceAnalyzer.analyze_vocabulary_mastery(self.progress)
            if vocab_analysis['total_vocabulary'] > 0:
                print("\n【語彙習得状況】")
                print(f"習得済み: {vocab_analysis['mastered_count']}語")
                print(f"学習中: {vocab_analysis['learning_count']}語")
                print(f"苦手: {vocab_analysis['struggling_count']}語")
                print(f"習得率: {int(vocab_analysis['mastery_rate']*100)}%")
        
        # AIによる洞察
        if self.service.client and summary['total_sessions'] > 0:
            insights = PerformanceAnalyzer.generate_learning_insights(self.progress)
            print("\n【学習アドバイス】")
            for i, insight in enumerate(insights, 1):
                print(f"{i}. {insight}")
        
        input("\nメインメニューに戻るには Enter キーを押してください...")
    
    def _settings(self):
        """設定メニュー"""
        print("\n" + "-" * 40)
        print("設定")
        print("-" * 40)
        print("1. 学習レベルの変更")
        print("2. 学習テーマの変更")
        print("3. APIキー設定の確認")
        print("4. ヘルプ")
        print("0. メインメニューに戻る")
        
        choice = input("選択してください (0-4): ").strip()
        
        if choice == "1":
            self._change_level()
        elif choice == "2":
            self._change_theme()
        elif choice == "3":
            self._check_api_key()
        elif choice == "4":
            self._show_help()
        elif choice == "0":
            return
        else:
            print("無効な選択です。")
    
    def _change_level(self):
        """学習レベルの変更"""
        print("\n" + "-" * 40)
        print("学習レベルの変更")
        print("-" * 40)
        print("1. 初級 - 基本的な日常会話（現在のレベル: {})".format(
            self.service.current_level))
        print("2. 中級 - 幅広い話題での会話")
        print("3. 上級 - 複雑な話題や専門的な内容")
        
        choice = input("選択してください (1-3): ").strip()
        
        if choice == "1":
            level = "初級"
        elif choice == "2":
            level = "中級"
        elif choice == "3":
            level = "上級"
        else:
            print("無効な選択です。")
            return
        
        self.service.current_level = level
        self.progress.update_level_assessment("overall", level)
        print(f"学習レベルを「{level}」に設定しました。")
    
    def _change_theme(self):
        """学習テーマの変更"""
        print("\n" + "-" * 40)
        print("学習テーマの変更")
        print("-" * 40)
        print("1. 日常会話 - 買い物、レストラン、挨拶など")
        print("2. ビジネス - 会議、プレゼン、メールなど")
        print("3. 旅行 - ホテル、観光、交通など")
        
        choice = input("選択してください (1-3): ").strip()
        
        if choice == "1":
            theme = "日常会話"
        elif choice == "2":
            theme = "ビジネス"
        elif choice == "3":
            theme = "旅行"
        else:
            print("無効な選択です。")
            return
        
        self.service.current_theme = theme
        print(f"学習テーマを「{theme}」に設定しました。")
    
    def _check_api_key(self):
        """APIキー設定の確認"""
        print("\n" + "-" * 40)
        print("APIキー設定の確認")
        print("-" * 40)
        
        if self.service.api_key:
            print("✅ OpenAI APIキーが設定されています。")
            print("全ての機能が利用可能です。")
        else:
            print("❌ OpenAI APIキーが設定されていません。")
            print("一部の機能が制限されています。")
            print("\nAPIキーを設定するには：")
            print("1. 環境変数 OPENAI_API_KEY にAPIキーを設定します。")
            print("   例: export OPENAI_API_KEY=sk-your-key-here")
            print("2. アプリケーションを再起動します。")
        
        input("\n設定メニューに戻るには Enter キーを押してください...")
    
    def _show_help(self):
        """ヘルプを表示"""
        print("\n" + "-" * 40)
        print("ヘルプ")
        print("-" * 40)
        print("英会話学習サービスの使い方")
        print("\n【機能説明】")
        print("1. 自由英会話 - AIと自由に英会話を練習できます。")
        print("2. シナリオ練習 - 特定のシナリオに沿った会話練習ができます。")
        print("3. 語彙復習 - 学習した単語の復習ができます。")
        print("4. 学習進捗 - これまでの学習状況を確認できます。")
        print("5. 設定 - 学習レベルやテーマの変更ができます。")
        
        print("\n【APIキーについて】")
        print("このアプリケーションはOpenAIのAPIを使用しています。")
        print("APIキーを設定することで、全ての機能が利用可能になります。")
        print("APIキーの取得方法: https://platform.openai.com/")
        
        input("\n設定メニューに戻るには Enter キーを押してください...")


def main():
    """メイン関数"""
    parser = argparse.ArgumentParser(description="英会話学習サービスCLI")
    parser.add_argument("--api-key", help="OpenAI APIキー")
    args = parser.parse_args()
    
    # APIキーが指定されていれば環境変数に設定
    if args.api_key:
        os.environ["OPENAI_API_KEY"] = args.api_key
    
    try:
        # CLIの初期化と起動
        cli = EnglishLearningCLI()
        cli.start()
    except KeyboardInterrupt:
        print("\n\nプログラムが中断されました。")
        sys.exit(0)
    except Exception as e:
        print(f"\nエラーが発生しました: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main() 