import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lesson } from '@/services/api';
import PDFViewer from '../pdf/PDFViewer';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import openaiService from '@/services/openai';

interface LearningSessionProps {
  lesson: Lesson;
  pdfUrl: string;
  onComplete: () => void;
}

enum SessionPhase {
  GREETING = 'greeting',
  PHRASE_PRACTICE = 'phrase_practice',
  DIALOGUE_PRACTICE = 'dialogue_practice',
  VOCABULARY_PRACTICE = 'vocabulary_practice',
  QUESTION_TIME = 'question_time',
  COMPLETED = 'completed'
}

interface Conversation {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const LearningSession: React.FC<LearningSessionProps> = ({
  lesson,
  pdfUrl,
  onComplete
}) => {
  // 状態管理
  const [phase, setPhase] = useState<SessionPhase>(SessionPhase.GREETING);
  const [conversation, setConversation] = useState<Conversation[]>([]);
  const [isMicPermissionChecked, setIsMicPermissionChecked] = useState(false);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [waitingForUserInput, setWaitingForUserInput] = useState(false);
  
  // カスタムフック
  const { 
    isListening, 
    transcript, 
    isProcessing, 
    error: speechError, 
    permissionGranted,
    startListening, 
    stopListening, 
    checkMicrophonePermission 
  } = useSpeechRecognition();
  
  const {
    isPlaying,
    isLoading: isAudioLoading,
    error: audioError,
    playText
  } = useAudioPlayer();
  
  // refs
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);
  
  // タイマー用の効果
  useEffect(() => {
    if (isSessionStarted) {
      const timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isSessionStarted]);
  
  // スクロール効果
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);
  
  // transcriptが更新されたらユーザー入力として処理
  useEffect(() => {
    if (transcript && !isSubmittingRef.current) {
      handleUserInput(transcript);
    }
  }, [transcript]);
  
  // セッション開始時のマイク権限チェックと初期メッセージ
  useEffect(() => {
    const initSession = async () => {
      // マイク権限をチェック（初回のみ）
      if (!isMicPermissionChecked) {
        await checkMicrophonePermission();
        setIsMicPermissionChecked(true);
      }
    };
    
    initSession();
  }, [checkMicrophonePermission, isMicPermissionChecked]);
  
  // ユーザー入力の処理
  const handleUserInput = useCallback(async (input: string) => {
    if (!input.trim() || isSubmittingRef.current) return;
    
    isSubmittingRef.current = true;
    
    // ユーザー入力を会話に追加
    const userMessage: Conversation = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    // 会話履歴に追加
    const updatedConversation = [...conversation, userMessage];
    setConversation(updatedConversation);
    setWaitingForUserInput(false);
    
    try {
      // 会話履歴からAI用のメッセージ形式に変換（すべての会話履歴を使用）
      const conversationMessages = updatedConversation
        // すべての会話履歴を使用
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
      // AI応答を取得（会話履歴を含める）
      const response = await openaiService.sendChat(
        lesson.id,
        input,
        phase,
        conversationMessages // 完全な会話履歴を追加
      );
      
      if (response.error) {
        console.error('Error getting AI response:', response.error);
      } else {
        // AI応答を会話に追加
        const assistantMessage: Conversation = {
          role: 'assistant',
          content: response.text,
          timestamp: new Date()
        };
        
        setConversation(prev => [...prev, assistantMessage]);
        
        // AI応答を音声で再生
        await playText(response.text);
        
        // AIの応答に特定のフレーズが含まれているかをチェックし、次のフェーズに進むか判断
        checkPhaseTransition(response.text, phase);
        
        // ユーザーの入力待ちに設定
        setWaitingForUserInput(true);
      }
    } catch (error) {
      console.error('Error in handleUserInput:', error);
    } finally {
      isSubmittingRef.current = false;
    }
  }, [conversation, lesson.id, phase, playText]);
  
  // セッション開始
  const startSession = useCallback(async () => {
    setIsSessionStarted(true);
    
    try {
      // 初期AIメッセージを取得
      const initialMessage = await openaiService.sendChat(
        lesson.id,
        'start_session',
        SessionPhase.GREETING
      );
      
      const assistantMessage: Conversation = {
        role: 'assistant',
        content: initialMessage.text,
        timestamp: new Date()
      };
      
      setConversation([assistantMessage]);
      
      // 初期メッセージを音声で再生
      await playText(initialMessage.text);
      
      // ユーザーの入力待ちに設定
      setWaitingForUserInput(true);
    } catch (error) {
      console.error('Error starting session:', error);
    }
  }, [lesson.id, playText]);
  
