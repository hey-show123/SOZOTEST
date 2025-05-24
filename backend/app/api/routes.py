from fastapi import APIRouter, HTTPException, UploadFile, File, Request, Depends, status, Form
from fastapi.responses import StreamingResponse, FileResponse
import os
from typing import List, Dict, Any, Optional
import json
import logging
from ..core.config import settings
from ..services.openai_service import OpenAIService
from ..services.pdf_service import PDFService
from ..core.exceptions import ResourceNotFoundError, AudioProcessingError, OpenAIServiceError
from ..models.pdf import PDFListItem, PDFUploadResponse
import io

# ロガーの設定
logger = logging.getLogger(__name__)

router = APIRouter()
openai_service = OpenAIService()
pdf_service = PDFService()

# レッスン開始エンドポイント
@router.post("/lesson/start")
async def start_lesson():
    """レッスンを開始し、AIの初期挨拶を返す"""
    try:
        # 初期挨拶を生成
        ai_text, ai_audio = await openai_service.generate_initial_greeting()
        
        logger.info("レッスン開始: 初期挨拶生成完了")
        
        return {
            "ai_text": ai_text,
            "ai_audio_url": ai_audio
        }
    except OpenAIServiceError as e:
        # 既に適切な例外がスローされているので再スロー
        raise e
    except Exception as e:
        logger.error(f"レッスン開始中に予期しないエラーが発生: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"レッスン開始エラー: {str(e)}"
        )

# チャットエンドポイント
@router.post("/lesson/chat")
async def chat(request: Request):
    """ユーザー入力に対するAIの応答を返す"""
    try:
        data = await request.json()
        user_text = data.get("user_text", "")
        conversation_history = data.get("conversation_history", [])
        
        if not user_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ユーザーテキストが空です"
            )
        
        # AIの応答を生成
        ai_text, ai_audio, updated_conversation_history = await openai_service.generate_response(
            user_text, conversation_history
        )
        
        logger.info(f"チャット応答生成完了: 入力長={len(user_text)}, 応答長={len(ai_text)}")
        
        return {
            "ai_text": ai_text,
            "ai_audio_url": ai_audio,
            "updated_conversation_history": updated_conversation_history
        }
    except OpenAIServiceError as e:
        # 既に適切な例外がスローされているので再スロー
        raise e
    except Exception as e:
        logger.error(f"チャット応答中に予期しないエラーが発生: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"チャットエラー: {str(e)}"
        )

# 音声認識エンドポイント (サーバーサイドSTT用)
@router.post("/speech-to-text")
async def speech_to_text(audio_file: UploadFile = File(...)):
    """音声ファイルからテキストを抽出"""
    try:
        # ファイルタイプの検証
        content_type = audio_file.content_type
        if not content_type or not content_type.startswith(("audio/", "video/")):
            raise AudioProcessingError(f"サポートされていないファイル形式です: {content_type}")
        
        # ファイルサイズの検証
        audio_data = await audio_file.read()
        if len(audio_data) == 0:
            raise AudioProcessingError("音声ファイルが空です")
            
        if len(audio_data) > 10 * 1024 * 1024:  # 10MB制限
            raise AudioProcessingError("音声ファイルが大きすぎます (最大10MB)")
        
        # WhisperAPIでテキスト化
        text = await openai_service.transcribe_audio(audio_data)
        
        logger.info(f"音声認識完了: 音声サイズ={len(audio_data)/1024:.1f}KB, テキスト長={len(text)}")
        
        return {"text": text}
    except (AudioProcessingError, OpenAIServiceError) as e:
        # 既に適切な例外がスローされているので再スロー
        raise e
    except Exception as e:
        logger.error(f"音声認識中に予期しないエラーが発生: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"音声認識エラー: {str(e)}"
        )

# PDFファイル取得エンドポイント
@router.get("/lesson/pdf/{filename}")
async def get_pdf(filename: str):
    """指定されたPDFファイルを配信"""
    pdf_path = os.path.join(settings.PDF_DIRECTORY, filename)
    
    if not os.path.exists(pdf_path):
        logger.warning(f"PDFファイルが見つかりません: {filename}")
        raise ResourceNotFoundError("PDFファイル")
    
    logger.info(f"PDFファイル配信: {filename}")
    
    return FileResponse(pdf_path, media_type="application/pdf")


# PDFファイル一覧取得エンドポイント
@router.get("/pdfs", response_model=List[PDFListItem])
async def list_pdfs():
    """利用可能なPDFファイルの一覧を取得"""
    try:
        pdfs = await pdf_service.get_all_pdfs()
        return pdfs
    except Exception as e:
        logger.error(f"PDF一覧取得中にエラーが発生: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF一覧取得エラー: {str(e)}"
        )


# PDFファイルアップロードエンドポイント
@router.post("/pdfs/upload", response_model=PDFUploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    lesson_id: Optional[str] = Form(None),
    tags: str = Form("")
):
    """PDFファイルをアップロード"""
    try:
        # タグを処理（カンマ区切りの文字列からリストに変換）
        tag_list = [tag.strip() for tag in tags.split(",")] if tags else []
        
        # PDFをアップロード
        metadata = await pdf_service.upload_pdf(
            file=file,
            title=title,
            description=description,
            lesson_id=lesson_id,
            tags=tag_list
        )
        
        return PDFUploadResponse(
            success=True,
            filename=metadata.filename,
            metadata=metadata
        )
    except HTTPException as e:
        # FastAPIのHTTPExceptionはそのまま再スロー
        raise e
    except Exception as e:
        logger.error(f"PDFアップロード中にエラーが発生: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDFアップロードエラー: {str(e)}"
        )


# PDFファイル削除エンドポイント
@router.delete("/pdfs/{filename}")
async def delete_pdf(filename: str):
    """PDFファイルを削除"""
    try:
        success = await pdf_service.delete_pdf(filename)
        return {"success": success, "filename": filename}
    except ResourceNotFoundError as e:
        # 既に適切な例外がスローされているので再スロー
        raise e
    except Exception as e:
        logger.error(f"PDF削除中にエラーが発生: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF削除エラー: {str(e)}"
        ) 