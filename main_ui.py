import streamlit as st

# Streamlitページ設定（必ず最初に実行）
st.set_page_config(
    page_title="英会話学習サービス - Lesson 29",
    layout="centered",
    initial_sidebar_state="expanded"
)

import os
from dotenv import load_dotenv
from io import BytesIO
import numpy as np
from streamlit_webrtc import webrtc_streamer, WebRtcMode, AudioProcessorBase
from openai import OpenAI
import tempfile
import wave
import base64
import av
import time

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

class AudioState:
    """音声録音の状態を管理するクラス"""
    def __init__(self):
        self.is_recording = False
        self.recording_start_time = None
        self.recording_duration = 0
        self.audio_data = []
        self.status = "ready"  # ready, recording, processing, error
        self.error_message = None

class SessionState:
    """セッション状態を管理するクラス"""
    def __init__(self):
        self.initialized = False
        self.conversation_history = []
        self.selected_voice = "alloy"
        self.play_audio = None
        self.message_input = ""
        self.dialog_progress = 0
        self.waiting_for_input = False
        self.lesson_name = DEFAULT_LESSON
        self.key_phrase = DEFAULT_KEY_PHRASE
        self.vocab_list = DEFAULT_VOCAB_LIST
        self.extra_note = DEFAULT_EXTRA_NOTE
        self.dialog_lines = default_dialog()
        self.audio_state = AudioState()

def initialize_session_state():
    """セッション状態の初期化"""
    if "session" not in st.session_state:
        st.session_state.session = SessionState()
        st.session_state.audio_state = AudioState()
        st.session_state.message = ""  # テキスト入力用の状態
        st.session_state.mode = "通常会話モード"  # モード選択の状態

def reset_conversation():
    """会話履歴のリセット"""
    if "session" in st.session_state:
        st.session_state.session.conversation_history = []
        st.session_state.message = ""
        st.session_state.session.play_audio = None
        show_success("会話履歴をリセットしました。")

