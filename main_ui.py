import streamlit as st
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

# OpenAIクライアントの初期化
client = None

# APIキーの設定
if "OPENAI_API_KEY" not in os.environ:
    st.warning("OpenAI APIキーが設定されていません。")
    api_key = st.text_input("OpenAI APIキーを入力してください", type="password")
    if api_key:
        os.environ["OPENAI_API_KEY"] = api_key
        client = OpenAI(api_key=api_key)
else:
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

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
        st.error("OpenAI APIキーが設定されていません。")
        return
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
        # ブラウザで再生用にbase64エンコード
        with open(temp_file, "rb") as audio_file:
            audio_bytes = audio_file.read()
            b64 = base64.b64encode(audio_bytes).decode()
            md_audio = f'''
            <div style="margin: 10px 0;">
                <p style="margin-bottom: 5px;">🔊 下のプレーヤーをクリックして音声を再生してください：</p>
                <audio controls src="data:audio/mp3;base64,{b64}">
                    お使いのブラウザは音声再生をサポートしていません。
                </audio>
            </div>
            '''
            st.markdown(md_audio, unsafe_allow_html=True)
        os.unlink(temp_file)
    except Exception as e:
        st.error(f"音声合成中にエラーが発生しました: {str(e)}")

# 音声録音の設定
SAMPLE_RATE = 16000
CHANNELS = 1
CHUNK_DURATION = 5  # 5秒間の録音

def print_audio_devices():
    """利用可能なオーディオデバイスの一覧を表示"""
    try:
        devices = sd.query_devices()
        st.write("🎤 利用可能なオーディオデバイス:")
        for i, device in enumerate(devices):
            input_channels = device.get('max_input_channels', 0)
            if input_channels > 0:
                st.write(f"- デバイス {i}: {device['name']} (入力チャンネル: {input_channels})")
        
        default_device = sd.default.device
        st.write(f"\n🔧 デフォルトデバイス: 入力={default_device[0]}, 出力={default_device[1]}")
    except Exception as e:
        st.error(f"デバイス情報の取得中にエラーが発生: {str(e)}")

class Recorder(AudioProcessorBase):
    def __init__(self):
        self.frames = []
        self.start_time = None

    def recv(self, frame: av.AudioFrame) -> av.AudioFrame:
        if self.start_time is None:
            self.start_time = time.time()
        if time.time() - self.start_time < 5:
            self.frames.append(frame)
        return frame

# --- 5秒自動録音UI ---
def record_5sec_and_send(client, on_transcript):
    if 'recording' not in st.session_state:
        st.session_state['recording'] = False
    if st.button("録音開始") and not st.session_state['recording']:
        st.session_state['recording'] = True
        st.session_state['audio_sent'] = False

    if st.session_state.get('recording', False):
        st.info("5秒間自動で録音します。録音中は話してください。録音が終わると自動で認識されます。")
        webrtc_ctx = webrtc_streamer(
            key="audio-5sec",
            mode=WebRtcMode.SENDONLY,
            audio_receiver_size=1024,
            media_stream_constraints={"audio": True, "video": False},
            audio_processor_factory=Recorder,
            async_processing=True,
        )
        if webrtc_ctx.audio_processor:
            elapsed = time.time() - webrtc_ctx.audio_processor.start_time if webrtc_ctx.audio_processor.start_time else 0
            st.write(f"録音中... {elapsed:.1f}秒")
            if elapsed >= 5 and not st.session_state.get('audio_sent', False):
                frames = webrtc_ctx.audio_processor.frames
                if frames:
                    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                        for frame in frames:
                            f.write(frame.to_ndarray().tobytes())
                        audio_file = f.name
                    st.success("録音完了！Whisper APIに送信します。")
                    if client:
                        with open(audio_file, "rb") as f:
                            transcript = client.audio.transcriptions.create(
                                model="whisper-1",
                                file=f
                            )
                            recognized_text = transcript.text
                            if not recognized_text or recognized_text.strip() == "":
                                st.error("音声が認識できませんでした。もう一度録音してください。")
                            else:
                                st.success(f"あなた（スタッフ）の発話: {recognized_text}")
                                on_transcript(recognized_text)
                        st.session_state['audio_sent'] = True
                    st.session_state['recording'] = False
                    # os.unlink(audio_file)  # 必要なら削除

