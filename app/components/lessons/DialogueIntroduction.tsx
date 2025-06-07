'use client';

interface DialogueIntroductionProps {
  onComplete: () => void;
}

export default function DialogueIntroduction({ onComplete }: DialogueIntroductionProps) {
  // キーフレーズの情報
  const keyPhrase = {
    text: "Would you like to do a treatment as well?",
    translation: "トリートメントもされたいですか？",
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 sm:p-6 overflow-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-8 shadow-xl transition-transform fade-in">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4 text-gradient">今のフレーズを、会話の中で使ってみよう！</h1>
          <div className="h-1.5 w-32 bg-gradient-to-r from-blue-500 to-violet-500 rounded-full mx-auto"></div>
        </div>

        <div className="mb-6 sm:mb-8">
          <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 mb-4 sm:mb-6">さっき練習した</p>
          
          {/* キーフレーズの表示 */}
          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 sm:p-5 rounded-xl mb-4 sm:mb-6 text-center">
            <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300 mb-2 break-words">{keyPhrase.text}</p>
          </div>
          
          <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 mb-4 sm:mb-6">
            は、お客さんにトリートメントをすすめる時に使うセリフです。
          </p>
          
          <p className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 mb-6 sm:mb-10">
            このあと、実際にお客さんとのやりとりとして練習してみましょう。
          </p>
        </div>
        
        <div className="flex justify-center">
          <button
            onClick={onComplete}
            className="w-full md:w-2/3 py-3 sm:py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white text-lg sm:text-xl font-semibold rounded-xl transition-all transform hover:-translate-y-1 hover:shadow-lg"
          >
            会話を始める
          </button>
        </div>
      </div>
      
      <div className="text-center mt-4 text-sm text-gray-500">
        © 2025 SOZOの教室
      </div>
    </div>
  );
} 