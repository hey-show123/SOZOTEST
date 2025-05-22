# OpenAI APIを活用した英会話学習支援サービス

OpenAIのAPIを活用した英会話学習支援サービスのプロトタイプです。ChatGPT-4o、Whisper、TTSを使用して、実践的な英会話学習をサポートします。

## 機能

- AIとの自由な英会話練習
- シナリオに基づいた会話練習（カフェでの注文、ビジネス会議、ホテルチェックインなど）
- 語彙復習と強化
- 学習進捗の追跡と分析
- パーソナライズされた学習アドバイス

## セットアップ

### 必要条件

- Python 3.8以上
- OpenAI APIキー

### インストール

1. リポジトリをクローン

```bash
git clone https://github.com/yourusername/english-learning-service.git
cd english-learning-service
```

2. 必要なパッケージをインストール

```bash
pip install -r requirements.txt
```

3. OpenAI APIキーを環境変数に設定

```bash
# Linux/macOS
export OPENAI_API_KEY=your_api_key_here

# Windows
set OPENAI_API_KEY=your_api_key_here
```

## 使用方法

### コマンドラインインターフェース

コマンドラインから英会話学習サービスを起動するには：

```bash
python src/english_learning_cli.py
```

コマンドライン引数でAPIキーを指定することもできます：

```bash
python src/english_learning_cli.py --api-key your_api_key_here
```

### メイン機能

1. **自由英会話モード** - AIと自由に英会話を練習します。
2. **シナリオ練習モード** - 特定のシナリオに沿った会話練習をします。
3. **語彙復習モード** - 学習した単語を復習します。
4. **学習進捗確認** - これまでの学習状況や傾向を確認します。
5. **設定** - 学習レベルやテーマの変更、APIキー設定の確認などができます。

## テスト

テストを実行するには：

```bash
pytest tests/
```

## プロジェクト構成

```
english-learning-service/
├── src/
│   ├── english_learning_service/
│   │   ├── __init__.py
│   │   ├── core.py          # メインサービスロジック
│   │   ├── scenarios.py     # 会話シナリオ管理
│   │   ├── progress.py      # 学習進捗管理
│   │   └── data/            # シナリオデータ、進捗データ
│   └── english_learning_cli.py  # CLIインターフェース
├── tests/                   # テストコード
├── requirements.txt         # 依存パッケージ
└── README.md                # このファイル
```

## 注意事項

- このサービスはOpenAI APIを使用するため、APIキーが必要です。
- API使用には料金が発生する場合があります。詳細はOpenAIの公式サイトをご確認ください。
- このプロジェクトはプロトタイプであり、実際の使用にはさらなる改良が必要な場合があります。

## ライセンス

MITライセンス

## 謝辞

このプロジェクトはOpenAIのAPIを活用しています。 