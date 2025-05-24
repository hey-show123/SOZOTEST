"""
英会話シナリオと学習コンテンツ管理

このモジュールでは、英会話学習シナリオや教材コンテンツを管理します。
様々なテーマやレベルに応じた会話シナリオを提供。
"""

from typing import Dict, List, Optional, Any
import json
import os


class ConversationScenario:
    """英会話学習シナリオのデータモデル"""
    
    def __init__(self,
                 scenario_id: str,
                 title: str,
                 description: str,
                 level: str,
                 theme: str,
                 example_phrases: List[Dict[str, str]],
                 key_vocabulary: List[Dict[str, str]],
                 grammar_points: List[Dict[str, str]]):
        """
        英会話シナリオの初期化
        
        Args:
            scenario_id: シナリオID
            title: シナリオタイトル
            description: シナリオの説明
            level: 難易度レベル（初級/中級/上級）
            theme: テーマ（日常会話/ビジネス/旅行など）
            example_phrases: 例文のリスト [{"en": "英語", "ja": "日本語"}]
            key_vocabulary: 重要語彙のリスト [{"term": "英単語", "definition": "意味", "example": "例文"}]
            grammar_points: 文法ポイント [{"point": "文法項目", "explanation": "説明", "example": "例文"}]
        """
        self.scenario_id = scenario_id
        self.title = title
        self.description = description
        self.level = level
        self.theme = theme
        self.example_phrases = example_phrases
        self.key_vocabulary = key_vocabulary
        self.grammar_points = grammar_points
    
    def to_dict(self) -> Dict[str, Any]:
        """シナリオをディクショナリに変換"""
        return {
            "scenario_id": self.scenario_id,
            "title": self.title,
            "description": self.description,
            "level": self.level,
            "theme": self.theme,
            "example_phrases": self.example_phrases,
            "key_vocabulary": self.key_vocabulary,
            "grammar_points": self.grammar_points
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ConversationScenario':
        """ディクショナリからシナリオを作成"""
        return cls(
            scenario_id=data["scenario_id"],
            title=data["title"],
            description=data["description"],
            level=data["level"],
            theme=data["theme"],
            example_phrases=data["example_phrases"],
            key_vocabulary=data["key_vocabulary"],
            grammar_points=data["grammar_points"]
        )


class ScenarioManager:
    """英会話シナリオの管理クラス"""
    
    def __init__(self, scenarios_dir: Optional[str] = None):
        """
        シナリオ管理クラスの初期化
        
        Args:
            scenarios_dir: シナリオファイルが格納されているディレクトリ
                           (未指定の場合はデフォルトを使用)
        """
        self.scenarios_dir = scenarios_dir or os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "data",
            "scenarios"
        )
        
        # ディレクトリが存在しない場合は作成
        os.makedirs(self.scenarios_dir, exist_ok=True)
        
        # シナリオの辞書 {scenario_id: ConversationScenario}
        self.scenarios = {}
        
        # シナリオデータの読み込み
        self._load_scenarios()
    
    def _load_scenarios(self) -> None:
        """利用可能なシナリオを読み込む"""
        scenario_files = [f for f in os.listdir(self.scenarios_dir) 
                         if f.endswith('.json')]
        
        for file_name in scenario_files:
            file_path = os.path.join(self.scenarios_dir, file_name)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    scenario_data = json.load(f)
                    scenario = ConversationScenario.from_dict(scenario_data)
                    self.scenarios[scenario.scenario_id] = scenario
            except Exception as e:
                print(f"シナリオファイルの読み込みエラー {file_name}: {str(e)}")
    
    def get_scenario(self, scenario_id: str) -> Optional[ConversationScenario]:
        """
        指定されたIDのシナリオを取得
        
        Args:
            scenario_id: シナリオID
            
        Returns:
            シナリオインスタンス (存在しない場合はNone)
        """
        return self.scenarios.get(scenario_id)
    
    def get_scenarios_by_level(self, level: str) -> List[ConversationScenario]:
        """
        指定されたレベルのシナリオをすべて取得
        
        Args:
            level: シナリオレベル（初級/中級/上級）
            
        Returns:
            指定レベルのシナリオリスト
        """
        return [s for s in self.scenarios.values() if s.level == level]
    
    def get_scenarios_by_theme(self, theme: str) -> List[ConversationScenario]:
        """
        指定されたテーマのシナリオをすべて取得
        
        Args:
            theme: シナリオテーマ
            
        Returns:
            指定テーマのシナリオリスト
        """
        return [s for s in self.scenarios.values() if s.theme == theme]
    
    def save_scenario(self, scenario: ConversationScenario) -> bool:
        """
        シナリオを保存
        
        Args:
            scenario: 保存するシナリオ
            
        Returns:
            保存成功したかどうか
        """
        try:
            # 辞書に追加
            self.scenarios[scenario.scenario_id] = scenario
            
            # ファイルに保存
            file_path = os.path.join(
                self.scenarios_dir, 
                f"{scenario.scenario_id}.json"
            )
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(scenario.to_dict(), f, ensure_ascii=False, indent=2)
            
            return True
        except Exception as e:
            print(f"シナリオ保存エラー: {str(e)}")
            return False
    
    def get_all_scenarios(self) -> List[ConversationScenario]:
        """すべてのシナリオを取得"""
        return list(self.scenarios.values())
    
    def get_available_levels(self) -> List[str]:
        """利用可能なレベルを取得"""
        return sorted(list(set(s.level for s in self.scenarios.values())))
    
    def get_available_themes(self) -> List[str]:
        """利用可能なテーマを取得"""
        return sorted(list(set(s.theme for s in self.scenarios.values())))


