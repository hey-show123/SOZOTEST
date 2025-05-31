'use client';

import { useState } from 'react';
import VoiceSelector from './VoiceSelector';
import ModelSelector from './ModelSelector';

export default function ChatSettings() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="flex flex-col items-end mb-4 relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-2 text-gray-600 hover:text-gray-800 focus:outline-none"
        aria-label="設定"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="feather feather-settings"
        >
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"></path>
        </svg>
        <span className="ml-2">設定</span>
      </button>
      
      {isOpen && (
        <div className="absolute top-12 right-0 bg-white p-4 rounded-lg shadow-lg z-20 border border-gray-200 w-80">
          <h3 className="text-lg font-medium border-b pb-2 mb-3">チャット設定</h3>
          
          {/* モデル選択部分 */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">AIモデル設定</h4>
            <ModelSelector />
          </div>
          
          {/* 音声選択部分 */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">音声設定</h4>
            <VoiceSelector />
          </div>
          
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 