st.set_page_config(page_title="英会話学習サービス Lesson 29", layout="centered")
st.title("英会話学習サービス - Lesson 29 復習")

# --- モード切替 ---
mode = st.sidebar.radio("モード選択", ["通常会話モード", "ダイアログ練習モード"])

# --- ダイアログ練習用の初期データ ---
def default_dialog():
    return [
        {"role": "Staff", "text": "What would you like to do today?"},
        {"role": "Customer", "text": "A haircut please, my hair feels damaged."},
        {"role": "Staff", "text": "OK, would you like to do a treatment as well?"},
        {"role": "Customer", "text": "Sure."},
    ]

if "dialog_lines" not in st.session_state:
    st.session_state.dialog_lines = default_dialog()

# --- サイドバーでプロンプト編集 ---
with st.sidebar:
    st.header("AIプロンプト設定（レッスン編集）")
    
    # 音声設定セクション
    st.subheader("🔊 音声設定")
    selected_voice_name = st.selectbox(
        "AIの声を選択",
        list(AVAILABLE_VOICES.keys()),
        index=0
    )
    # 選択された声の名前からvoice_idを取得してセッションステートに保存
    st.session_state.selected_voice = AVAILABLE_VOICES[selected_voice_name]
    
    st.info("音声テストを実行すると、選択した声でテスト音声が再生されます。\n音量を確認してから会話を始めましょう。")
    
    if st.button("音声テスト"):
        if not client:
            st.error("OpenAI APIキーが設定されていません。サイドバー上部でAPIキーを設定してください。")
        else:
            test_text = "こんにちは！これは音声テストです。Hello! This is a voice test. 音声が聞こえますか？"
            try:
                speak_text(test_text)
                st.success("✅ 音声テストを実行しました。音声が再生されているはずです。")
                st.info("※音声が聞こえない場合は、以下を確認してください：\n1. ブラウザの音量設定\n2. デバイスの音量設定\n3. ブラウザの自動再生設定")
            except Exception as e:
                st.error(f"❌ 音声テスト中にエラーが発生しました: {str(e)}")
    
    st.markdown("---")
    
    # 既存の設定項目
    lesson_name = st.text_input("レッスン名", st.session_state.get("lesson_name", "Lesson 29"))
    key_phrase = st.text_input("キーフレーズ", st.session_state.get("key_phrase", "Would you like to do a treatment as well?"))
    vocab_list = st.text_area("語彙リスト（カンマ区切り）", st.session_state.get("vocab_list", "haircut, treatment, damage, feels~, style, frizzy, straight perm"))
    extra_note = st.text_area("追加説明・誘導文", st.session_state.get("extra_note", "サービスの提案（特にトリートメントの勧め）に集中してください。"))
    if st.button("プロンプトを反映・履歴リセット"):
        st.session_state.lesson_name = lesson_name
        st.session_state.key_phrase = key_phrase
        st.session_state.vocab_list = vocab_list
        st.session_state.extra_note = extra_note
        st.session_state.history = []
        st.success("プロンプトを反映し、履歴をリセットしました。")
    if mode == "ダイアログ練習モード":
        st.markdown("---")
        st.subheader("ダイアログ編集")
        
        # ダイアログ行数の編集
        num_lines = st.number_input("ダイアログの行数", min_value=2, max_value=10, value=len(st.session_state.dialog_lines))
        
        # 行数が変更された場合、ダイアログを更新
        if num_lines != len(st.session_state.dialog_lines):
            current_lines = st.session_state.dialog_lines
            if num_lines > len(current_lines):
                # 行を追加
                for _ in range(num_lines - len(current_lines)):
                    current_lines.append({"role": "Staff", "text": ""})
            else:
                # 行を削除
                current_lines = current_lines[:num_lines]
            st.session_state.dialog_lines = current_lines
            st.session_state.dialog_progress = 0  # 進行状況をリセット
            st.success("ダイアログの行数を更新しました。")
        
        # ダイアログの各行を編集
        dialog_lines = st.session_state.dialog_lines
        for i, line in enumerate(dialog_lines):
            col1, col2 = st.columns([1, 5])
            with col1:
                role = st.selectbox(f"役割{i}", ["Staff", "Customer"], index=0 if line["role"]=="Staff" else 1, key=f"role_{i}")
            with col2:
                text = st.text_input(f"セリフ{i}", value=line["text"], key=f"text_{i}")
            dialog_lines[i]["role"] = role
            dialog_lines[i]["text"] = text
        
        if st.button("ダイアログを保存"):
            st.session_state.dialog_lines = dialog_lines
            st.session_state.dialog_progress = 0  # 進行状況をリセット
            st.success("ダイアログを保存しました。")
        
        if st.button("ダイアログをリセット"):
            st.session_state.dialog_lines = default_dialog()
            st.session_state.dialog_progress = 0  # 進行状況をリセット
            st.success("ダイアログを初期化しました。")

