import os
from typing import Optional
from dotenv import load_dotenv

def load_env_variable(key: str, default: Optional[str] = None) -> str:
    """
    環境変数を安全に読み込む関数
    
    Args:
        key (str): 環境変数のキー
        default (Optional[str]): 環境変数が存在しない場合のデフォルト値
    
    Returns:
        str: 環境変数の値
    
    Raises:
        ValueError: 環境変数が存在せず、デフォルト値も設定されていない場合
    """
    load_dotenv()
    value = os.getenv(key, default)
    
    if value is None:
        raise ValueError(f"環境変数 {key} が設定されていません。")
    
    return value

def get_api_key() -> str:
    """
    APIキーを安全に取得する関数
    
    Returns:
        str: APIキー
    """
    return load_env_variable('API_KEY') 