  // フェーズの更新
  const updatePhaseIfNeeded = (currentPhase: SessionPhase) => {
    // 現在のフェーズに基づいて次のフェーズを設定
    switch (currentPhase) {
      case SessionPhase.GREETING:
        setPhase(SessionPhase.PHRASE_PRACTICE);
        break;
      case SessionPhase.PHRASE_PRACTICE:
        setPhase(SessionPhase.DIALOGUE_PRACTICE);
        break;
      case SessionPhase.DIALOGUE_PRACTICE:
        setPhase(SessionPhase.VOCABULARY_PRACTICE);
        break;
      case SessionPhase.VOCABULARY_PRACTICE:
        setPhase(SessionPhase.QUESTION_TIME);
        break;
      case SessionPhase.QUESTION_TIME:
        setPhase(SessionPhase.COMPLETED);
        break;
      case SessionPhase.COMPLETED:
        // レッスン完了時の処理
        setTimeout(() => {
          onComplete();
        }, 5000);
        break;
    }
  };
  
  // AIの応答テキストに基づいてフェーズ遷移を判断
  const checkPhaseTransition = useCallback((text: string, currentPhase: SessionPhase) => {
    // 各フェーズの完了を示す特定のフレーズをチェック
    const phaseTransitionPhrases = {
      [SessionPhase.GREETING]: ['発音が素晴らしいです！次のフェーズに進みましょう', '次のフェーズに進みましょう', '良い発音です！次のステップに進みます'],
      [SessionPhase.PHRASE_PRACTICE]: ['次のフェーズに進みましょう', 'ダイアログ練習を始めましょう', '素晴らしい発音です！ダイアログ練習に進みます'],
      [SessionPhase.DIALOGUE_PRACTICE]: ['ダイアログ練習が完了しました。次のフェーズに進みましょう', '語彙練習に進みましょう', 'ダイアログのセクションが終わりました'],
      [SessionPhase.VOCABULARY_PRACTICE]: ['語彙練習が完了しました。次のフェーズに進みましょう', '質問タイムに進みましょう', '単語の練習が終わりました'],
      [SessionPhase.QUESTION_TIME]: ['質問タイムが終了しました。レッスンを完了しましょう', '時間になりました。レッスンを終了します', 'レッスンの最終セクションが完了しました'],
      [SessionPhase.COMPLETED]: ['レッスンが完了しました', 'お疲れ様でした'],
    };

    // 現在のフェーズに対応する遷移フレーズがあるか確認
    const transitionPhrases = phaseTransitionPhrases[currentPhase];
    if (transitionPhrases) {
      // いずれかのフレーズがAIの応答に含まれているかチェック
      const shouldTransition = transitionPhrases.some(phrase => 
        text.includes(phrase)
      );
      
      // フレーズ練習中で「shampoo」「massage」などの応用練習が含まれている場合、
      // 会話履歴内の応用練習の回数をカウント
      if (currentPhase === SessionPhase.PHRASE_PRACTICE && !shouldTransition) {
        const hasVariationPractice = text.includes('shampoo') || text.includes('massage') || 
                                    text.includes('application') || text.includes('別の言い方');
        
        if (hasVariationPractice) {
          // 過去の会話で既に応用練習が2回以上行われていれば次のフェーズへ
          let variationCount = 0;
          conversation.forEach(msg => {
            if (msg.role === 'assistant' && 
               (msg.content.includes('shampoo') || msg.content.includes('massage') || 
                msg.content.includes('application') || msg.content.includes('別の言い方'))) {
              variationCount++;
            }
          });
          
          if (variationCount >= 1) { // 1回の応用練習の後に次のフェーズへ
            console.log(`Phase transition triggered from ${currentPhase} after variation practice`);
            updatePhaseIfNeeded(currentPhase);
            return;
          }
        }
      }
      
      // 遷移条件を満たしていれば次のフェーズに更新
      if (shouldTransition) {
        console.log(`Phase transition triggered from ${currentPhase}`);
        updatePhaseIfNeeded(currentPhase);
      }
    }
  }, [conversation]);
  
  // マイクボタンクリック処理
  const handleMicrophoneClick = () => {
    if (!isSessionStarted) {
      startSession();
      return;
    }
    
    // 録音中の場合は停止
    if (isListening || isProcessing) {
      stopListening();
      // 処理中だった場合は少し待ってからsetIsProcessingをfalseに
      if (isProcessing) {
        setTimeout(() => {
          setIsProcessing(false);
        }, 500);
      }
    } else {
      // それ以外の場合は録音開始（音声再生中でも可能に）
      if (isPlaying) {
        console.log('Attempted to start recording while audio is playing');
      }
      
      // どんな状態でも録音を開始できるように
      startListening();
    }
  };
  
  // 時間のフォーマット
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // マイクボタンの状態に基づくクラスとテキスト
  const getMicButtonClassAndText = () => {
    if (!isSessionStarted) {
      return { 
        className: 'start-button', 
        text: 'レッスン準備ができたらここをタップ' 
      };
    }
    
    if (isListening) {
      return { 
        className: 'mic-button recording', 
        text: '録音中...' 
      };
    }
    
    if (isProcessing) {
      return { 
        className: 'mic-button processing', 
        text: '処理中...' 
      };
    }
    
    if (isPlaying || isAudioLoading) {
      return { 
        className: 'mic-button disabled', 
        text: 'AIが話しています...' 
      };
    }
    
    if (phase === SessionPhase.COMPLETED) {
      return { 
        className: 'mic-button disabled', 
        text: 'レッスン終了' 
      };
    }
    
    if (!waitingForUserInput) {
      return { 
        className: 'mic-button disabled', 
        text: '待機中...' 
      };
    }
    
    return { 
      className: 'mic-button', 
      text: 'マイク' 
    };
  };
  
