'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Lesson } from '../types/lesson';
import { DEFAULT_LESSONS } from '../constants/defaultLessons';

interface LessonContextType {
  lessons: Lesson[];
  currentLesson: Lesson | null;
  setCurrentLesson: (lesson: Lesson | null) => void;
  refreshLessons: () => Promise<void>;
}

const LessonContext = createContext<LessonContextType | undefined>(undefined);

export function LessonProvider({ children }: { children: ReactNode }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);

  // レッスンデータを取得する関数
  const fetchLessons = async () => {
    try {
      // API経由でレッスンデータを取得
      const response = await fetch('/api/lessons');
      if (response.ok) {
        const data = await response.json();
        if (data.lessons && Array.isArray(data.lessons) && data.lessons.length > 0) {
          console.log('APIからレッスンデータを取得しました');
          setLessons(data.lessons);
          
          // 初期レッスンを設定
          if (!currentLesson && data.lessons.length > 0) {
            setCurrentLesson(data.lessons[0]);
          }
          
          return;
        }
      }
      
      // APIから取得できない場合はローカルストレージから取得
      const savedLessons = localStorage.getItem('lessons');
      if (savedLessons) {
        console.log('ローカルストレージからレッスンデータを取得しました');
        const parsedLessons = JSON.parse(savedLessons);
        setLessons(parsedLessons);
        
        // 初期レッスンを設定
        if (!currentLesson && parsedLessons.length > 0) {
          setCurrentLesson(parsedLessons[0]);
        }
      } else {
        // 初期レッスンの保存
        console.log('デフォルトのレッスンデータを使用します');
        setLessons(DEFAULT_LESSONS);
        
        // 初期レッスンを設定
        if (!currentLesson && DEFAULT_LESSONS.length > 0) {
          setCurrentLesson(DEFAULT_LESSONS[0]);
        }
      }
    } catch (error) {
      console.error('レッスンデータの取得エラー:', error);
      // エラー時はローカルのデフォルトレッスンを使用
      setLessons(DEFAULT_LESSONS);
      
      // 初期レッスンを設定
      if (!currentLesson && DEFAULT_LESSONS.length > 0) {
        setCurrentLesson(DEFAULT_LESSONS[0]);
      }
    }
  };

  // レッスンデータをリフレッシュする関数
  const refreshLessons = async () => {
    await fetchLessons();
  };

  // コンポーネントマウント時にレッスンデータを取得
  useEffect(() => {
    fetchLessons();
  }, []);

  return (
    <LessonContext.Provider value={{ lessons, currentLesson, setCurrentLesson, refreshLessons }}>
      {children}
    </LessonContext.Provider>
  );
}

export function useLesson() {
  const context = useContext(LessonContext);
  if (context === undefined) {
    throw new Error('useLesson must be used within a LessonProvider');
  }
  return context;
} 