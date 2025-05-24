from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Header
from fastapi.responses import FileResponse, JSONResponse
import base64
from typing import List, Optional

from ..services.lesson_service import lesson_service
from ..services.pdf_service import pdf_service
from ..services.audio_service import audio_service
from ..models.api_models import (
    LessonStartRequest, LessonStartResponse,
    ChatRequest, ChatResponse,
    SpeechToTextRequest, SpeechToTextResponse,
    TextToSpeechRequest, TextToSpeechResponse,
    PDFListResponse, PDFUploadResponse, PDFDeleteResponse
)

# APIルーターの作成
router = APIRouter()


# ヘルスチェック・ルート
@router.get("/health", summary="APIヘルスチェック")
async def health_check():
    """APIの稼働状態を確認するエンドポイント"""
    return {"status": "healthy", "message": "API is running"}


# レッスン開始エンドポイント
@router.post("/lesson/start", response_model=LessonStartResponse, summary="レッスンを開始する")
async def start_lesson(request: LessonStartRequest):
    """レッスンを開始し、AIからの初期メッセージと音声を返す"""
    return await lesson_service.start_lesson(request.pdf_filename)


# チャットエンドポイント
@router.post("/lesson/chat", response_model=ChatResponse, summary="チャットメッセージを送信")
async def chat(request: ChatRequest):
    """ユーザーのメッセージに対するAIの応答を生成し返す"""
    return await lesson_service.process_chat(
        request.message, 
        request.conversation_history, 
        request.phase,
        request.audio_feedback
    )


# 音声認識エンドポイント
@router.post("/speech-to-text", response_model=SpeechToTextResponse, summary="音声をテキストに変換")
async def speech_to_text(
    audio: UploadFile = File(...),
    language: str = Form("en")
):
    """音声ファイルをテキストに変換する"""
    audio_data = await audio.read()
    text = await audio_service.speech_to_text(audio_data, language)
    return {"text": text}


# 音声合成エンドポイント
@router.post("/text-to-speech", response_model=TextToSpeechResponse, summary="テキストを音声に変換")
async def text_to_speech(request: TextToSpeechRequest):
    """テキストを音声に変換し、Base64エンコードされた音声データを返す"""
    audio_base64 = await audio_service.text_to_speech(request.text, request.voice)
    return {"audio": audio_base64}


# PDF関連エンドポイント
@router.get("/lesson/pdf", response_model=PDFListResponse, summary="利用可能なPDFファイル一覧を取得")
async def list_pdfs():
    """利用可能なPDFファイル一覧を返す"""
    files = pdf_service.list_pdfs()
    return {"files": files}


@router.get("/lesson/pdf/{filename}", summary="PDFファイルを取得")
async def get_pdf(filename: str):
    """指定されたPDFファイルを返す"""
    return pdf_service.get_pdf_file(filename)


@router.post("/lesson/pdf", response_model=PDFUploadResponse, summary="PDFファイルをアップロード")
async def upload_pdf(file: UploadFile = File(...)):
    """PDFファイルをアップロードし保存する"""
    filename = await pdf_service.save_pdf(file)
    return {"filename": filename, "message": "PDFファイルが正常にアップロードされました"}


@router.delete("/lesson/pdf/{filename}", response_model=PDFDeleteResponse, summary="PDFファイルを削除")
async def delete_pdf(filename: str):
    """指定されたPDFファイルを削除する"""
    pdf_service.delete_pdf(filename)
    return {"filename": filename, "message": "PDFファイルが正常に削除されました"} 