# サンプルシナリオの作成と保存
def create_sample_scenarios(output_dir: Optional[str] = None) -> None:
    """
    サンプル英会話シナリオを作成して保存
    
    Args:
        output_dir: 出力ディレクトリ (未指定の場合はデフォルト)
    """
    manager = ScenarioManager(output_dir)
    
    # 日常会話：カフェでの注文（初級）
    cafe_scenario = ConversationScenario(
        scenario_id="cafe_ordering",
        title="カフェでの注文",
        description="カフェで飲み物や軽食を注文する際の基本的な会話",
        level="初級",
        theme="日常会話",
        example_phrases=[
            {"en": "I'd like a cup of coffee, please.", "ja": "コーヒーを一杯ください。"},
            {"en": "Could I have a latte with soy milk?", "ja": "豆乳ラテをお願いできますか？"},
            {"en": "Do you have any recommendations?", "ja": "何かおすすめはありますか？"},
            {"en": "Is this to stay or to go?", "ja": "こちらでお召し上がりですか、お持ち帰りですか？"}
        ],
        key_vocabulary=[
            {"term": "order", "definition": "注文する", "example": "I'd like to order a sandwich."},
            {"term": "recommendation", "definition": "おすすめ", "example": "What's your recommendation?"},
            {"term": "size", "definition": "サイズ", "example": "What size would you like?"},
            {"term": "menu", "definition": "メニュー", "example": "Could I see the menu, please?"}
        ],
        grammar_points=[
            {"point": "I'd like ~ (I would like ~)", "explanation": "丁寧な注文や要望を伝える表現", "example": "I'd like a glass of water, please."},
            {"point": "Could I have ~?", "explanation": "丁寧な依頼表現", "example": "Could I have the bill, please?"},
            {"point": "Do you have ~?", "explanation": "所有や提供の有無を尋ねる表現", "example": "Do you have any vegetarian options?"}
        ]
    )
    
    # ビジネス：会議での発言（中級）
    meeting_scenario = ConversationScenario(
        scenario_id="business_meeting",
        title="ビジネス会議での発言",
        description="会議での意見交換や提案を行うための表現",
        level="中級",
        theme="ビジネス",
        example_phrases=[
            {"en": "I'd like to share my thoughts on this matter.", "ja": "この件について私の考えを共有したいと思います。"},
            {"en": "Based on our data, I believe we should focus on...", "ja": "データに基づくと、私たちは...に集中すべきだと考えます。"},
            {"en": "Could you elaborate on that point?", "ja": "その点についてもう少し詳しく説明していただけますか？"},
            {"en": "I see your point, but I have a different perspective.", "ja": "あなたの意見は理解できますが、私は異なる視点を持っています。"}
        ],
        key_vocabulary=[
            {"term": "proposal", "definition": "提案", "example": "I have a proposal for the new project."},
            {"term": "perspective", "definition": "視点、観点", "example": "From my perspective, this approach has several advantages."},
            {"term": "agenda", "definition": "議題", "example": "Let's move to the next item on our agenda."},
            {"term": "consensus", "definition": "合意", "example": "We need to reach a consensus on this issue."}
        ],
        grammar_points=[
            {"point": "I believe that ~", "explanation": "自分の意見を丁寧に述べる表現", "example": "I believe that this strategy will yield better results."},
            {"point": "Could you + verb", "explanation": "丁寧な依頼表現", "example": "Could you provide more details about the timeline?"},
            {"point": "I see your point, but ~", "explanation": "相手の意見を認めつつ異なる見解を示す表現", "example": "I see your point, but we need to consider the costs as well."}
        ]
    )
    
    # 旅行：ホテルでのチェックイン（初級）
    hotel_scenario = ConversationScenario(
        scenario_id="hotel_checkin",
        title="ホテルでのチェックイン",
        description="ホテルへのチェックインや部屋の問い合わせに関する会話",
        level="初級",
        theme="旅行",
        example_phrases=[
            {"en": "I have a reservation under the name Johnson.", "ja": "ジョンソンという名前で予約しています。"},
            {"en": "What time is check-out?", "ja": "チェックアウトは何時ですか？"},
            {"en": "Is breakfast included in the rate?", "ja": "朝食は料金に含まれていますか？"},
            {"en": "Do you have a room with a better view?", "ja": "もっと景色の良い部屋はありますか？"}
        ],
        key_vocabulary=[
            {"term": "reservation", "definition": "予約", "example": "I made a reservation online."},
            {"term": "check-in", "definition": "チェックイン", "example": "The check-in time is 3:00 PM."},
            {"term": "amenities", "definition": "アメニティ", "example": "The room comes with all standard amenities."},
            {"term": "concierge", "definition": "コンシェルジュ", "example": "You can ask the concierge for restaurant recommendations."}
        ],
        grammar_points=[
            {"point": "I have a ~ under the name", "explanation": "予約の確認表現", "example": "I have a booking under the name Smith."},
            {"point": "Is ~ included in ~?", "explanation": "包含関係を問う表現", "example": "Is Wi-Fi included in the room rate?"},
            {"point": "Do you have ~?", "explanation": "所有や利用可能性を尋ねる表現", "example": "Do you have a gym in this hotel?"}
        ]
    )
    
    # シナリオ保存
    manager.save_scenario(cafe_scenario)
    manager.save_scenario(meeting_scenario)
    manager.save_scenario(hotel_scenario)
    
    print(f"サンプルシナリオを{len(manager.get_all_scenarios())}件作成しました。") 