# --- 通常会話モード ---
if mode == "通常会話モード":
    # 会話履歴の初期化
    if "history" not in st.session_state:
        st.session_state.history = []

    # プロンプトの自動生成
    system_prompt = f"""
あなたは英語を話す外国人のお客様です。
これから美容院のスタッフ（ユーザー）と、英会話講座「{st.session_state.get('lesson_name', 'Lesson 29')}」の復習を行います。

【講座テーマ・説明】
- {st.session_state.get('extra_note', 'サービスの提案（特にトリートメントの勧め）に集中してください。')}
- 今日のフレーズ：「{st.session_state.get('key_phrase', 'Would you like to do a treatment as well?')}」
- 重要語彙：{st.session_state.get('vocab_list', 'haircut, treatment, damage, feels~, style, frizzy, straight perm')}

【ルール】
- 必ずこのレッスン内容に沿ったやりとりのみを行う
- あなた（AI）は、髪の悩みや状態を自然に伝え、スタッフ（ユーザー）がキーフレーズや語彙を使わざるを得ない流れに誘導する
- 会話の中でキーフレーズや語彙が自然に出てくるようにする
- スタッフ（ユーザー）が講座のフレーズや語彙を使った場合は、さりげなく肯定的な反応や簡単なフィードバックを与える
- 会話は短く、講座の復習に集中する
- 難しい表現や脱線は避ける

【日本語補足】
- 会話は英語で行い、必要に応じて簡単な日本語の補足説明を加えてもよい

あなたはこのルールに従い、復習会話の「お客様」役を演じてください。
"""

    # 会話履歴表示
    st.subheader("会話履歴")
    for speaker, text in st.session_state.history:
        st.markdown(f"**{speaker}:** {text}")

    # 入力方法の選択
    input_method = st.radio("入力方法を選択", ["テキスト入力", "音声入力"])

    if input_method == "テキスト入力":
        # テキスト入力欄
        user_input = st.text_input("あなた（スタッフ）: ", "")
        
        # 送信ボタン
        if st.button("送信") and user_input.strip():
            st.session_state.history.append(("あなた（スタッフ）", user_input))
            
            # ChatGPT APIを使用してAI応答を生成
            if client:
                try:
                    response = client.chat.completions.create(
                        model="gpt-3.5-turbo-0125",
                        messages=[
                            {"role": "system", "content": system_prompt},
                            *[{"role": "assistant" if speaker == "AI（お客様）" else "user", 
                               "content": text} 
                              for speaker, text in st.session_state.history[:-1]],
                            {"role": "user", "content": user_input}
                        ],
                        temperature=0.7,
                        max_tokens=150
                    )
                    ai_reply = response.choices[0].message.content
                    st.session_state.history.append(("AI（お客様）", ai_reply))
                    st.success(f"AI（お客様）の返答: {ai_reply}")
                    
                    # AI応答を音声で再生
                    try:
                        st.info("🔊 音声を生成しています...")
                        speak_text(ai_reply)
                        st.success("✅ 音声の準備ができました。自動再生されない場合は、上の音声プレーヤーから再生してください。")
                    except Exception as e:
                        st.error(f"❌ 音声再生の準備中にエラーが発生しました: {str(e)}")
                        st.warning("音声は再生できませんでしたが、会話は継続できます。")
                except Exception as e:
                    st.error(f"AI応答の生成中にエラーが発生しました: {str(e)}")
                    ai_reply = "申し訳ありません。AI応答の生成に失敗しました。"
                    st.session_state.history.append(("AI（お客様）", ai_reply))
            else:
                st.error("OpenAI APIキーが設定されていません。")
                ai_reply = "APIキーを設定してください。"
                st.session_state.history.append(("AI（お客様）", ai_reply))
    else:
        # 音声入力
        def on_transcript(text):
            if not client:
                st.error("OpenAI APIキーが設定されていません。サイドバー上部でAPIキーを設定してください。")
                return
            st.session_state.history.append(("あなた（スタッフ）", text))
            # ChatGPT APIでAI応答生成
            try:
                st.info("AI応答生成中...")
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo-0125",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        *[{"role": "assistant" if speaker == "AI（お客様）" else "user", 
                           "content": t} 
                          for speaker, t in st.session_state.history[:-1]],
                        {"role": "user", "content": text}
                    ],
                    temperature=0.7,
                    max_tokens=150
                )
                ai_reply = response.choices[0].message.content
                st.session_state.history.append(("AI（お客様）", ai_reply))
                st.success(f"AI（お客様）の返答: {ai_reply}")
                
                # AI応答を音声で再生
                try:
                    st.info("🔊 音声を生成中...")
                    speak_text(ai_reply)
                    st.success("✅ AI応答を音声で再生しています。")
                except Exception as e:
                    st.error(f"❌ 音声再生中にエラーが発生しました: {str(e)}")
                    st.warning("音声は再生できませんでしたが、会話は継続できます。")
                
                st.rerun()  # 会話履歴を更新
            except Exception as e:
                st.error(f"AI応答の生成中にエラーが発生しました: {str(e)}")
                ai_reply = "申し訳ありません。AI応答の生成に失敗しました。"
                st.session_state.history.append(("AI（お客様）", ai_reply))
        record_5sec_and_send(client, on_transcript)

