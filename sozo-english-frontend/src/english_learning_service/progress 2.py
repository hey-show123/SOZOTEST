"""
学習進捗管理

ユーザーの学習進捗、成績、弱点などを追跡し、パーソナライズされた学習体験を提供。
"""

import json
import os
import datetime
from typing import Dict, List, Optional, Any, Tuple


class LearningProgress:
    """ユーザーの学習進捗を管理するクラス"""
    
    def __init__(self, user_id: str, progress_dir: Optional[str] = None):
        """
        学習進捗管理の初期化
        
        Args:
            user_id: ユーザーID
            progress_dir: 進捗データを保存するディレクトリ (省略時はデフォルト)
        """
        self.user_id = user_id
        self.progress_dir = progress_dir or os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "data",
            "progress"
        )
        
        # ディレクトリが存在しない場合は作成
        os.makedirs(self.progress_dir, exist_ok=True)
        
        # 進捗データのファイルパス
        self.progress_file = os.path.join(
            self.progress_dir, 
            f"progress_{user_id}.json"
        )
        
        # 進捗データの辞書
        self.progress_data = {
            "user_id": user_id,
            "scenarios_completed": [],  # 完了したシナリオID
            "vocabulary_progress": {},  # 単語学習進捗 {単語: {正解回数, 出題回数, 最終学習日}}
            "grammar_progress": {},     # 文法学習進捗 {文法ポイント: {理解度, 練習回数}}
            "session_history": [],      # セッション履歴 [{日時, シナリオID, 正答率, 会話量}]
            "strengths": [],            # 強み [カテゴリー]
            "weaknesses": [],           # 弱点 [カテゴリー]
            "level_assessment": {       # レベル評価
                "overall": "初級",
                "speaking": "初級",
                "listening": "初級",
                "vocabulary": "初級",
                "grammar": "初級"
            },
            "learning_stats": {         # 学習統計
                "total_sessions": 0,
                "total_time_minutes": 0,
                "total_conversation_turns": 0,
                "vocab_learned": 0,
                "last_session_date": None
            },
            "favorites": {              # お気に入り登録
                "scenarios": [],
                "phrases": [],
                "vocabulary": []
            }
        }
        
        # 進捗データの読み込み
        self._load_progress()
    
    def _load_progress(self) -> None:
        """進捗データを読み込む"""
        if os.path.exists(self.progress_file):
            try:
                with open(self.progress_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.progress_data.update(data)
            except Exception as e:
                print(f"進捗データの読み込みエラー: {str(e)}")
    
    def save_progress(self) -> bool:
        """
        進捗データを保存
        
        Returns:
            保存が成功したかどうか
        """
        try:
            with open(self.progress_file, 'w', encoding='utf-8') as f:
                json.dump(self.progress_data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            print(f"進捗データの保存エラー: {str(e)}")
            return False
    
    def record_session(self, 
                      scenario_id: str, 
                      duration_minutes: int, 
                      conversation_turns: int,
                      accuracy_rate: float) -> None:
        """
        学習セッションを記録
        
        Args:
            scenario_id: 学習したシナリオID
            duration_minutes: セッション時間（分）
            conversation_turns: 会話のターン数
            accuracy_rate: 正答率（0.0〜1.0）
        """
        # セッション情報
        session_info = {
            "date": datetime.datetime.now().isoformat(),
            "scenario_id": scenario_id,
            "duration_minutes": duration_minutes,
            "conversation_turns": conversation_turns,
            "accuracy_rate": accuracy_rate
        }
        
        # セッション履歴に追加
        self.progress_data["session_history"].append(session_info)
        
        # シナリオが未完了なら完了リストに追加
        if scenario_id not in self.progress_data["scenarios_completed"]:
            self.progress_data["scenarios_completed"].append(scenario_id)
        
        # 学習統計の更新
        self.progress_data["learning_stats"]["total_sessions"] += 1
        self.progress_data["learning_stats"]["total_time_minutes"] += duration_minutes
        self.progress_data["learning_stats"]["total_conversation_turns"] += conversation_turns
        self.progress_data["learning_stats"]["last_session_date"] = session_info["date"]
        
        # 変更を保存
        self.save_progress()
    
    def record_vocabulary_progress(self, 
                                  term: str, 
                                  correct: bool) -> None:
        """
        語彙学習の進捗を記録
        
        Args:
            term: 英単語
            correct: 正解したかどうか
        """
        # 単語が登録されていなければ初期化
        if term not in self.progress_data["vocabulary_progress"]:
            self.progress_data["vocabulary_progress"][term] = {
                "correct_count": 0,
                "total_count": 0,
                "last_practice": None
            }
        
        # 進捗データ更新
        vp = self.progress_data["vocabulary_progress"][term]
        vp["total_count"] += 1
        if correct:
            vp["correct_count"] += 1
        vp["last_practice"] = datetime.datetime.now().isoformat()
        
        # 学習済み単語数の更新
        self.progress_data["learning_stats"]["vocab_learned"] = len(self.progress_data["vocabulary_progress"])
        
        # 変更を保存
        self.save_progress()
    
    def update_level_assessment(self, 
                               category: str, 
                               level: str) -> None:
        """
        レベル評価を更新
        
        Args:
            category: カテゴリー (overall/speaking/listening/vocabulary/grammar)
            level: レベル (初級/中級/上級)
        """
        valid_categories = [
            "overall", "speaking", "listening", "vocabulary", "grammar"
        ]
        valid_levels = ["初級", "中級", "上級"]
        
        if category in valid_categories and level in valid_levels:
            self.progress_data["level_assessment"][category] = level
            self.save_progress()
    
    def add_to_favorites(self, 
                        item_type: str, 
                        item_id: str) -> bool:
        """
        項目をお気に入りに追加
        
        Args:
            item_type: 項目タイプ (scenarios/phrases/vocabulary)
            item_id: 項目ID
            
        Returns:
            追加が成功したかどうか
        """
        valid_types = ["scenarios", "phrases", "vocabulary"]
        
        if item_type not in valid_types:
            return False
        
        # 既にお気に入りに追加されていなければ追加
        favorites = self.progress_data["favorites"][item_type]
        if item_id not in favorites:
            favorites.append(item_id)
            self.save_progress()
        
        return True
    
    def remove_from_favorites(self, 
                             item_type: str, 
                             item_id: str) -> bool:
        """
        項目をお気に入りから削除
        
        Args:
            item_type: 項目タイプ (scenarios/phrases/vocabulary)
            item_id: 項目ID
            
        Returns:
            削除が成功したかどうか
        """
        valid_types = ["scenarios", "phrases", "vocabulary"]
        
        if item_type not in valid_types:
            return False
        
        # お気に入りから削除
        favorites = self.progress_data["favorites"][item_type]
        if item_id in favorites:
            favorites.remove(item_id)
            self.save_progress()
        
        return True
    
    def get_learning_summary(self) -> Dict[str, Any]:
        """
        学習サマリーを取得
        
        Returns:
            学習サマリー
        """
        return {
            "total_sessions": self.progress_data["learning_stats"]["total_sessions"],
            "total_time_minutes": self.progress_data["learning_stats"]["total_time_minutes"],
            "vocab_learned": self.progress_data["learning_stats"]["vocab_learned"],
            "scenarios_completed": len(self.progress_data["scenarios_completed"]),
            "current_level": self.progress_data["level_assessment"]["overall"],
            "strengths": self.progress_data["strengths"],
            "weaknesses": self.progress_data["weaknesses"]
        }
    
    def get_recommended_scenarios(self, 
                                 available_scenarios: List[str], 
                                 count: int = 3) -> List[str]:
        """
        おすすめシナリオを取得
        
        Args:
            available_scenarios: 利用可能なシナリオIDのリスト
            count: 取得する数
            
        Returns:
            おすすめシナリオIDのリスト
        """
        # まだ完了していないシナリオを優先
        not_completed = [s for s in available_scenarios 
                        if s not in self.progress_data["scenarios_completed"]]
        
        # 必要数に達しなければ完了済みシナリオも含める
        if len(not_completed) < count:
            completed = [s for s in available_scenarios 
                        if s in self.progress_data["scenarios_completed"]]
            return not_completed + completed[:count-len(not_completed)]
        
        return not_completed[:count]
    
    def get_vocabulary_for_review(self, count: int = 10) -> List[str]:
        """
        復習すべき単語を取得
        
        Args:
            count: 取得する数
            
        Returns:
            復習すべき単語のリスト
        """
        vocab_items = list(self.progress_data["vocabulary_progress"].items())
        
        # 正解率で並べ替え（低い順）
        def accuracy_rate(item):
            data = item[1]
            if data["total_count"] == 0:
                return 1.0
            return data["correct_count"] / data["total_count"]
        
        vocab_items.sort(key=accuracy_rate)
        
        # 単語のみ抽出
        return [item[0] for item in vocab_items[:count]]
    
    def update_strengths_weaknesses(self, 
                                   strengths: List[str], 
                                   weaknesses: List[str]) -> None:
        """
        強みと弱点を更新
        
        Args:
            strengths: 強みのリスト
            weaknesses: 弱点のリスト
        """
        self.progress_data["strengths"] = strengths
        self.progress_data["weaknesses"] = weaknesses
        self.save_progress()


class PerformanceAnalyzer:
    """学習パフォーマンスを分析するクラス"""
    
    @staticmethod
    def analyze_session_history(progress: LearningProgress) -> Dict[str, Any]:
        """
        セッション履歴を分析
        
        Args:
            progress: 学習進捗
            
        Returns:
            分析結果
        """
        history = progress.progress_data["session_history"]
        if not history:
            return {
                "average_accuracy": 0.0,
                "trend": "データなし",
                "total_sessions": 0,
                "total_time": 0,
                "session_frequency": "データなし"
            }
        
        # 平均正答率
        accuracy_sum = sum(session["accuracy_rate"] for session in history)
        average_accuracy = accuracy_sum / len(history)
        
        # トレンド分析（直近5セッションの平均正答率と全体の比較）
        recent_sessions = history[-5:] if len(history) >= 5 else history
        recent_accuracy = sum(s["accuracy_rate"] for s in recent_sessions) / len(recent_sessions)
        
        if recent_accuracy > average_accuracy * 1.1:
            trend = "上昇傾向"
        elif recent_accuracy < average_accuracy * 0.9:
            trend = "下降傾向"
        else:
            trend = "安定"
        
        # 総セッション数と総学習時間
        total_sessions = len(history)
        total_time = sum(session["duration_minutes"] for session in history)
        
        # セッション頻度
        if total_sessions <= 1:
            frequency = "データ不足"
        else:
            first_date = datetime.datetime.fromisoformat(history[0]["date"])
            last_date = datetime.datetime.fromisoformat(history[-1]["date"])
            days_diff = (last_date - first_date).days
            
            if days_diff == 0:
                frequency = "同日複数セッション"
            else:
                sessions_per_week = (total_sessions / days_diff) * 7
                
                if sessions_per_week >= 5:
                    frequency = "高頻度（週5回以上）"
                elif sessions_per_week >= 3:
                    frequency = "中頻度（週3-4回）"
                elif sessions_per_week >= 1:
                    frequency = "低頻度（週1-2回）"
                else:
                    frequency = "不定期（週1回未満）"
        
        return {
            "average_accuracy": average_accuracy,
            "trend": trend,
            "total_sessions": total_sessions,
            "total_time": total_time,
            "session_frequency": frequency
        }
    
    @staticmethod
    def analyze_vocabulary_mastery(progress: LearningProgress) -> Dict[str, Any]:
        """
        語彙習得状況を分析
        
        Args:
            progress: 学習進捗
            
        Returns:
            分析結果
        """
        vocab_progress = progress.progress_data["vocabulary_progress"]
        if not vocab_progress:
            return {
                "total_vocabulary": 0,
                "mastered_count": 0,
                "learning_count": 0,
                "struggling_count": 0,
                "mastery_rate": 0.0
            }
        
        total_vocab = len(vocab_progress)
        mastered = 0
        learning = 0
        struggling = 0
        
        for word_data in vocab_progress.values():
            if word_data["total_count"] < 2:
                learning += 1
            elif word_data["correct_count"] / word_data["total_count"] >= 0.8:
                mastered += 1
            else:
                struggling += 1
        
        return {
            "total_vocabulary": total_vocab,
            "mastered_count": mastered,
            "learning_count": learning,
            "struggling_count": struggling,
            "mastery_rate": mastered / total_vocab if total_vocab > 0 else 0.0
        }
    
    @staticmethod
    def generate_learning_insights(progress: LearningProgress) -> List[str]:
        """
        学習に関する洞察を生成
        
        Args:
            progress: 学習進捗
            
        Returns:
            洞察（アドバイス）のリスト
        """
        insights = []
        
        # セッション分析
        session_analysis = PerformanceAnalyzer.analyze_session_history(progress)
        vocab_analysis = PerformanceAnalyzer.analyze_vocabulary_mastery(progress)
        
        # 頻度に関する洞察
        if session_analysis["session_frequency"] in ["不定期（週1回未満）", "データ不足"]:
            insights.append(
                "学習頻度を増やしましょう。週3回以上の学習が効果的です。"
            )
        
        # トレンドに関する洞察
        if session_analysis["trend"] == "下降傾向":
            insights.append(
                "最近の正答率が下がっています。基礎に立ち返って復習してみましょう。"
            )
        elif session_analysis["trend"] == "上昇傾向":
            insights.append(
                "進歩が見られます！この調子で続けましょう。"
            )
        
        # 語彙習得に関する洞察
        if vocab_analysis["struggling_count"] > vocab_analysis["total_vocabulary"] * 0.3:
            insights.append(
                "苦手な単語が多いようです。単語カードなどを使って集中的に復習しましょう。"
            )
        
        # セッション時間に関する洞察
        avg_session_time = (
            session_analysis["total_time"] / session_analysis["total_sessions"] 
            if session_analysis["total_sessions"] > 0 else 0
        )
        
        if avg_session_time < 10:
            insights.append(
                "セッション時間が短いようです。15-20分程度のまとまった時間を確保しましょう。"
            )
        
        # 洞察がなければデフォルトのアドバイス
        if not insights:
            insights = [
                "定期的な学習を継続しましょう。",
                "新しいシナリオに挑戦して語彙を増やしましょう。",
                "会話の録音を聞き直して、発音や流暢さを確認しましょう。"
            ]
        
        return insights 