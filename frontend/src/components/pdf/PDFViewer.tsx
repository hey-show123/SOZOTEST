import React, { useState, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// PDFJSを初期化
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  pdfUrl: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  // PDFファイルのURLにタイムスタンプを追加してキャッシュを回避
  const pdfUrlWithTimestamp = useCallback(() => {
    const timestamp = new Date().getTime();
    const separator = pdfUrl.includes('?') ? '&' : '?';
    return `${pdfUrl}${separator}t=${timestamp}`;
  }, [pdfUrl]);

  // モバイルデバイス検出
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
      
      // モバイルの場合は初期スケールを調整
      if (window.innerWidth < 768) {
        setScale(0.8);
      } else {
        setScale(1.0);
      }
    };
    
    checkIsMobile();
    
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // PDF読み込み再試行の設定
  useEffect(() => {
    if (error && retryCount < 3) {
      const timer = setTimeout(() => {
        console.log(`Retrying PDF load (${retryCount + 1}/3)...`);
        setError(null);
        setIsLoading(true);
        setRetryCount(prev => prev + 1);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [error, retryCount]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log(`PDF loaded successfully with ${numPages} pages`);
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
  };
  
  const onDocumentLoadError = (error: Error) => {
    console.error('PDF loading error:', error);
    setError('PDFの読み込みに失敗しました。再試行しています...');
    setIsLoading(false);
  };

  const handleZoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.2, 0.5));
  };

  const handleNextPage = () => {
    if (pageNumber < (numPages || 1)) {
      setPageNumber(pageNumber + 1);
    }
  };

  const handlePrevPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setRetryCount(0);
  };

  return (
    <div className="pdf-viewer">
      <div className="pdf-controls">
        <button 
          onClick={handlePrevPage} 
          disabled={pageNumber <= 1}
          className="pdf-button"
          aria-label="前のページ"
        >
          前へ
        </button>
        <span className="pdf-page-info">
          {pageNumber} / {numPages || '?'}
        </span>
        <button 
          onClick={handleNextPage} 
          disabled={pageNumber >= (numPages || 1)}
          className="pdf-button"
          aria-label="次のページ"
        >
          次へ
        </button>
        <button 
          onClick={handleZoomOut} 
          className="pdf-button"
          aria-label="縮小"
        >
          縮小
        </button>
        <button 
          onClick={handleZoomIn} 
          className="pdf-button"
          aria-label="拡大"
        >
          拡大
        </button>
      </div>
      
      <div className="pdf-document-container">
        {isLoading && (
          <div className="pdf-loading">
            <div className="spinner"></div>
            <p>PDFを読み込み中...<br/>しばらくお待ちください</p>
          </div>
        )}
        
        {error && (
          <div className="pdf-error">
            <p>{error}</p>
            <button 
              onClick={handleRetry} 
              className="pdf-button"
            >
              再読み込み
            </button>
            <p className="text-sm mt-2">
              {retryCount >= 3 ? 
                'PDFの読み込みに繰り返し失敗しています。別のブラウザやデバイスでお試しください。' : 
                `自動的に再試行しています (${retryCount}/3)...`
              }
            </p>
          </div>
        )}
        
        <Document
          file={pdfUrlWithTimestamp()}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<div className="pdf-loading"><div className="spinner"></div></div>}
          className="pdf-document"
          options={{
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/standard_fonts/'
          }}
        >
          {!isLoading && !error && (
            <Page 
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="pdf-page"
              width={isMobile ? window.innerWidth - 40 : undefined}
              error="PDFページの読み込みに失敗しました。"
            />
          )}
        </Document>
      </div>

      <style jsx>{`
        .pdf-viewer {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          max-height: 75vh;
        }
        
        .pdf-controls {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          width: 100%;
          justify-content: center;
          padding: 8px;
          background-color: #f5f5f5;
          border-radius: 4px;
          flex-wrap: wrap;
        }
        
        .pdf-button {
          padding: 8px 12px;
          background-color: #4F46E5;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          min-width: 60px;
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          touch-action: manipulation;
        }
        
        .pdf-button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }
        
        .pdf-page-info {
          display: flex;
          align-items: center;
          margin: 0 8px;
          font-size: 14px;
          min-width: 60px;
          justify-content: center;
        }
        
        .pdf-document-container {
          width: 100%;
          overflow-y: auto;
          overflow-x: auto;
          max-height: 65vh;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          padding: 16px;
          display: flex;
          justify-content: center;
          position: relative;
          -webkit-overflow-scrolling: touch;
          background-color: #f8f9fa;
        }
        
        .pdf-document {
          width: 100%;
          display: flex;
          justify-content: center;
        }
        
        .pdf-page {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          background-color: white;
          border-radius: 2px;
        }
        
        .pdf-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          width: 100%;
          text-align: center;
        }
        
        .spinner {
          border: 4px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top: 4px solid #4F46E5;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        
        .pdf-error {
          text-align: center;
          color: #ef4444;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .pdf-error .pdf-button {
          margin-top: 16px;
          background-color: #ef4444;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PDFViewer; 