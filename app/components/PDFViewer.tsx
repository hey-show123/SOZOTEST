'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// PDFJSのワーカーを設定
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

type PDFViewerProps = {
  pdfUrl: string;
  className?: string;
};

export default function PDFViewer({ pdfUrl, className = '' }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1.0);

  // コンポーネントがマウントされたら、PDF読み込みの状態をリセット
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setPageNumber(1);
  }, [pdfUrl]);

  // PDFの読み込み完了時のハンドラ
  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
  }

  // PDFの読み込みエラー時のハンドラ
  function onDocumentLoadError(error: Error) {
    console.error('PDF読み込みエラー:', error);
    setError('PDFの読み込みに失敗しました。');
    setIsLoading(false);
  }

  // 前のページに移動
  function goToPrevPage() {
    setPageNumber(prevPageNumber => Math.max(prevPageNumber - 1, 1));
  }

  // 次のページに移動
  function goToNextPage() {
    setPageNumber(prevPageNumber => 
      numPages ? Math.min(prevPageNumber + 1, numPages) : prevPageNumber
    );
  }

  // 拡大
  function zoomIn() {
    setScale(prevScale => Math.min(prevScale + 0.1, 2.0));
  }

  // 縮小
  function zoomOut() {
    setScale(prevScale => Math.max(prevScale - 0.1, 0.5));
  }

  return (
    <div className={`pdf-viewer w-full h-full flex flex-col ${className}`}>
      {/* PDF表示部分 */}
      <div className="flex-1 overflow-auto bg-gray-100 relative">
        {isLoading && (
          <div className="absolute inset-0 flex justify-center items-center bg-white bg-opacity-80">
            <div className="loader">PDFを読み込み中...</div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex justify-center items-center bg-white bg-opacity-80">
            <div className="text-red-500">{error}</div>
          </div>
        )}
        
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          className="flex justify-center"
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-lg"
          />
        </Document>
      </div>
      
      {/* コントロールパネル */}
      <div className="flex items-center justify-between p-2 bg-gray-200 border-t border-gray-300">
        <div className="flex space-x-2">
          <button
            onClick={zoomOut}
            className="p-1 bg-white rounded border border-gray-300 hover:bg-gray-100"
            disabled={scale <= 0.5}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
              <path d="M10.5 8H2.5a.5.5 0 0 1 0-1h8a.5.5 0 0 1 0 1z"/>
            </svg>
          </button>
          <button
            onClick={zoomIn}
            className="p-1 bg-white rounded border border-gray-300 hover:bg-gray-100"
            disabled={scale >= 2.0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
              <path d="M10.5 3.5a.5.5 0 0 0-.5.5v2.5H7.5a.5.5 0 0 0 0 1h2.5V10a.5.5 0 0 0 1 0V7.5H13a.5.5 0 0 0 0-1h-2.5V4a.5.5 0 0 0-.5-.5z"/>
            </svg>
          </button>
        </div>
        
        <div className="text-xs">
          {numPages ? `${pageNumber} / ${numPages}` : '読み込み中...'}
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={goToPrevPage}
            className="p-1 bg-white rounded border border-gray-300 hover:bg-gray-100"
            disabled={pageNumber <= 1}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
            </svg>
          </button>
          <button
            onClick={goToNextPage}
            className="p-1 bg-white rounded border border-gray-300 hover:bg-gray-100"
            disabled={numPages !== null && pageNumber >= numPages}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
} 