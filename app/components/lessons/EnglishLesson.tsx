'use client';

import { useState, useEffect } from 'react';
import LessonIntroduction from './LessonIntroduction';
import PhraseIntroduction from './PhraseIntroduction';
import PhrasePractice from './PhrasePractice';
import AllInOnePhrasePractice from './AllInOnePhrasePractice';
import SimplePhrasePractice from './SimplePhrasePractice';
import DialogueIntroduction from './DialogueIntroduction';
import DialoguePractice from './DialoguePractice';
import AllInOneDialoguePractice from './AllInOneDialoguePractice';
import InteractiveDialoguePractice from './InteractiveDialoguePractice';
import VocabularyPractice from './VocabularyPractice';
import LessonManager, { Lesson } from './LessonManager';

// レッスンステージの設定
enum LessonStage {
  INTRODUCTION,
  PHRASE_INTRO,             // 追加: フレーズ導入画面
  SIMPLE_PHRASE_PRACTICE,   // 今日の一言
  ALL_IN_ONE_PHRASE_PRACTICE,  // 複数フレーズ一括練習
  PHRASE_PRACTICE,             // 従来の複数ページフレーズ練習
  DIALOGUE_INTRO,              // 追加: 会話練習の導入画面
  INTERACTIVE_DIALOGUE_PRACTICE, // 追加: 対話形式の会話練習
  ALL_IN_ONE_DIALOGUE_PRACTICE, // 1ページで完結する会話練習
  DIALOGUE_PRACTICE,           // 従来の複数ページ会話練習
  VOCABULARY_PRACTICE,
  COMPLETED
}

