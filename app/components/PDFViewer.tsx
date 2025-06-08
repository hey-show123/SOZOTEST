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

  // 特定のページに移動
  function goToPage(page: number) {
    if (numPages && page >= 1 && page <= numPages) {
      setPageNumber(page);
    }
  }

  return (
    <div className={`pdf-viewer w-full h-full flex flex-col ${className}`}>
      {/* PDF表示部分 */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-900 relative">
        {isLoading && (
          <div className="absolute inset-0 flex justify-center items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
              <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">PDFを読み込み中...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex justify-center items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
            <div className="text-red-500 p-6 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-100 dark:border-red-800 shadow-lg max-w-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 text-center mb-2">エラーが発生しました</h3>
              <p className="text-center">{error}</p>
            </div>
          </div>
        )}
        
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          className="flex justify-center py-6"
        >
          <Page 
            pageNumber={pageNumber} 
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-xl rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-300"
          />
        </Document>
      </div>
      
      {/* コントロールパネル */}
      <div className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 glass-effect">
        {/* ページナビゲーション */}
        <div className="flex items-center justify-between p-2">
          <div className="flex space-x-2">
            <button
              onClick={zoomOut}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-700 dark:text-gray-300"
              disabled={scale <= 0.5}
              title="縮小"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
              </svg>
            </button>
            <button
              onClick={zoomIn}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-700 dark:text-gray-300"
              disabled={scale >= 2.0}
              title="拡大"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </button>
          </div>

          {/* ページ選択 */}
          {numPages && numPages > 1 && (
            <div className="flex items-center space-x-3">
              <button
                onClick={goToPrevPage}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-700 dark:text-gray-300"
                disabled={pageNumber <= 1}
                title="前のページ"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 text-sm font-medium flex items-center space-x-1">
                <span className="text-gray-800 dark:text-gray-200">
                  {pageNumber} / {numPages}
                </span>
              </div>
              
              <button
                onClick={goToNextPage}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-700 dark:text-gray-300"
                disabled={numPages !== null && pageNumber >= numPages}
                title="次のページ"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
          
          {/* 全画面表示ボタン */}
          <button
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-gray-700 dark:text-gray-300"
            title="全画面表示"
            onClick={() => document.documentElement.requestFullscreen().catch(e => console.error('全画面エラー:', e))}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          </button>
        </div>
        
        {/* スライダー */}
        {numPages && numPages > 3 && (
          <div className="px-4 pb-3 pt-1">
            <input
              type="range"
              min={1}
              max={numPages}
              value={pageNumber}
              onChange={(e) => goToPage(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        )}
      </div>
    </div>
  );
} 