def reset_dialog():
    """ダイアログ練習の状態リセット"""
    if "session" in st.session_state:
        st.session_state.session.dialog_lines = default_dialog()
        st.session_state.session.dialog_progress = 0
        st.session_state.session.waiting_for_input = False
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
.error-message {
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: #fee2e2;
    border: 1px solid #ef4444;
    color: #dc2626;
    margin: 1rem 0;
}
.warning-message {
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: #fef3c7;
    border: 1px solid #f59e0b;
    color: #d97706;
    margin: 1rem 0;
}
.info-message {
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: #e0f2fe;
    border: 1px solid #0ea5e9;
    color: #0284c7;
    margin: 1rem 0;
}
.success-message {
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: #dcfce7;
    border: 1px solid #22c55e;
    color: #16a34a;
    margin: 1rem 0;
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
        selected_voice = st.session_state.get("selected_voice", "alloy")
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
                md_audio = f'''
                <div style="display: none;" id="audio_status_{hash(text)}"></div>
                <div style="margin: 10px 0;">
                    <audio id="audio_{hash(text)}" 
                           src="data:audio/mp3;base64,{b64}" 
                           style="width: 0; height: 0;"
                           onplay="document.getElementById('audio_status_{hash(text)}').innerText='playing'"
                           onended="document.getElementById('audio_status_{hash(text)}').innerText='ended'"
                           onerror="document.getElementById('audio_status_{hash(text)}').innerText='error'">
                    </audio>
                    <script>
                        try {{
                            const audio = document.getElementById('audio_{hash(text)}');
                            audio.play().catch(function(error) {{
                                console.error('音声の自動再生に失敗:', error);
                                document.getElementById('audio_status_{hash(text)}').innerText = 'error: ' + error.message;
                            }});
                        }} catch (e) {{
                            console.error('音声再生の初期化に失敗:', e);
                            document.getElementById('audio_status_{hash(text)}').innerText = 'init error: ' + e.message;
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

# 音声録音の設定と状態管理
SAMPLE_RATE = 16000
CHANNELS = 1
CHUNK_DURATION = 5  # 5秒間の録音

if "audio_state" not in st.session_state:
    st.session_state.audio_state = AudioState()

class Recorder(AudioProcessorBase):
    def __init__(self):
        self.frames = []
        self.start_time = None
        self.status = "initializing"

    def recv(self, frame: av.AudioFrame) -> av.AudioFrame:
        try:
            if self.start_time is None:
                self.start_time = time.time()
                self.status = "recording"
            
            current_time = time.time()
            elapsed = current_time - self.start_time
            
            if elapsed < CHUNK_DURATION:
                self.frames.append(frame)
                st.session_state.audio_state.recording_duration = elapsed
            
            return frame
        except Exception as e:
            self.status = "error"
            st.session_state.audio_state.error_message = str(e)
            return frame

def show_recording_status():
    """録音状態を表示するコンポーネント"""
    audio_state = st.session_state.audio_state
    
    if audio_state.status == "ready":
        st.empty()
    elif audio_state.status == "recording":
        elapsed = audio_state.recording_duration
        progress = min(elapsed / CHUNK_DURATION, 1.0)
        progress_bar = st.progress(progress)
        st.markdown(f"⏺️ 録音中... {elapsed:.1f}秒 / {CHUNK_DURATION}秒")
    elif audio_state.status == "processing":
        st.markdown("⚙️ 音声を処理中...")
    elif audio_state.status == "error":
        show_error(f"録音中にエラーが発生しました: {audio_state.error_message}")

# --- 5秒自動録音UI ---
def record_5sec_and_send(client, on_transcript):
    audio_state = st.session_state.audio_state
    
    # 録音ボタンのUI
    col1, col2 = st.columns([1, 4])
    with col1:
        if st.button("🎤 録音開始", disabled=audio_state.is_recording):
            audio_state.is_recording = True
            audio_state.status = "recording"
            audio_state.recording_start_time = time.time()
            audio_state.error_message = None
    with col2:
        show_recording_status()

    if audio_state.is_recording:
        webrtc_ctx = webrtc_streamer(
            key="audio-recorder",
            mode=WebRtcMode.SENDONLY,
            audio_receiver_size=1024,
            media_stream_constraints={"audio": True, "video": False},
            audio_processor_factory=Recorder,
            async_processing=True,
        )

        if webrtc_ctx.audio_processor:
            try:
                # 録音の進行状況を更新
                elapsed = time.time() - audio_state.recording_start_time if audio_state.recording_start_time else 0
                
                # 録音完了の判定
                if elapsed >= CHUNK_DURATION:
                    audio_state.status = "processing"
                    frames = webrtc_ctx.audio_processor.frames
                    
                    if frames:
                        # 音声ファイルの作成と保存
                        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                            try:
                                for frame in frames:
                                    f.write(frame.to_ndarray().tobytes())
                                audio_file = f.name
                                
                                # Whisper APIに送信
                                if client:
                                    with open(audio_file, "rb") as audio:
                                        try:
                                            transcript = client.audio.transcriptions.create(
                                                model="whisper-1",
                                                file=audio
                                            )
                                            recognized_text = transcript.text
                                            
                                            if not recognized_text or recognized_text.strip() == "":
                                                show_warning("音声が認識できませんでした。もう一度録音してください。")
                                            else:
                                                show_success(f"音声認識完了！")
                                                on_transcript(recognized_text)
                                        except Exception as e:
                                            show_error(f"音声認識中にエラーが発生しました: {str(e)}")
                            except Exception as e:
                                show_error(f"音声ファイルの処理中にエラーが発生しました: {str(e)}")
                            finally:
                                try:
                                    os.unlink(audio_file)
                                except Exception as e:
                                    show_warning(f"一時ファイルの削除中にエラーが発生しました: {str(e)}")
                    
                    # 録音状態のリセット
                    audio_state.is_recording = False
                    audio_state.status = "ready"
                    audio_state.recording_start_time = None
                    audio_state.recording_duration = 0
                    st.rerun()
                
            except Exception as e:
                show_error(f"録音処理中にエラーが発生しました: {str(e)}")
                audio_state.status = "error"
                audio_state.error_message = str(e)
                audio_state.is_recording = False

# 音声入力方法の選択UI改善
def render_input_method_selector():
    """入力方法の選択UIをレンダリング"""
    col1, col2 = st.columns([1, 4])
    with col1:
        input_method = st.radio("入力方法", ["💬 テキスト", "🎤 音声"])
    with col2:
        if input_method == "💬 テキスト":
            show_info("テキストを入力して送信ボタンを押してください")
        else:
            show_info("録音ボタンを押して話しかけてください（5秒間）")
    return input_method == "🎤 音声"

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

# システムプロンプトの生成
def generate_system_prompt():
    """現在の設定に基づいてシステムプロンプトを生成"""
    return f"""
あなたは英語を話す外国人のお客様です。
これから美容院のスタッフ（ユーザー）と、英会話講座「{session.lesson_name}」の復習を行います。

【講座テーマ・説明】
- {session.extra_note}
- 今日のフレーズ：「{session.key_phrase}」
- 重要語彙：{session.vocab_list}

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

# テキスト入力処理の修正
def handle_text_input():
    """テキスト入力の処理を行う"""
    col1, col2 = st.columns([5, 1])
    with col1:
        # キーを使用してテキスト入力を作成
        st.text_input("", placeholder="メッセージを入力...", key="input_message")
    with col2:
        send_button = st.button("送信 💬")
    
    # 送信処理
    if send_button and st.session_state.input_message.strip():
        current_input = st.session_state.input_message
        
        # ユーザーの発言を会話履歴に追加
        st.session_state.session.conversation_history.append(("あなた（スタッフ）", current_input))
        
        # AI応答を生成
        ai_reply = generate_ai_response(current_input, st.session_state.session.conversation_history[:-1])
        if ai_reply:
            # AIの応答を会話履歴に追加
            st.session_state.session.conversation_history.append(("AI（お客様）", ai_reply))
            st.session_state.session.play_audio = ai_reply
        else:
            show_error("AI応答の生成に失敗しました。もう一度お試しください。")
        
        # 入力欄をクリア（次回のrerunで反映される）
        st.session_state.input_message = ""

# 通常会話モードの処理
if mode == "通常会話モード":
    # プロンプトの自動生成
    system_prompt = generate_system_prompt()
    
    # カスタムCSS
    st.markdown("""
    <style>
    .chat-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
    }
    .message {
        display: flex;
        margin-bottom: 20px;
    }
    .message.staff {
        justify-content: flex-end;
    }
    .message.customer {
        justify-content: flex-start;
    }
    .avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        margin: 0 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
    }
    .staff-avatar {
        background-color: #007bff;
        color: white;
    }
    .customer-avatar {
        background-color: #28a745;
        color: white;
    }
    .message-content {
        max-width: 70%;
        padding: 10px 15px;
        border-radius: 20px;
        position: relative;
        word-wrap: break-word;
    }
    .staff .message-content {
        background-color: #007bff;
        color: white;
        margin-right: 15px;
    }
    .customer .message-content {
        background-color: #e9ecef;
        color: black;
        margin-left: 15px;
    }
    .message-time {
        font-size: 12px;
        color: #666;
        margin-top: 5px;
        text-align: center;
    }
    .chat-input {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: white;
        padding: 20px;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
    }
    </style>
    """, unsafe_allow_html=True)
    
    # 会話履歴表示
    st.markdown('<div class="chat-container">', unsafe_allow_html=True)
    
    # 会話が空の場合のメッセージ
    if not st.session_state.session.conversation_history:
        st.info("👋 会話を始めましょう！")
    
    # 会話履歴の表示
    for i, (speaker, text) in enumerate(st.session_state.session.conversation_history):
        if speaker == "あなた（スタッフ）":
            st.markdown(f"""
            <div class="message staff">
                <div class="message-content">
                    {text}
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
                </div>
            </div>
            """, unsafe_allow_html=True)
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    # 音声の再生チェック
    if st.session_state.session.play_audio:
        try:
            if speak_text(st.session_state.session.play_audio):
                st.session_state.session.play_audio = None
        except Exception as e:
            show_error(f"音声再生中にエラーが発生しました: {str(e)}")
            st.session_state.session.play_audio = None
    
    # 入力方法の選択
    is_voice_input = render_input_method_selector()
    
    if not is_voice_input:
        # テキスト入力処理
        handle_text_input()
    else:
        # 音声入力処理
        record_5sec_and_send(client, on_transcript)

# --- ダイアログ練習モード ---
if mode == "ダイアログ練習モード":
    st.subheader("ダイアログ練習モード")
    show_info("実際の会話のように、音声で練習できます。あなたの番になったら、マイクボタンを押して話してください。")
    
    # 現在の進行状況を管理
    if "dialog_progress" not in st.session_state:
        st.session_state.dialog_progress = 0
    if "waiting_for_input" not in st.session_state:
        st.session_state.waiting_for_input = False
    
    dialog_lines = session.dialog_lines
    current_position = st.session_state.dialog_progress
    
    # 進行状況の表示
    progress_bar = st.progress(current_position / len(dialog_lines))
    st.markdown("---")
    
    # ダイアログの表示と実行
    for i, line in enumerate(dialog_lines):
        col1, col2 = st.columns([1, 5])
        with col1:
            st.markdown(f"**{line['role']}**")
        with col2:
            # 現在の行を強調表示
            if i == current_position:
                st.markdown(f"🎯 **{line['text']}**")
            else:
                st.markdown(line["text"])
    
    st.markdown("---")
    
    # 現在の行の処理
    if current_position < len(dialog_lines):
        current_line = dialog_lines[current_position]
        
        # AIの番の場合
        if current_line["role"] == "Customer":
            if "play_audio" not in st.session_state:
                st.session_state.play_audio = None
            st.session_state.play_audio = current_line["text"]
            if speak_text(current_line["text"]):
                st.session_state.dialog_progress += 1
            else:
                show_error("音声の再生に失敗しました。もう一度試してください。")
        
        # ユーザーの番の場合
        else:
            st.markdown("### あなたの番です")
            st.markdown(f"🎯 次のセリフを話してください: **{current_line['text']}**")
            def on_dialog_transcript(text):
                if not text or text.strip() == "":
                    show_error("音声が認識できませんでした。もう一度録音してください。")
                    return
                show_success(f"あなたの発話: {text}")
                st.session_state.dialog_progress += 1
            record_5sec_and_send(client, on_dialog_transcript)
    
    # ダイアログ完了時
    else:
        show_success("🎉 おめでとうございます！ダイアログを完了しました。")
        if st.button("もう一度練習する", key="restart_button"):
            st.session_state.dialog_progress = 0
            st.rerun()
    
    # サイドバーでの編集機能
    with st.sidebar:
        st.markdown("---")
        st.subheader("ダイアログ編集")
        if st.button("ダイアログをリセット", key="reset_dialog_button"):
            reset_dialog()
            st.rerun() 