# --- ダイアログ練習モード ---
if mode == "ダイアログ練習モード":
    st.subheader("ダイアログ練習モード")
    st.info("実際の会話のように、音声で練習できます。あなたの番になったら、マイクボタンを押して話してください。")
    
    # 現在の進行状況を管理
    if "dialog_progress" not in st.session_state:
        st.session_state.dialog_progress = 0
    if "waiting_for_input" not in st.session_state:
        st.session_state.waiting_for_input = False
    
    dialog_lines = st.session_state.dialog_lines
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
            speak_text(current_line["text"])
            st.session_state.dialog_progress += 1
            st.rerun()
        
        # ユーザーの番の場合
        else:
            st.markdown("### あなたの番です")
            st.markdown(f"🎯 次のセリフを話してください: **{current_line['text']}**")
            def on_transcript(text):
                if not text or text.strip() == "":
                    st.error("音声が認識できませんでした。もう一度録音してください。")
                    return
                st.success(f"あなたの発話: {text}")
                # 発音チェック・進行処理（省略）
                # ここでAI応答や進行を追加可能
            record_5sec_and_send(client, on_transcript)
    
    # ダイアログ完了時
    else:
        st.success("🎉 おめでとうございます！ダイアログを完了しました。")
        if st.button("もう一度練習する", key="restart_button"):
            st.session_state.dialog_progress = 0
            st.rerun()
    
    # サイドバーでの編集機能
    with st.sidebar:
        st.markdown("---")
        st.subheader("ダイアログ編集")
        if st.button("ダイアログをリセット", key="reset_dialog_button"):
            st.session_state.dialog_lines = default_dialog()
            st.session_state.dialog_progress = 0
            st.success("ダイアログを初期化しました。")
            st.rerun() 