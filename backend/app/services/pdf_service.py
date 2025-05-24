import os
import json
import shutil
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
from fastapi import UploadFile, HTTPException, status
from ..core.config import settings
from ..core.exceptions import ResourceNotFoundError
from ..models.pdf import PDFMetadata, PDFListItem

# メタデータを保存するファイルパス
METADATA_FILE = os.path.join(settings.PDF_DIRECTORY, "metadata.json")

# ロガーの設定
logger = logging.getLogger(__name__)

class PDFService:
    """PDFファイル管理サービス"""
    
    @staticmethod
    async def upload_pdf(
        file: UploadFile, 
        title: str, 
        description: Optional[str] = None, 
        lesson_id: Optional[str] = None,
        tags: List[str] = []
    ) -> PDFMetadata:
        """PDFファイルをアップロード"""
        
        # ファイルタイプの検証
        if not file.content_type or file.content_type != "application/pdf":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PDFファイルのみアップロード可能です"
            )
        
        # ディレクトリが存在することを確認
        if not os.path.exists(settings.PDF_DIRECTORY):
            os.makedirs(settings.PDF_DIRECTORY)
        
        # ファイル名を取得（既存ファイルと衝突しないように処理）
        original_filename = file.filename
        filename = original_filename
        base, ext = os.path.splitext(original_filename)
        counter = 1
        
        # 同名ファイルが存在する場合、名前を変更
        while os.path.exists(os.path.join(settings.PDF_DIRECTORY, filename)):
            filename = f"{base}_{counter}{ext}"
            counter += 1
        
        # ファイルを保存
        file_path = os.path.join(settings.PDF_DIRECTORY, filename)
        file_content = await file.read()
        file_size = len(file_content)
        
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # メタデータを作成
        metadata = PDFMetadata(
            filename=filename,
            title=title,
            description=description,
            lesson_id=lesson_id,
            tags=tags,
            uploaded_at=datetime.now(),
            size_bytes=file_size
        )
        
        # メタデータをJSONに保存
        await PDFService._save_metadata(metadata)
        
        logger.info(f"PDFファイルアップロード完了: {filename}, サイズ: {file_size/1024:.1f}KB")
        
        return metadata
    
    @staticmethod
    async def get_all_pdfs() -> List[PDFListItem]:
        """すべてのPDFファイルのリストを取得"""
        # メタデータファイルが存在しない場合は空のリストを返す
        if not os.path.exists(METADATA_FILE):
            return []
        
        # メタデータを読み込む
        metadata_list = await PDFService._load_all_metadata()
        pdf_list = []
        
        base_url = f"/api/lesson/pdf"
        
        # PDFファイルのリスト項目を作成
        for metadata in metadata_list:
            # ファイルの実際の存在を確認
            file_path = os.path.join(settings.PDF_DIRECTORY, metadata["filename"])
            if os.path.exists(file_path):
                pdf_list.append(PDFListItem(
                    filename=metadata["filename"],
                    title=metadata["title"],
                    description=metadata.get("description"),
                    lesson_id=metadata.get("lesson_id"),
                    tags=metadata.get("tags", []),
                    uploaded_at=datetime.fromisoformat(metadata["uploaded_at"]),
                    size_bytes=metadata["size_bytes"],
                    url=f"{base_url}/{metadata['filename']}"
                ))
        
        return pdf_list
    
    @staticmethod
    async def delete_pdf(filename: str) -> bool:
        """PDFファイルを削除"""
        file_path = os.path.join(settings.PDF_DIRECTORY, filename)
        
        # ファイルが存在するか確認
        if not os.path.exists(file_path):
            raise ResourceNotFoundError("PDFファイル")
        
        # ファイルを削除
        os.remove(file_path)
        
        # メタデータからも削除
        await PDFService._remove_metadata(filename)
        
        logger.info(f"PDFファイル削除完了: {filename}")
        
        return True
    
    @staticmethod
    async def _save_metadata(metadata: PDFMetadata) -> None:
        """メタデータをJSONファイルに保存"""
        # 既存のメタデータを読み込む
        metadata_list = await PDFService._load_all_metadata()
        
        # 同じファイル名のメタデータがあれば更新、なければ追加
        metadata_dict = metadata.model_dump()
        metadata_dict["uploaded_at"] = metadata_dict["uploaded_at"].isoformat()
        
        # 既存のメタデータを更新または新しいメタデータを追加
        updated = False
        for i, item in enumerate(metadata_list):
            if item["filename"] == metadata.filename:
                metadata_list[i] = metadata_dict
                updated = True
                break
        
        if not updated:
            metadata_list.append(metadata_dict)
        
        # メタデータをJSONとして保存
        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(metadata_list, f, ensure_ascii=False, indent=2)
    
    @staticmethod
    async def _remove_metadata(filename: str) -> None:
        """メタデータからPDFファイルの情報を削除"""
        # 既存のメタデータを読み込む
        metadata_list = await PDFService._load_all_metadata()
        
        # 該当するファイル名のメタデータを削除
        metadata_list = [item for item in metadata_list if item["filename"] != filename]
        
        # 更新したメタデータをJSONとして保存
        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(metadata_list, f, ensure_ascii=False, indent=2)
    
    @staticmethod
    async def _load_all_metadata() -> List[Dict[str, Any]]:
        """すべてのメタデータを読み込む"""
        if not os.path.exists(METADATA_FILE):
            return []
        
        try:
            with open(METADATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except json.JSONDecodeError:
            logger.error("メタデータJSONの解析に失敗しました", exc_info=True)
            return [] 