import streamlit as st

# Streamlitページ設定（必ず最初に実行）
st.set_page_config(
    page_title="英会話学習サービス - Lesson 29",
    layout="centered",
    initial_sidebar_state="expanded"
)

import os
from dotenv import load_dotenv
import tempfile
import base64
import time
from openai import OpenAI
import io
import numpy as np
from datetime import datetime

# 音声録音用コンポーネント
from audio_recorder_streamlit import audio_recorder

# .envからAPIキーを読み込む
load_dotenv()

# アプリケーションの設定と初期化
APP_TITLE = "英会話学習サービス"
DEFAULT_LESSON = "Lesson 29"
DEFAULT_KEY_PHRASE = "Would you like to do a treatment as well?"
DEFAULT_VOCAB_LIST = "haircut, treatment, damage, feels~, style, frizzy, straight perm"
DEFAULT_EXTRA_NOTE = "サービスの提案（特にトリートメントの勧め）に集中してください。"

# デフォルトのダイアログを定義
def default_dialog():
    """デフォルトのダイアログデータを返す"""
    return [
        {"role": "Staff", "text": "What would you like to do today?"},
        {"role": "Customer", "text": "A haircut please, my hair feels damaged."},
        {"role": "Staff", "text": "OK, would you like to do a treatment as well?"},
        {"role": "Customer", "text": "Sure."},
    ]

class SessionState:
    """セッション状態を管理するクラス"""
    def __init__(self):
        self.initialized = False
        self.conversation_history = []
        self.selected_voice = "alloy"
        self.message_input = ""
        self.dialog_progress = 0
        self.waiting_for_input = False
        self.lesson_name = DEFAULT_LESSON
        self.key_phrase = DEFAULT_KEY_PHRASE
        self.vocab_list = DEFAULT_VOCAB_LIST
        self.extra_note = DEFAULT_EXTRA_NOTE
        self.dialog_lines = default_dialog()
        self.recording = False
        self.audio_data = None

def initialize_session_state():
    """セッション状態の初期化"""
    if "session" not in st.session_state:
        st.session_state.session = SessionState()
        st.session_state.message = ""  # テキスト入力用の状態
        st.session_state.mode = "通常会話モード"  # モード選択の状態

def reset_conversation():
    """会話履歴のリセット"""
    if "session" in st.session_state:
        st.session_state.session.conversation_history = []
        st.session_state.message = ""
        show_success("会話履歴をリセットしました。")

def reset_dialog():
    """ダイアログ練習の状態リセット"""
    if "session" in st.session_state:
        st.session_state.session.dialog_lines = default_dialog()
        st.session_state.dialog_progress = 0
        st.session_state.waiting_for_input = False
        if "last_played_line" in st.session_state:
            st.session_state.last_played_line = -1
        show_success("ダイアログをリセットしました。")

def update_lesson_settings(lesson_name, key_phrase, vocab_list, extra_note):
    """レッスン設定の更新"""
    if "session" in st.session_state:
        st.session_state.session.lesson_name = lesson_name
        st.session_state.session.key_phrase = key_phrase
        st.session_state.session.vocab_list = vocab_list
        st.session_state.session.extra_note = extra_note
        reset_conversation()

# エラーメッセージのスタイル定義
ERROR_STYLE = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');

/* グローバル設定 */
html, body {
    font-family: 'Noto Sans JP', sans-serif;
}

/* サイドバーのカスタマイズ */
.sidebar .sidebar-content {
    background-color: #f8f9fa;
    border-right: 1px solid #eaecef;
}

/* セクションタイトル */
.sidebar h1, .sidebar h2, .sidebar h3, 
main h1, main h2, main h3 {
    color: #1e3a8a;
    font-weight: 700;
    margin-top: 1rem;
    margin-bottom: 1rem;
}

/* 入力フィールド */
input[type="text"], textarea {
    border-radius: 8px !important;
    border: 1px solid #ddd !important;
    padding: 0.5rem !important;
    transition: all 0.3s ease !important;
}

input[type="text"]:focus, textarea:focus {
    border-color: #4f46e5 !important;
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2) !important;
}

