'use client';

import { useState, useEffect } from 'react';
import LessonIntroduction from './LessonIntroduction';
import PhrasePractice from './PhrasePractice';
import AllInOnePhrasePractice from './AllInOnePhrasePractice';
import SimplePhrasePractice from './SimplePhrasePractice';
import DialoguePractice from './DialoguePractice';
import AllInOneDialoguePractice from './AllInOneDialoguePractice';
import InteractiveDialoguePractice from './InteractiveDialoguePractice';
import VocabularyPractice from './VocabularyPractice';
import QuestionTime from './QuestionTime';
import ChatSettings from '../ChatSettings';
import PDFViewer from '../PDFViewer';
import LessonManager, { Lesson } from './LessonManager';

// レッスンステージの設定
enum LessonStage {
  INTRODUCTION,
  SIMPLE_PHRASE_PRACTICE,      // 追加: 単一キーフレーズ練習（今回の実装）
  ALL_IN_ONE_PHRASE_PRACTICE,  // 複数フレーズ一括練習
  PHRASE_PRACTICE,             // 従来の複数ページフレーズ練習
  INTERACTIVE_DIALOGUE_PRACTICE, // 追加: 対話形式の会話練習
  ALL_IN_ONE_DIALOGUE_PRACTICE, // 1ページで完結する会話練習
  DIALOGUE_PRACTICE,           // 従来の複数ページ会話練習
  VOCABULARY_PRACTICE,
  QUESTION_TIME,
  COMPLETED
}