export default function EnglishLesson() {
  const [currentStage, setCurrentStage] = useState(LessonStage.INTRODUCTION);
  const [showPDF, setShowPDF] = useState(false);
  const [showLessonManager, setShowLessonManager] = useState(false); // 初期表示時にレッスン管理を表示しない
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string | undefined>(undefined);
  const [isMobile, setIsMobile] = useState(false);
  // linterエラーを避けるため、コメントアウト
  // const useSimplifiedUI = true; // デフォルトで簡易UI（1ページ版）を使用
  // const useInteractiveMode = true; // デフォルトで対話形式の会話練習を使用

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

  // セッションストレージからPDFのURLを読み込む
  useEffect(() => {
    try {
      const savedPdfUrl = sessionStorage.getItem('currentLessonPdf');
      if (savedPdfUrl) {
        setCurrentPdfUrl(savedPdfUrl);
        setShowPDF(true);
      }
      
      // レッスンIDが保存されていれば、対応するレッスンを特定
      const savedLessonId = sessionStorage.getItem('currentLessonId');
      const savedLessons = localStorage.getItem('lessons');
      
      if (savedLessons) {
        const lessons = JSON.parse(savedLessons) as Lesson[];
        
        if (savedLessonId) {
          const foundLesson = lessons.find(l => l.id === savedLessonId);
          if (foundLesson) {
            setCurrentLesson(foundLesson);
            return;
          }
        }
        
        // レッスンIDが保存されていないか、見つからない場合は最初のレッスンを使用
        if (lessons.length > 0) {
          setCurrentLesson(lessons[0]);
          if (lessons[0].pdfUrl) {
            setCurrentPdfUrl(lessons[0].pdfUrl);
            setShowPDF(true);
          }
        }
      }
    } catch (error) {
      console.error('保存されたPDFパスの読み込みエラー:', error);
    }
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
    // 導入からはフレーズ導入へ進む
    if (stage === LessonStage.INTRODUCTION) {
      setCurrentStage(LessonStage.PHRASE_INTRO);
    }
    // フレーズ導入からは単一今日の一言へ進む
    else if (stage === LessonStage.PHRASE_INTRO) {
      setCurrentStage(LessonStage.SIMPLE_PHRASE_PRACTICE);
    }
    // 単一今日の一言からは会話導入へ
    else if (stage === LessonStage.SIMPLE_PHRASE_PRACTICE) {
      setCurrentStage(LessonStage.DIALOGUE_INTRO);
    }
    // 会話導入からは対話形式の会話練習へ
    else if (stage === LessonStage.DIALOGUE_INTRO) {
      setCurrentStage(LessonStage.INTERACTIVE_DIALOGUE_PRACTICE);
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
    // 語彙練習からは完了画面へ
    else if (stage === LessonStage.VOCABULARY_PRACTICE) {
      setCurrentStage(LessonStage.COMPLETED);
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

  // PDFビューアー部分
  const renderPDFViewer = () => {
    if (!currentPdfUrl) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100 p-4">
          <div className="text-center">
            <p className="text-gray-500 mb-2">PDFが設定されていません</p>
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
        return <LessonIntroduction 
          onComplete={() => handleStageComplete(LessonStage.INTRODUCTION)} 
          goals={currentLesson?.goals}
          headerTitle={currentLesson?.headerTitle}
          startButtonText={currentLesson?.startButtonText}
        />;
      case LessonStage.PHRASE_INTRO:
        return <PhraseIntroduction onComplete={() => handleStageComplete(LessonStage.PHRASE_INTRO)} />;
      case LessonStage.SIMPLE_PHRASE_PRACTICE:
        return <SimplePhrasePractice 
          onComplete={() => handleStageComplete(LessonStage.SIMPLE_PHRASE_PRACTICE)} 
          avatarImage="/images/_i_icon_15596_icon_155960_256.png" 
          keyPhrase={currentLesson?.keyPhrase}
        />;
      case LessonStage.DIALOGUE_INTRO:
        return <DialogueIntroduction onComplete={() => handleStageComplete(LessonStage.DIALOGUE_INTRO)} />;
      case LessonStage.ALL_IN_ONE_PHRASE_PRACTICE:
        return <AllInOnePhrasePractice onComplete={() => handleStageComplete(LessonStage.ALL_IN_ONE_PHRASE_PRACTICE)} />;
      case LessonStage.PHRASE_PRACTICE:
        return <PhrasePractice onComplete={() => handleStageComplete(LessonStage.PHRASE_PRACTICE)} />;
      case LessonStage.INTERACTIVE_DIALOGUE_PRACTICE:
        return <InteractiveDialoguePractice 
          onComplete={() => handleStageComplete(LessonStage.INTERACTIVE_DIALOGUE_PRACTICE)}
          dialogueTurns={currentLesson?.dialogueTurns}
          lessonTitle={currentLesson?.title}
        />;
      case LessonStage.ALL_IN_ONE_DIALOGUE_PRACTICE:
        return <AllInOneDialoguePractice onComplete={() => handleStageComplete(LessonStage.ALL_IN_ONE_DIALOGUE_PRACTICE)} />;
      case LessonStage.DIALOGUE_PRACTICE:
        return <DialoguePractice onComplete={() => handleStageComplete(LessonStage.DIALOGUE_PRACTICE)} />;
      case LessonStage.VOCABULARY_PRACTICE:
        return <VocabularyPractice onComplete={() => handleStageComplete(LessonStage.VOCABULARY_PRACTICE)} />;
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
      {isMobile && currentPdfUrl && (
        <div className="p-1 flex justify-end items-center border-b">
          <button
            onClick={togglePDF}
            className={`px-2 py-1 text-xs rounded flex items-center ${
              showPDF ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-black'
            }`}
            title="PDF切替"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="mr-1" viewBox="0 0 16 16">
              <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V9H3V2a1 1 0 0 1 1-1h5.5v2zM3 12v-2h2v2H3zm0 1h2v2H4a1 1 0 0 1-1-1v-1zm3 2v-2h3v2H6zm4 0v-2h3v1a1 1 0 0 1-1 1h-2zm3-3h-3v-2h3v2zm-7 0v-2h3v2H6z"/>
            </svg>
            {showPDF ? 'PDFを隠す' : 'PDFを表示'}
          </button>
        </div>
      )}
      
      {/* PCとタブレット用のレイアウト（上下分割ではなく左右分割） */}
      {!isMobile ? (
        <div className="flex-1 flex">
          {/* 左側：PDFビューア（1/3の幅） */}
          <div className="w-1/3 border-r overflow-hidden">
            {renderPDFViewer()}
          </div>
          
          {/* 右側：レッスンコンテンツ（2/3の幅） */}
          <div className="w-2/3 px-4 py-8 overflow-y-auto">
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
          <div className={`${showPDF ? 'h-1/3' : 'h-full'} px-4 py-8 overflow-y-auto`}>
            {renderLessonContent()}
          </div>
        </div>
      )}
    </div>
  );
} 