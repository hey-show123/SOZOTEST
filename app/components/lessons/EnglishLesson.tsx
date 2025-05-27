'use client';

import { useState } from 'react';
import LessonIntroduction from './LessonIntroduction';
import PhrasePractice from './PhrasePractice';
import DialoguePractice from './DialoguePractice';
import VocabularyPractice from './VocabularyPractice';
import QuestionTime from './QuestionTime';
import ChatSettings from '../ChatSettings';

enum LessonStage {
  INTRODUCTION,
  PHRASE_PRACTICE,
  DIALOGUE_PRACTICE,
  VOCABULARY_PRACTICE,
  QUESTION_TIME,
  COMPLETED
}

export default function EnglishLesson() {
  const [currentStage, setCurrentStage] = useState(LessonStage.INTRODUCTION);
  
  const handleStageComplete = (stage: LessonStage) => {
    setCurrentStage(stage + 1);
  };
  
  const handleRestart = () => {
    setCurrentStage(LessonStage.INTRODUCTION);
  };
  
  return (
    <div className="w-full h-full">
      <div className="p-2 flex justify-end">
        <ChatSettings />
      </div>
      
      <div className="px-4 pb-4">
        {currentStage === LessonStage.INTRODUCTION && (
          <LessonIntroduction 
            onComplete={() => handleStageComplete(LessonStage.INTRODUCTION)} 
          />
        )}
        
        {currentStage === LessonStage.PHRASE_PRACTICE && (
          <PhrasePractice 
            onComplete={() => handleStageComplete(LessonStage.PHRASE_PRACTICE)} 
          />
        )}
        
        {currentStage === LessonStage.DIALOGUE_PRACTICE && (
          <DialoguePractice 
            onComplete={() => handleStageComplete(LessonStage.DIALOGUE_PRACTICE)} 
          />
        )}
        
        {currentStage === LessonStage.VOCABULARY_PRACTICE && (
          <VocabularyPractice 
            onComplete={() => handleStageComplete(LessonStage.VOCABULARY_PRACTICE)} 
          />
        )}
        
        {currentStage === LessonStage.QUESTION_TIME && (
          <QuestionTime 
            onComplete={() => handleStageComplete(LessonStage.QUESTION_TIME)} 
          />
        )}
        
        {currentStage === LessonStage.COMPLETED && (
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
        )}
      </div>
    </div>
  );
} 