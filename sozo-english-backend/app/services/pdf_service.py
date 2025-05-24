import os
import logging
from fastapi import UploadFile
from fastapi.responses import FileResponse
from ..core.config import settings
from ..core.exceptions import PDFException

logger = logging.getLogger("api.pdf")


class PDFService:
    """PDFファイルを管理するサービスクラス"""
    
    def __init__(self):
        """PDFディレクトリの初期化"""
        self.pdf_dir = settings.PDF_DIRECTORY
        os.makedirs(self.pdf_dir, exist_ok=True)
    
    async def save_pdf(self, file: UploadFile) -> str:
        """アップロードされたPDFファイルを保存する"""
        if not file.filename.endswith('.pdf'):
            raise PDFException("PDFファイルのみアップロード可能です")
        
        try:
            file_path = os.path.join(self.pdf_dir, file.filename)
            
            # ファイルを保存
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            
            logger.info(f"PDFファイルを保存しました: {file.filename}")
            return file.filename
        except Exception as e:
            logger.error(f"PDFファイル保存エラー: {str(e)}")
            raise PDFException(f"PDFファイルの保存に失敗しました: {str(e)}")
    
    def get_pdf_file(self, filename: str) -> FileResponse:
        """ファイル名からPDFファイルを取得する"""
        file_path = os.path.join(self.pdf_dir, filename)
        
        if not os.path.exists(file_path):
            logger.error(f"PDFファイルが見つかりません: {filename}")
            raise PDFException(f"PDFファイルが見つかりません: {filename}")
        
        return FileResponse(
            path=file_path,
            media_type="application/pdf",
            filename=filename
        )
    
    def list_pdfs(self) -> list:
        """利用可能なPDFファイル一覧を取得する"""
        try:
            files = [f for f in os.listdir(self.pdf_dir) if f.endswith('.pdf')]
            return files
        except Exception as e:
            logger.error(f"PDFファイル一覧取得エラー: {str(e)}")
            raise PDFException(f"PDFファイル一覧の取得に失敗しました: {str(e)}")
    
    def delete_pdf(self, filename: str) -> bool:
        """PDFファイルを削除する"""
        file_path = os.path.join(self.pdf_dir, filename)
        
        if not os.path.exists(file_path):
            logger.error(f"削除対象のPDFファイルが見つかりません: {filename}")
            raise PDFException(f"削除対象のPDFファイルが見つかりません: {filename}")
        
        try:
            os.remove(file_path)
            logger.info(f"PDFファイルを削除しました: {filename}")
            return True
        except Exception as e:
            logger.error(f"PDFファイル削除エラー: {str(e)}")
            raise PDFException(f"PDFファイルの削除に失敗しました: {str(e)}")


# シングルトンパターンでサービスを提供
pdf_service = PDFService() 