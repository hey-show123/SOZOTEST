// レッスンの型定義
export interface Lesson {
  id: string;
  title: string;
  description?: string;
  pdfUrl?: string;
  systemPrompt?: string;
  level?: string;
  tags?: string[];
  createdAt?: number;
  updatedAt?: number;
  audioGenerated?: boolean;
  headerTitle?: string;
  startButtonText?: string;
  keyPhrase?: {
    english: string;
    japanese: string;
  };
  dialogueTurns?: DialogueTurn[];
  goals?: Goal[];
}

// 会話のターン
export interface DialogueTurn {
  id: string;
  speaker: 'user' | 'teacher';
  english: string;
  japanese: string;
}

// 学習目標
export interface Goal {
  id: string;
  english: string;
  japanese: string;
} 