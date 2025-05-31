'use client';

interface LessonIntroductionProps {
  onComplete: () => void;
}

export default function LessonIntroduction({ onComplete }: LessonIntroductionProps) {
  // レッスンの次のステップへ進む
  const handleNext = () => {
    onComplete();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-10">
          レッスン29: Would you like to do a treatment as well?
        </h1>
        
        <div className="mb-12 p-6 bg-gray-50 rounded-2xl border border-gray-200">
          <h2 className="text-2xl font-semibold mb-6">レッスンの目標</h2>
          <ul className="space-y-4">
            <li className="flex items-start">
              <span className="text-lg mr-3">•</span>
              <span>トリートメントなどの追加メニューを自然におすすめできるようになる</span>
            </li>
            <li className="flex items-start">
              <span className="text-lg mr-3">•</span>
              <span>「Would you like to〜?」の言い方に慣れる</span>
            </li>
            <li className="flex items-start">
              <span className="text-lg mr-3">•</span>
              <span>サロンでよく使う英語の言葉を覚える</span>
            </li>
          </ul>
        </div>
        
        <div className="flex justify-center">
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-xl transition-colors bg-blue-600 hover:bg-blue-700 text-white text-xl font-semibold"
          >
            レッスン開始
          </button>
        </div>
      </div>
    </div>
  );
} 