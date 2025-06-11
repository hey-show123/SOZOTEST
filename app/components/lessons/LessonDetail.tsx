'use client';

import { useState } from 'react';
import { Lesson } from '@/app/types/lesson';
import EnglishLesson from './EnglishLesson';

interface LessonDetailProps {
  lesson: Lesson;
}

export default function LessonDetail({ lesson }: LessonDetailProps) {
  const [startLesson, setStartLesson] = useState(false);

  if (startLesson) {
    return <EnglishLesson lesson={lesson} />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">{lesson.title}</h1>
          <p className="text-gray-700 mb-6">{lesson.description}</p>
          
          {lesson.level && (
            <div className="mb-4">
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                レベル: {lesson.level}
              </span>
            </div>
          )}

          {lesson.tags && lesson.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {lesson.tags.map((tag, index) => (
                <span key={index} className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-8">
            <button
              onClick={() => setStartLesson(true)}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              {lesson.startButtonText || 'レッスンを始める'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 