  const { className: micButtonClass, text: micButtonText } = getMicButtonClassAndText();
  
  return (
    <div className="learning-session">
      {isSessionStarted && (
        <div className="progress-bar">
          <div className="phases">
            {Object.values(SessionPhase).map((p, index) => (
              <div 
                key={p} 
                className={`phase ${phase === p ? 'active' : ''} ${
                  Object.values(SessionPhase).indexOf(phase as SessionPhase) > index ? 'completed' : ''
                }`}
              >
                {index + 1}
              </div>
            ))}
          </div>
          <div className="timer">{formatTime(elapsedTime)}</div>
        </div>
      )}
      
      <div className={`pdf-section ${!isSessionStarted ? 'full-height' : ''}`}>
        <PDFViewer pdfUrl={pdfUrl} />
      </div>
      
      {isSessionStarted && (
        <div className="conversation-section">
          <div className="conversation-container">
            {conversation.map((message, index) => (
              <div 
                key={index} 
                className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                <div className="message-content">{message.content}</div>
                <div className="message-time">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            <div ref={conversationEndRef} />
          </div>
        </div>
      )}
      
      <div className={`controls ${!isSessionStarted ? 'start-controls' : ''}`}>
        <button 
          className={micButtonClass}
          onClick={handleMicrophoneClick}
          disabled={phase === SessionPhase.COMPLETED}
        >
          {micButtonText}
        </button>
      </div>
      
      {(speechError || audioError) && (
        <div className="error-message">
          {speechError || audioError}
        </div>
      )}
      
      <style jsx>{`
        .learning-session {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-height: 100vh;
          overflow: hidden;
        }
        
        .progress-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 16px;
          background-color: #f5f5f5;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        .phases {
          display: flex;
          gap: 8px;
        }
        
        .phase {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #e5e7eb;
          color: #6b7280;
          font-weight: 600;
        }
        
        .phase.active {
          background-color: #4F46E5;
          color: white;
        }
        
        .phase.completed {
          background-color: #10B981;
          color: white;
        }
        
        .timer {
          font-family: monospace;
          font-size: 1.2rem;
          font-weight: 600;
        }
        
        .pdf-section {
          flex: 3;
          overflow: hidden;
          padding: 16px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .pdf-section.full-height {
          flex: 1;
          height: calc(100vh - 120px);
        }
        
        .conversation-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          border-top: 1px solid #e5e7eb;
          height: 25vh;
        }
        
        .conversation-container {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .message {
          max-width: 80%;
          padding: 12px 16px;
          border-radius: 12px;
          position: relative;
        }
        
        .user-message {
          align-self: flex-end;
          background-color: #4F46E5;
          color: white;
          border-bottom-right-radius: 4px;
        }
        
        .assistant-message {
          align-self: flex-start;
          background-color: #f5f5f5;
          border-bottom-left-radius: 4px;
        }
        
        .message-time {
          font-size: 0.7rem;
          color: #9ca3af;
          position: absolute;
          bottom: -18px;
          right: 8px;
        }
        
        .controls {
          padding: 16px;
          display: flex;
          justify-content: center;
          background-color: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }
        
        .start-controls {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 24px;
          background-color: rgba(249, 250, 251, 0.9);
        }
        
        .mic-button, .start-button {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background-color: #4F46E5;
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .start-button {
          width: auto;
          height: auto;
          border-radius: 12px;
          padding: 16px 24px;
          font-size: 1.2rem;
        }
        
        .mic-button:hover, .start-button:hover {
          transform: scale(1.05);
        }
        
        .mic-button.recording {
          background-color: #EF4444;
          animation: pulse 1.5s infinite;
        }
        
        .mic-button.processing {
          background-color: #F59E0B;
        }
        
        .mic-button.disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
        }
        
        .error-message {
          position: fixed;
          bottom: 120px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #fee2e2;
          color: #ef4444;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.9rem;
          max-width: 80%;
          text-align: center;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }
        
        @media (max-width: 768px) {
          .pdf-section {
            flex: 2;
          }
          
          .conversation-section {
            flex: 1;
          }
          
          .phases {
            gap: 4px;
          }
          
          .phase {
            width: 24px;
            height: 24px;
            font-size: 0.8rem;
          }
          
          .timer {
            font-size: 1rem;
          }
          
          .mic-button, .start-button {
            width: 60px;
            height: 60px;
            font-size: 0.8rem;
          }
          
          .start-button {
            width: auto;
            height: auto;
            padding: 12px 20px;
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LearningSession; 