export default function EnglishLesson() {
  const [currentStage, setCurrentStage] = useState(LessonStage.INTRODUCTION);
  const [showPDF, setShowPDF] = useState(false);
  const [showLessonManager, setShowLessonManager] = useState(true); // デフォルトでレッスン管理を表示
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | undefined>(undefined);
  const [isMobile, setIsMobile] = useState(false);
  const [useSimplifiedUI, setUseSimplifiedUI] = useState(true); // デフォルトで簡易UI（1ページ版）を使用
  const [useSinglePhraseMode, setUseSinglePhraseMode] = useState(true); // デフォルトで単一キーフレーズモード
  const [useInteractiveMode, setUseInteractiveMode] = useState(true); // デフォルトで対話形式の会話練習を使用

  // 画面サイズのチェック
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // レッスン選択時のハンドラ
  const handleSelectLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setCurrentPdfUrl(lesson.pdfUrl);
    setShowLessonManager(false);
    
    // PDFがある場合は表示する
    if (lesson.pdfUrl) {
      setShowPDF(true);
    }
  };
  
  const handleStageComplete = (stage: LessonStage) => {
    // 導入からは単一キーフレーズ練習へ進む（新しい要望）
    if (stage === LessonStage.INTRODUCTION) {
      setCurrentStage(LessonStage.SIMPLE_PHRASE_PRACTICE);
    }
    // 単一キーフレーズ練習からは会話練習へ
    else if (stage === LessonStage.SIMPLE_PHRASE_PRACTICE) {
      // 対話形式を使用するかどうかで分岐
      if (useInteractiveMode) {
        setCurrentStage(LessonStage.INTERACTIVE_DIALOGUE_PRACTICE);
      } else {
        setCurrentStage(useSimplifiedUI ? LessonStage.ALL_IN_ONE_DIALOGUE_PRACTICE : LessonStage.DIALOGUE_PRACTICE);
      }
    }
    // 対話形式の会話練習からは語彙練習へ
    else if (stage === LessonStage.INTERACTIVE_DIALOGUE_PRACTICE) {
      setCurrentStage(LessonStage.VOCABULARY_PRACTICE);
    }
    // 以下は既存のフロー（今回は使わない予定だが、互換性のために残す）
    else if (stage === LessonStage.ALL_IN_ONE_PHRASE_PRACTICE) {
      setCurrentStage(LessonStage.ALL_IN_ONE_DIALOGUE_PRACTICE);
    }
    else if (stage === LessonStage.PHRASE_PRACTICE) {
      setCurrentStage(LessonStage.DIALOGUE_PRACTICE);
    }
    else if (stage === LessonStage.ALL_IN_ONE_DIALOGUE_PRACTICE) {
      setCurrentStage(LessonStage.VOCABULARY_PRACTICE);
    }
    else if (stage === LessonStage.DIALOGUE_PRACTICE) {
      setCurrentStage(LessonStage.VOCABULARY_PRACTICE);
    }
    // それ以外は次のステージへ
    else {
      setCurrentStage(stage + 1);
    }
  };
  
  const handleRestart = () => {
    setCurrentStage(LessonStage.INTRODUCTION);
  };

  // モバイル用のPDF表示トグル
  const togglePDF = () => {
    setShowPDF(!showPDF);
  };

  // レッスンマネージャーの表示切替
  const toggleLessonManager = () => {
    setShowLessonManager(!showLessonManager);
  };
  
  // UI切り替え
  const toggleUIMode = () => {
    setUseSimplifiedUI(!useSimplifiedUI);
    
    // 現在のステージに応じて、対応するUIに切り替える
    if (currentStage === LessonStage.PHRASE_PRACTICE || currentStage === LessonStage.ALL_IN_ONE_PHRASE_PRACTICE) {
      setCurrentStage(useSimplifiedUI ? LessonStage.PHRASE_PRACTICE : LessonStage.ALL_IN_ONE_PHRASE_PRACTICE);
    }
    else if (currentStage === LessonStage.DIALOGUE_PRACTICE || currentStage === LessonStage.ALL_IN_ONE_DIALOGUE_PRACTICE) {
      setCurrentStage(useSimplifiedUI ? LessonStage.DIALOGUE_PRACTICE : LessonStage.ALL_IN_ONE_DIALOGUE_PRACTICE);
    }
  };
  
  // 対話モード切り替え
  const toggleInteractiveMode = () => {
    setUseInteractiveMode(!useInteractiveMode);
  };

  // PDFビューアー部分
  const renderPDFViewer = () => {
    if (!currentPdfUrl) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100 p-4">
          <div className="text-center">
            <p className="text-gray-500 mb-2">PDFが設定されていません</p>
            <button 
              onClick={toggleLessonManager}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              レッスン管理
            </button>
          </div>
        </div>
      );
    }
    
    // iframeを使ったPDF表示（fallback）
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 relative">
          <iframe 
            src={currentPdfUrl} 
            className="absolute inset-0 w-full h-full"
            title="PDF Viewer"
          />
        </div>
      </div>
    );
  };

  // レッスンコンテンツ部分
  const renderLessonContent = () => {
    if (showLessonManager) {
      return <LessonManager onSelectLesson={handleSelectLesson} currentLessonId={currentLesson?.id} />;
    }
    
    switch (currentStage) {
      case LessonStage.INTRODUCTION:
        return <LessonIntroduction onComplete={() => handleStageComplete(LessonStage.INTRODUCTION)} />;
      case LessonStage.SIMPLE_PHRASE_PRACTICE:
        return <SimplePhrasePractice onComplete={() => handleStageComplete(LessonStage.SIMPLE_PHRASE_PRACTICE)} />;
      case LessonStage.ALL_IN_ONE_PHRASE_PRACTICE:
        return <AllInOnePhrasePractice onComplete={() => handleStageComplete(LessonStage.ALL_IN_ONE_PHRASE_PRACTICE)} />;
      case LessonStage.PHRASE_PRACTICE:
        return <PhrasePractice onComplete={() => handleStageComplete(LessonStage.PHRASE_PRACTICE)} />;
      case LessonStage.INTERACTIVE_DIALOGUE_PRACTICE:
        return <InteractiveDialoguePractice onComplete={() => handleStageComplete(LessonStage.INTERACTIVE_DIALOGUE_PRACTICE)} />;
      case LessonStage.ALL_IN_ONE_DIALOGUE_PRACTICE:
        return <AllInOneDialoguePractice onComplete={() => handleStageComplete(LessonStage.ALL_IN_ONE_DIALOGUE_PRACTICE)} />;
      case LessonStage.DIALOGUE_PRACTICE:
        return <DialoguePractice onComplete={() => handleStageComplete(LessonStage.DIALOGUE_PRACTICE)} />;
      case LessonStage.VOCABULARY_PRACTICE:
        return <VocabularyPractice onComplete={() => handleStageComplete(LessonStage.VOCABULARY_PRACTICE)} />;
      case LessonStage.QUESTION_TIME:
        return <QuestionTime onComplete={() => handleStageComplete(LessonStage.QUESTION_TIME)} />;
      case LessonStage.COMPLETED:
        return (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <div className="w-full max-w-5xl bg-white rounded-lg shadow-md p-6 text-center">
              <h2 className="text-2xl font-bold text-green-700 mb-6">
                レッスン完了！
              </h2>
              <p className="text-lg mb-8">
                お疲れ様でした。今日のレッスンは終了です。このフレーズを実際の仕事で使ってみてください。
              </p>
              <button
                onClick={handleRestart}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                もう一度レッスンを始める
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="p-2 flex justify-between items-center border-b">
        <div className="flex space-x-2">
          <button
            onClick={toggleLessonManager}
            className={`px-3 py-1 text-sm rounded flex items-center ${
              showLessonManager ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-black'
            }`}
            title="レッスン管理"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-1" viewBox="0 0 16 16">
              <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/>
            </svg>
            {showLessonManager ? 'レッスン管理中' : 'レッスン管理'}
          </button>
          
          {isMobile && currentPdfUrl && (
            <button
              onClick={togglePDF}
              className={`px-3 py-1 text-sm rounded flex items-center ${
                showPDF ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-black'
              }`}
              title="PDF切替"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="mr-1" viewBox="0 0 16 16">
                <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V9H3V2a1 1 0 0 1 1-1h5.5v2zM3 12v-2h2v2H3zm0 1h2v2H4a1 1 0 0 1-1-1v-1zm3 2v-2h3v2H6zm4 0v-2h3v1a1 1 0 0 1-1 1h-2zm3-3h-3v-2h3v2zm-7 0v-2h3v2H6z"/>
              </svg>
              {showPDF ? 'PDFを隠す' : 'PDFを表示'}
            </button>
          )}
        </div>
        <ChatSettings />
      </div>
      
      {/* PCとタブレット用のレイアウト（上下分割ではなく左右分割） */}
      {!isMobile ? (
        <div className="flex-1 flex">
          {/* 左側：PDFビューア（1/3の幅） */}
          <div className="w-1/3 border-r overflow-hidden">
            {renderPDFViewer()}
          </div>
          
          {/* 右側：レッスンコンテンツ（2/3の幅） */}
          <div className="w-2/3 px-4 py-4 overflow-y-auto">
            {renderLessonContent()}
          </div>
        </div>
      ) : (
        // モバイル用のレイアウト（PDF表示が上部2/3、レッスンコンテンツが下部1/3）
        <div className="flex-1 flex flex-col">
          {/* PDFビューア（表示/非表示切替可能、高さ2/3） */}
          {showPDF && (
            <div className="h-2/3 border-b overflow-hidden">
              {renderPDFViewer()}
            </div>
          )}
          
          {/* レッスンコンテンツ（PDFが表示されている場合は高さ1/3、そうでない場合は全体） */}
          <div className={`${showPDF ? 'h-1/3' : 'h-full'} px-4 py-4 overflow-y-auto`}>
            {renderLessonContent()}
          </div>
        </div>
      )}
    </div>
  );
} 