/* ボタンスタイル */
button {
    border-radius: 8px !important;
    transition: all 0.3s ease !important;
    text-transform: uppercase !important;
    font-weight: 500 !important;
    letter-spacing: 0.5px !important;
}

button[kind="primary"] {
    background-color: #4f46e5 !important;
    border: none !important;
}

button[kind="primary"]:hover {
    background-color: #4338ca !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
    transform: translateY(-1px) !important;
}

button[kind="secondary"] {
    border: 1px solid #4f46e5 !important;
    color: #4f46e5 !important;
    background-color: white !important;
}

button[kind="secondary"]:hover {
    background-color: #f9fafb !important;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
}

/* メッセージスタイル */
.error-message {
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: #fee2e2;
    border: 1px solid #ef4444;
    color: #dc2626;
    margin: 1rem 0;
    animation: fadeIn 0.5s ease-in-out;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.warning-message {
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: #fef3c7;
    border: 1px solid #f59e0b;
    color: #d97706;
    margin: 1rem 0;
    animation: fadeIn 0.5s ease-in-out;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.info-message {
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: #e0f2fe;
    border: 1px solid #0ea5e9;
    color: #0284c7;
    margin: 1rem 0;
    animation: fadeIn 0.5s ease-in-out;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.success-message {
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: #dcfce7;
    border: 1px solid #22c55e;
    color: #16a34a;
    margin: 1rem 0;
    animation: fadeIn 0.5s ease-in-out;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* アニメーション */
@keyframes fadeIn {
    0% { opacity: 0; transform: translateY(-10px); }
    100% { opacity: 1; transform: translateY(0); }
}

@keyframes slideIn {
    0% { opacity: 0; transform: translateX(-20px); }
    100% { opacity: 1; transform: translateX(0); }
}

@keyframes slideInRight {
    0% { opacity: 0; transform: translateX(20px); }
    100% { opacity: 1; transform: translateX(0); }
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

/* レスポンシブ調整 */
@media (max-width: 768px) {
    .chat-container {
        padding: 10px !important;
    }
    .message-content {
        max-width: 85% !important;
    }
}
</style>
"""

st.markdown(ERROR_STYLE, unsafe_allow_html=True)

def show_error(message):
    st.markdown(f'<div class="error-message">{message}</div>', unsafe_allow_html=True)

def show_warning(message):
    st.markdown(f'<div class="warning-message">{message}</div>', unsafe_allow_html=True)

def show_info(message):
    st.markdown(f'<div class="info-message">{message}</div>', unsafe_allow_html=True)

def show_success(message):
    st.markdown(f'<div class="success-message">{message}</div>', unsafe_allow_html=True)

# APIキーの設定と検証
def initialize_openai_client():
    if "OPENAI_API_KEY" not in os.environ:
        show_warning("OpenAI APIキーが設定されていません。")
        api_key = st.text_input("OpenAI APIキーを入力してください", type="password")
        if api_key:
            try:
                client = OpenAI(api_key=api_key)
                # APIキーの検証（軽量なAPI呼び出し）
                client.models.list()
                os.environ["OPENAI_API_KEY"] = api_key
                show_success("APIキーの検証に成功しました。")
                return client
            except Exception as e:
                show_error(f"APIキーの検証に失敗しました: {str(e)}")
                return None
        return None
    else:
        try:
            client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
            # APIキーの検証
            client.models.list()
            return client
        except Exception as e:
            show_error(f"APIキーの検証に失敗しました: {str(e)}")
            return None

# OpenAIクライアントの初期化
client = initialize_openai_client()

# 利用可能な声の設定
AVAILABLE_VOICES = {
    "Alloy (中性的)": "alloy",
    "Echo (男性)": "echo",
    "Fable (女性)": "fable",
    "Onyx (男性)": "onyx",
    "Nova (女性)": "nova",
    "Shimmer (女性)": "shimmer"
}

# 音声を再生する関数
def speak_text(text):
    if not client:
        show_error("OpenAI APIキーが設定されていません。")
        return False
    try:
        # 選択された声を取得
        selected_voice = st.session_state.session.selected_voice
        
        # 音声合成API呼び出し
        response = client.audio.speech.create(
            model="tts-1",
            voice=selected_voice,
            input=text
        )
        
        # 一時ファイルに保存
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            f.write(response.content)
            temp_file = f.name
        
        try:
            # ブラウザで再生用にbase64エンコード
            with open(temp_file, "rb") as audio_file:
                audio_bytes = audio_file.read()
                b64 = base64.b64encode(audio_bytes).decode()
                
                # 音声プレーヤーのHTML/JavaScriptを改善
                audio_id = f"audio_{int(time.time() * 1000)}"
                md_audio = f'''
                <div style="margin: 10px 0;">
                    <audio id="{audio_id}" 
                           src="data:audio/mp3;base64,{b64}" 
                           autoplay="true"
                           controls="true"
                           style="width: 100%;">
                    </audio>
                    <script>
                        try {{
                            const audio = document.getElementById('{audio_id}');
                            audio.play().catch(function(error) {{
                                console.error('音声の自動再生に失敗:', error);
                            }});
                        }} catch (e) {{
                            console.error('音声再生の初期化に失敗:', e);
                        }}
                    </script>
                </div>
                '''
                st.markdown(md_audio, unsafe_allow_html=True)
        except Exception as e:
            show_error(f"音声ファイルの処理中にエラーが発生しました: {str(e)}")
            return False
        finally:
            # 一時ファイルを確実に削除
            try:
                os.unlink(temp_file)
            except Exception as e:
                show_warning(f"一時ファイルの削除中にエラーが発生しました: {str(e)}")
        
        return True
    except Exception as e:
        show_error(f"音声合成中にエラーが発生しました: {str(e)}")
        return False

# 音声認識処理（Whisper API）
def transcribe_audio(audio_bytes):
    """
    音声データをWhisper APIで認識する
    
    Args:
        audio_bytes (bytes): 音声データのバイト列
    
    Returns:
        str: 認識されたテキスト。エラー時はNone
    """
    if not client:
        show_error("OpenAI APIキーが設定されていません。")
        return None
    
    try:
        # 一時ファイルに保存
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            temp_file = f.name
        
        st.info(f"音声ファイルのサイズ: {len(audio_bytes)} バイト")
        
        # Whisper APIを呼び出し
        with open(temp_file, "rb") as audio_file:
            try:
                response = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="text"
                )
                st.success("Whisper API処理完了")
                
                if isinstance(response, str) and response.strip():
                    return response.strip()
                else:
                    st.warning("音声認識結果が空でした")
                    return None
                
            except Exception as e:
                show_error(f"Whisper API呼び出し中にエラーが発生しました: {str(e)}")
                return None
            
    except Exception as e:
        show_error(f"音声認識の前処理中にエラーが発生しました: {str(e)}")
        return None
    finally:
        # 一時ファイルを削除
        try:
            if os.path.exists(temp_file):
                os.unlink(temp_file)
        except Exception as e:
            st.warning(f"一時ファイルの削除に失敗しました: {str(e)}")
    
    return None

# 簡易音声録音入力
def simple_audio_input(on_audio_complete):
    """
    Streamlitの音声録音コンポーネントを使用した簡易音声入力
    
    Args:
        on_audio_complete (func): 音声認識完了時のコールバック関数
    """
    st.info("""
    ### 音声入力の使い方
    1. 「録音」ボタンをクリックしてマイクへのアクセスを許可してください
    2. 話し終わったら再度ボタンをクリックして録音を停止します
    3. 自動的に音声認識が行われます
    
    ※録音中は赤いボタンが表示されます
    """)
    
    # 前回処理した音声データの管理
    if "last_processed_audio" not in st.session_state:
        st.session_state.last_processed_audio = None
    
    # audio_recorder_streamlitパッケージのコンポーネントを使用
    audio_bytes = audio_recorder(
        text="",
        recording_color="#e74c3c",
        neutral_color="#3498db",
        icon_name="microphone",
        icon_size="2x"
    )
    
    if audio_bytes:
        # 音声データのハッシュを計算して一意のIDとして使用
        audio_hash = hash(audio_bytes)
        
        # 前回と同じ音声データでないことを確認
        if audio_hash != st.session_state.last_processed_audio:
            st.audio(audio_bytes, format="audio/wav")
            
            with st.spinner("音声を認識中..."):
                # Whisper APIで音声認識
                transcription = transcribe_audio(audio_bytes)
                
                if transcription:
                    show_success(f"音声認識結果: {transcription}")
                    # 処理した音声データのIDを保存
                    st.session_state.last_processed_audio = audio_hash
                    # コールバック関数を呼び出し
                    on_audio_complete(transcription)
                else:
                    show_error("音声認識に失敗しました。もう一度お試しください。")
                    # エラーの場合も前回の音声IDを更新
                    st.session_state.last_processed_audio = audio_hash

# テキスト入力処理の修正
def handle_text_input():
    """テキスト入力の処理を行う"""
    col1, col2 = st.columns([5, 1])
    
    # 送信ボタンの状態を管理
    if "send_pressed" not in st.session_state:
        st.session_state.send_pressed = False
    
    # メッセージ入力の状態を管理
    if "message" not in st.session_state:
        st.session_state.message = ""
    
    def on_message_change():
        """メッセージ入力時のコールバック"""
        st.session_state.send_pressed = False
    
    def on_send_click():
        """送信ボタンクリック時のコールバック"""
        st.session_state.send_pressed = True
    
    with col1:
        # キーを使用してテキスト入力を作成
        message = st.text_input(
            "",
            key="input_field",
            placeholder="メッセージを入力...",
            value=st.session_state.message,
            on_change=on_message_change
        )
    
    with col2:
        send_button = st.button("送信 💬", on_click=on_send_click)
    
    # 送信処理
    if st.session_state.send_pressed and message.strip():
        # ユーザーの発言を会話履歴に追加
        st.session_state.session.conversation_history.append(("あなた（スタッフ）", message))
        
        # AI応答を生成
        ai_reply = generate_ai_response(message, st.session_state.session.conversation_history[:-1])
        if ai_reply:
            # AIの応答を会話履歴に追加
            st.session_state.session.conversation_history.append(("AI（お客様）", ai_reply))
        else:
            show_error("AI応答の生成に失敗しました。もう一度お試しください。")
        
        # 入力欄をクリア
        st.session_state.message = ""
        st.session_state.send_pressed = False
        st.rerun()

# 入力方法の選択UI
def render_input_method_selector():
    """入力方法の選択UIをレンダリング"""
    col1, col2 = st.columns([1, 4])
    with col1:
        input_method = st.radio("入力方法", ["💬 テキスト", "🎤 音声"])
    with col2:
        if input_method == "💬 テキスト":
            show_info("テキストを入力して送信ボタンを押してください")
        else:
            show_info("「録音」ボタンを押して話し、もう一度ボタンを押して録音を完了します。")
    return input_method == "🎤 音声"

# システムプロンプトの生成
def generate_system_prompt():
    """現在の設定に基づいてシステムプロンプトを生成"""
    return f"""
あなたは英語を話す外国人のお客様です。
これから美容院のスタッフ（ユーザー）と、英会話講座「{st.session_state.session.lesson_name}」の復習を行います。

【講座テーマ・説明】
- {st.session_state.session.extra_note}
- 今日のフレーズ：「{st.session_state.session.key_phrase}」
- 重要語彙：{st.session_state.session.vocab_list}

【ルール】
- 必ずこのレッスン内容に沿ったやりとりのみを行う
- あなた（AI）は、髪の悩みや状態を自然に伝え、スタッフ（ユーザー）がキーフレーズや語彙を使わざるを得ない流れに誘導する
- 会話の中でキーフレーズや語彙が自然に出てくるようにする
- スタッフ（ユーザー）が講座のフレーズや語彙を使った場合は、さりげなく肯定的な反応や簡単なフィードバックを与える
- 会話は自然な流れで継続する（1回の応答で終わらせない）
- 難しい表現は避け、初級〜中級レベルの英語を使用する
- お客様らしい自然な反応を心がける（例：髪の悩みを詳しく説明、提案されたケアに興味を示すなど）

【会話の進め方】
1. 最初は簡単な挨拶から始める
2. 髪の悩みや要望を徐々に具体的に説明する
3. スタッフの提案に対して興味を示し、詳しい説明を求める
4. 会話を自然に展開させ、複数回のやり取りを行う
5. 必要に応じて新しい話題（髪型、カラー、ヘアケアなど）に展開する

【日本語補足】
- 会話は英語で行い、必要に応じて簡単な日本語の補足説明を加える
- 特に重要なフレーズや表現を使用した際は、日本語で簡単な解説を加える
"""

# ChatGPT APIを使用してAI応答を生成する関数
def generate_ai_response(user_input, conversation_history):
    """
    ユーザーの入力とこれまでの会話履歴を基にAI応答を生成する
    
    Args:
        user_input (str): ユーザーの入力テキスト
        conversation_history (list): これまでの会話履歴
    
    Returns:
        str: 生成されたAI応答。エラー時はNone
    """
    if not client:
        show_error("OpenAI APIキーが設定されていません。")
        return None
    
    try:
        # システムプロンプトを生成
        system_prompt = generate_system_prompt()
        
        # ChatGPT APIを使用して応答を生成
        response = client.chat.completions.create(
            model="gpt-3.5-turbo-0125",
            messages=[
                {"role": "system", "content": system_prompt},
                *[{"role": "assistant" if speaker == "AI（お客様）" else "user", 
                   "content": text} 
                  for speaker, text in conversation_history],
                {"role": "user", "content": user_input}
            ],
            temperature=0.7,
            max_tokens=150
        )
        
        return response.choices[0].message.content
    except Exception as e:
        show_error(f"AI応答の生成中にエラーが発生しました: {str(e)}")
        return None

# セッション状態の初期化
initialize_session_state()
session = st.session_state.session

# メインタイトル
st.title(f"{APP_TITLE} - {session.lesson_name} 復習")

# モード選択
mode = st.sidebar.radio("モード選択", ["通常会話モード", "ダイアログ練習モード"], key="mode")

# サイドバーの設定
with st.sidebar:
    st.header("AIプロンプト設定（レッスン編集）")
    
    # 音声設定セクション
    st.subheader("🔊 音声設定")
    selected_voice_name = st.selectbox(
        "AIの声を選択",
        list(AVAILABLE_VOICES.keys()),
        index=0
    )
    session.selected_voice = AVAILABLE_VOICES[selected_voice_name]
    
    st.info("音声テストを実行すると、選択した声でテスト音声が再生されます。\n音量を確認してから会話を始めましょう。")
    
    if st.button("音声テスト"):
        if not client:
            show_error("OpenAI APIキーが設定されていません。サイドバー上部でAPIキーを設定してください。")
        else:
            test_text = "こんにちは！これは音声テストです。Hello! This is a voice test. 音声が聞こえますか？"
            try:
                if speak_text(test_text):
                    show_success("✅ 音声テストを実行しました。")
                    show_info("※音声が聞こえない場合は、以下を確認してください：\n1. ブラウザの音量設定\n2. デバイスの音量設定\n3. ブラウザの自動再生設定")
            except Exception as e:
                show_error(f"❌ 音声テスト中にエラーが発生しました: {str(e)}")
    
    st.markdown("---")
    
    # レッスン設定
    lesson_name = st.text_input("レッスン名", session.lesson_name)
    key_phrase = st.text_input("キーフレーズ", session.key_phrase)
    vocab_list = st.text_area("語彙リスト（カンマ区切り）", session.vocab_list)
    extra_note = st.text_area("追加説明・誘導文", session.extra_note)
    
    if st.button("プロンプトを反映・履歴リセット"):
        update_lesson_settings(lesson_name, key_phrase, vocab_list, extra_note)
    
    if st.button("会話履歴をクリア"):
        reset_conversation()

# 通常会話モードの処理
if mode == "通常会話モード":
    # プロンプトの自動生成
    system_prompt = generate_system_prompt()
    
    # カスタムCSS
    st.markdown("""
    <style>
    /* ヘッダー部分 */
    .salon-header {
        background: linear-gradient(135deg, #6366f1, #3b82f6);
        color: white;
        padding: 1.5rem;
        border-radius: 12px;
        margin-bottom: 2rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        text-align: center;
    }

    .salon-header h1 {
        margin: 0;
        font-size: 1.8rem;
        color: white !important;
    }

    .salon-header p {
        margin-top: 0.5rem;
        opacity: 0.9;
    }
    
    /* チャットコンテナ */
    .chat-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f9fafb;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    
    /* メッセージ */
    .message {
        display: flex;
        margin-bottom: 20px;
        animation: fadeIn 0.5s ease;
    }
    
    .message.staff {
        justify-content: flex-end;
    }
    
    .message.customer {
        justify-content: flex-start;
    }
    
    /* アバター */
    .avatar {
        width: 45px;
        height: 45px;
        border-radius: 50%;
        margin: 0 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
    }
    
    .avatar:hover {
        transform: scale(1.05);
    }
    
    .staff-avatar {
        background: linear-gradient(135deg, #4f46e5, #6366f1);
        color: white;
    }
    
    .customer-avatar {
        background: linear-gradient(135deg, #10b981, #34d399);
        color: white;
    }
    
    /* メッセージ内容 */
    .message-content {
        max-width: 70%;
        padding: 12px 18px;
        border-radius: 18px;
        position: relative;
        word-wrap: break-word;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
        line-height: 1.5;
    }
    
    .staff .message-content {
        background: linear-gradient(135deg, #4f46e5, #6366f1);
        color: white;
        margin-right: 15px;
        border-top-right-radius: 4px;
        animation: slideInRight 0.3s ease;
    }
    
    .customer .message-content {
        background: white;
        color: #374151;
        margin-left: 15px;
        border-top-left-radius: 4px;
        animation: slideIn 0.3s ease;
    }
    
    /* タイムスタンプ */
    .message-time {
        font-size: 12px;
        color: #6b7280;
        margin-top: 5px;
        text-align: center;
    }
    
    /* 入力エリア */
    .chat-input-container {
        background: white;
        padding: 15px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        margin-top: 20px;
        border: 1px solid #e5e7eb;
    }
    
    /* 入力方法セレクタ */
    .input-method-selector {
        display: flex;
        align-items: center;
        padding: 10px;
        background-color: #f3f4f6;
        border-radius: 8px;
        margin-bottom: 15px;
    }
    
    /* ボタン */
    .send-button {
        background: linear-gradient(135deg, #4f46e5, #6366f1);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 15px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .send-button:hover {
        background: linear-gradient(135deg, #4338ca, #4f46e5);
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    
    .send-button:active {
        transform: translateY(0);
    }

    /* 録音ボタン */
    .record-button-container {
        display: flex;
        justify-content: center;
        margin: 15px 0;
    }
    
    /* 初期メッセージ */
    .welcome-message {
        text-align: center;
        padding: 30px;
        background-color: white;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        margin: 20px 0;
        animation: pulse 2s infinite;
    }
    
    .welcome-message h3 {
        color: #4f46e5;
        margin-bottom: 10px;
    }
    
    .welcome-message p {
        color: #6b7280;
    }
    
    /* 音声認識中インジケータ */
    .recognizing {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px;
        background-color: #f9fafb;
        border-radius: 8px;
        margin: 10px 0;
    }
    
    .recognizing .dot {
        width: 8px;
        height: 8px;
        margin: 0 3px;
        background-color: #4f46e5;
        border-radius: 50%;
        animation: dotPulse 1.5s infinite ease-in-out;
    }
    
    .recognizing .dot:nth-child(2) {
        animation-delay: 0.2s;
    }
    
    .recognizing .dot:nth-child(3) {
        animation-delay: 0.4s;
    }
    
    @keyframes dotPulse {
        0%, 60%, 100% { transform: scale(1); opacity: 0.5; }
        30% { transform: scale(1.5); opacity: 1; }
    }
    </style>
    """, unsafe_allow_html=True)
    
    # ヘッダー部分
    st.markdown(f"""
    <div class="salon-header">
        <h1>{APP_TITLE} - {session.lesson_name}</h1>
        <p>キーフレーズ: {session.key_phrase}</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 会話履歴表示
    st.markdown('<div class="chat-container">', unsafe_allow_html=True)
    
    # 会話が空の場合のメッセージ
    if not st.session_state.session.conversation_history:
        st.markdown("""
        <div class="welcome-message">
            <h3>👋 会話を始めましょう！</h3>
            <p>下のテキスト入力または音声入力から会話を開始できます</p>
            <p>今日のキーフレーズを積極的に使ってみましょう</p>
        </div>
        """, unsafe_allow_html=True)
    
    # 会話履歴の表示
    for i, (speaker, text) in enumerate(st.session_state.session.conversation_history):
        timestamp = datetime.now().strftime("%H:%M")
        
        if speaker == "あなた（スタッフ）":
            st.markdown(f"""
            <div class="message staff">
                <div class="message-content">
                    {text}
                    <div class="message-time">{timestamp}</div>
                </div>
                <div class="avatar staff-avatar">👤</div>
            </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown(f"""
            <div class="message customer">
                <div class="avatar customer-avatar">👤</div>
                <div class="message-content">
                    {text}
                    <div class="message-time">{timestamp}</div>
                </div>
            </div>
            """, unsafe_allow_html=True)
            
            # AIの最後の応答であれば音声を再生
            if i == len(st.session_state.session.conversation_history) - 1:
                try:
                    speak_text(text)
                except Exception as e:
                    show_error(f"音声再生中にエラーが発生しました: {str(e)}")
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    # 入力エリアのコンテナ
    st.markdown('<div class="chat-input-container">', unsafe_allow_html=True)
    
    # 入力方法の選択
    is_voice_input = render_input_method_selector()
    
    if not is_voice_input:
        # テキスト入力処理
        handle_text_input()
    else:
        # 音声入力処理
        def on_audio_complete(text):
            if text and text.strip():
                # ユーザーの発言を会話履歴に追加
                st.session_state.session.conversation_history.append(("あなた（スタッフ）", text))
                
                # AI応答を生成
                ai_reply = generate_ai_response(text, st.session_state.session.conversation_history[:-1])
                if ai_reply:
                    # AIの応答を会話履歴に追加
                    st.session_state.session.conversation_history.append(("AI（お客様）", ai_reply))
                    st.rerun()
                else:
                    show_error("AI応答の生成に失敗しました。もう一度お試しください。")
        
        # 新しい音声入力コンポーネントを使用
        simple_audio_input(on_audio_complete)
    
    st.markdown('</div>', unsafe_allow_html=True)

# --- ダイアログ練習モード ---
if mode == "ダイアログ練習モード":
    # カスタムCSS for ダイアログモード
    st.markdown("""
    <style>
    /* ダイアログ練習モードスタイル */
    .dialog-header {
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        padding: 1.5rem;
        border-radius: 12px;
        margin-bottom: 2rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        text-align: center;
    }

    .dialog-container {
        background-color: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        margin-bottom: 20px;
    }
    
    .dialog-line {
        padding: 10px;
        margin: 10px 0;
        border-radius: 8px;
        transition: all 0.3s ease;
    }
    
    .dialog-line.current {
        background-color: #f0f9ff;
        border-left: 4px solid #3b82f6;
        padding-left: 15px;
        transform: scale(1.02);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        animation: pulse 2s infinite;
    }
    
    .dialog-role {
        font-weight: 600;
        color: #1e40af;
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        background-color: #dbeafe;
        margin-right: 10px;
    }
    
    .customer-role {
        color: #166534;
        background-color: #dcfce7;
    }
    
    .dialog-text {
        font-size: 1.05rem;
        color: #374151;
    }
    
    .dialog-progress-container {
        margin: 20px 0;
        padding: 10px;
        background-color: #f9fafb;
        border-radius: 8px;
    }
    
    .your-turn-container {
        background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
        border-radius: 12px;
        padding: 20px;
        margin: 20px 0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        animation: pulse 2s infinite;
        text-align: center;
    }
    
    .your-turn-container h3 {
        color: #1e40af;
        margin-bottom: 10px;
    }
    
    .your-turn-container .target-text {
        font-size: 1.2rem;
        padding: 15px;
        background-color: white;
        border-radius: 8px;
        margin: 10px 0;
        color: #1e3a8a;
        font-weight: 500;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    
    .complete-message {
        background: linear-gradient(135deg, #dcfce7, #bbf7d0);
        color: #166534;
        padding: 20px;
        border-radius: 12px;
        text-align: center;
        margin: 20px 0;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    
    .complete-message h2 {
        color: #166534;
        margin-bottom: 10px;
    }
    
    .restart-button {
        background-color: #10b981;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 20px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-weight: 500;
        margin-top: 10px;
    }
    
    .restart-button:hover {
        background-color: #059669;
        transform: translateY(-2px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    </style>
    """, unsafe_allow_html=True)
    
    # ヘッダー
    st.markdown("""
    <div class="dialog-header">
        <h1>ダイアログ練習モード</h1>
        <p>実際の会話のように、音声で練習できます。あなたの番になったら、録音ボタンを押して話してください。</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 現在の進行状況を管理
    if "dialog_progress" not in st.session_state:
        st.session_state.dialog_progress = 0
    if "waiting_for_input" not in st.session_state:
        st.session_state.waiting_for_input = False
    if "last_played_line" not in st.session_state:
        st.session_state.last_played_line = -1
    
    dialog_lines = session.dialog_lines
    current_position = st.session_state.dialog_progress
    
    # 進行状況の表示
    st.markdown('<div class="dialog-progress-container">', unsafe_allow_html=True)
    progress = current_position / len(dialog_lines) if dialog_lines else 0
    progress_bar = st.progress(progress)
    st.markdown(f'<p style="text-align: center; color: #6b7280;">進捗状況: {int(progress * 100)}%</p>', unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)
    
    # ダイアログの表示と実行
    st.markdown('<div class="dialog-container">', unsafe_allow_html=True)
    for i, line in enumerate(dialog_lines):
        current_class = "current" if i == current_position else ""
        role_class = "customer-role" if line["role"] == "Customer" else ""
        
        st.markdown(f"""
        <div class="dialog-line {current_class}">
            <span class="dialog-role {role_class}">{line["role"]}</span>
            <span class="dialog-text">{line["text"]}</span>
        </div>
        """, unsafe_allow_html=True)
    st.markdown('</div>', unsafe_allow_html=True)
    
    # 現在の行の処理
    if current_position < len(dialog_lines):
        current_line = dialog_lines[current_position]
        
        # AIの番の場合
        if current_line["role"] == "Customer":
            # まだ再生していない場合のみ音声を再生
            if st.session_state.last_played_line != current_position:
                try:
                    if speak_text(current_line["text"]):
                        st.session_state.last_played_line = current_position
                        # 一定時間後に次の行に進む
                        time.sleep(0.5)  # 安定のため少し待機
                        st.session_state.dialog_progress += 1
                        st.rerun()
                except Exception as e:
                    show_error(f"音声の再生に失敗しました: {str(e)}")
        
        # ユーザーの番の場合
        else:
            st.markdown("""
            <div class="your-turn-container">
                <h3>🎤 あなたの番です</h3>
                <p>次のセリフを話してください:</p>
                <div class="target-text">""" + current_line["text"] + """</div>
            </div>
            """, unsafe_allow_html=True)
            
            # 音声録音処理
            def on_dialog_audio_complete(text):
                if text and text.strip():
                    show_success(f"あなたの発話: {text}")
                    # 次の行に進む
                    st.session_state.dialog_progress += 1
                    st.session_state.last_played_line = -1  # 音声再生状態をリセット
                    st.rerun()
            
            # 新しい音声入力コンポーネントを使用
            simple_audio_input(on_dialog_audio_complete)
    
    # ダイアログ完了時
    else:
        st.markdown("""
        <div class="complete-message">
            <h2>🎉 おめでとうございます！</h2>
            <p>ダイアログを完了しました。もう一度練習して英会話スキルを向上させましょう。</p>
        </div>
        """, unsafe_allow_html=True)
        
        if st.button("もう一度練習する", key="restart_button", on_click=lambda: None):
            st.session_state.dialog_progress = 0
            st.session_state.last_played_line = -1
            st.rerun()
    
    # サイドバーでの編集機能
    with st.sidebar:
        st.markdown("---")
        st.subheader("ダイアログ編集")
        if st.button("ダイアログをリセット", key="reset_dialog_button"):
            reset_dialog()
            st.session_state.last_played_line = -1
            st.rerun() 