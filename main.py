#!/usr/bin/env python
"""
英会話学習サービスのメインエントリーポイント

直接実行すると、コマンドラインインターフェースが起動します。
"""

import sys
import os
from dotenv import load_dotenv

# .envファイルから環境変数を読み込む
load_dotenv()

# パスの設定（ソースコードへのパス追加）
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# CLIの起動
from src.english_learning_cli import main

if __name__ == "__main__":
    main() 