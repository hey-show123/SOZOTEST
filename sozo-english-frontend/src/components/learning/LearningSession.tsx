import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, TextField, IconButton, Grid } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import SendIcon from '@mui/icons-material/Send';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { lessonService } from '@/services/api';

interface Message {
  role: string;
  content: string;
}

interface LearningSessionProps {
  scenarioId: string;
  onComplete?: (data: { duration: number; turns: number; accuracy: number }) => void;
}

const LearningSession: React.FC<LearningSessionProps> = ({ scenarioId, onComplete }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [visibleMessages, setVisibleMessages] = useState<{role: string; content: string}[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [phaseChangeDetected, setPhaseChangeDetected] = useState(false);
  const [phraseRepeatCount, setPhraseRepeatCount] = useState(0);
  const maxPhraseRepeatCount = 3; // キーフレーズを3回練習したらフェーズ2へ移行

  // メッセージ表示エリアへの自動スクロール
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleMessages]);

  // セッション開始
  const startSession = async () => {
    try {
      setIsLoading(true);
      const response = await lessonService.startLesson();
      
      const newMessage = { 
        role: 'assistant', 
        content: response.message 
      };
      
      setMessages([newMessage]);
      setVisibleMessages([newMessage]);
      setCurrentPhase(response.phase);
      setAudioData(response.audio);
      setSessionStarted(true);
      setStartTime(Date.now());
      playAudio(response.audio);
    } catch (error) {
      console.error('セッション開始エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // AIの応答を解析してフェーズ変更のキーワードを検出
  const detectPhaseChangeInMessage = (message: string) => {
    const phaseChangeKeywords = [
      "次のフェーズに進みましょう",
      "次のステップに進みましょう",
      "ダイアログ練習に移りましょう",
      "単語練習に移りましょう",
      "質問タイムに移りましょう",
      "次は会話の練習をしましょう",
      "次のダイアログ練習に進みましょう",
      "会話練習に移りましょう",
      "では次のステップに進みます",
      "ダイアログの練習を始めましょう"
    ];
    
    return phaseChangeKeywords.some(keyword => message.includes(keyword));
  };

  // ユーザーの発言がキーフレーズの練習かを検出
  const isKeyPhraseRepetition = (userMessage: string, aiResponse: string) => {
    // キーフレーズ練習フェーズ（フェーズ1）の場合のみチェック
    if (currentPhase !== 1) return false;
    
    // AIの応答に「よく言えました」「発音が良いです」などの評価フレーズが含まれるか
    const positiveFeedbackKeywords = [
      "よく言えました",
      "発音が良いです",
      "素晴らしいです",
      "上手です",
      "よくできました",
      "正確です",
      "完璧です",
      "Great",
      "Perfect",
      "Well done",
      "Very good"
    ];
    
    // AIの応答に評価フレーズが含まれていれば、キーフレーズの練習と判断
    return positiveFeedbackKeywords.some(keyword => aiResponse.includes(keyword));
  };

  // メッセージ送信
  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    const messageText = inputText;
    setInputText('');
    
    try {
      setIsLoading(true);
      
      // ユーザーメッセージを追加
      const userMessage = { role: 'user', content: messageText };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setVisibleMessages([...visibleMessages, userMessage]);
      
      // AIの応答を取得
      const response = await lessonService.sendMessage(
        messageText,
        updatedMessages, // 全会話履歴を確実に送信
        currentPhase,
        true
      );
      
      // AIの応答をメッセージリストに追加
      const aiMessage = { role: 'assistant', content: response.message };
      const newUpdatedMessages = [...updatedMessages, aiMessage];
      setMessages(newUpdatedMessages);
      setVisibleMessages([...visibleMessages, userMessage, aiMessage]);
      
      // フェーズ1でのキーフレーズ練習回数をカウント
      if (currentPhase === 1 && isKeyPhraseRepetition(messageText, response.message)) {
        const newCount = phraseRepeatCount + 1;
        setPhraseRepeatCount(newCount);
        
        // キーフレーズを一定回数練習したらフェーズ2へ自動移行
        if (newCount >= maxPhraseRepeatCount) {
          setCurrentPhase(2);
          // フェーズ移行メッセージを追加
          const phaseChangeMessage = {
            role: 'assistant',
            content: 'キーフレーズの練習が完了しました。次はダイアログ練習に進みましょう。'
          };
          setMessages([...newUpdatedMessages, phaseChangeMessage]);
          setVisibleMessages([...visibleMessages, userMessage, aiMessage, phaseChangeMessage]);
          
          // フェーズ2開始のAPIリクエスト
          try {
            const phaseChangeResponse = await lessonService.sendMessage(
              "次のフェーズに進みましょう",
              [...newUpdatedMessages, phaseChangeMessage],
              2, // フェーズ2を指定
              true
            );
            
            if (phaseChangeResponse.audio) {
              setAudioData(phaseChangeResponse.audio);
              playAudio(phaseChangeResponse.audio);
            }
          } catch (error) {
            console.error('フェーズ変更エラー:', error);
          }
          
          return; // 以降の処理をスキップ
        }
      }
      
      // フェーズ変更の検出
      const shouldChangePhase = detectPhaseChangeInMessage(response.message);
      if (shouldChangePhase || response.phase > currentPhase) {
        setPhaseChangeDetected(true);
        setCurrentPhase(response.phase || currentPhase + 1);
        // フェーズが変わったらカウントをリセット
        setPhraseRepeatCount(0);
      } else {
        setCurrentPhase(response.phase || currentPhase);
      }
      
      // 音声を再生
      if (response.audio) {
        setAudioData(response.audio);
        playAudio(response.audio);
      }
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 音声認識の開始
  const startRecording = async () => {
    try {
      setIsRecording(true);
      
      // Web Speech APIを使用
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('お使いのブラウザは音声認識をサポートしていません');
      }
      
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsRecording(false);
      };
      
      recognition.onerror = (event: any) => {
        console.error('音声認識エラー:', event.error);
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognition.start();
    } catch (error) {
      console.error('音声認識開始エラー:', error);
      setIsRecording(false);
    }
  };

  // 音声の再生
  const playAudio = (base64Audio: string) => {
    try {
      const audioSrc = `data:audio/mp3;base64,${base64Audio}`;
      const audio = new Audio(audioSrc);
      // 再生速度を遅くする（0.8倍速）
      audio.playbackRate = 0.8;
      audio.play().catch(error => {
        console.error('音声再生エラー:', error);
      });
    } catch (error) {
      console.error('音声変換エラー:', error);
    }
  };

  // 最後に受け取った音声を再生
  const replayLastAudio = () => {
    if (audioData) {
      playAudio(audioData);
    }
  };

  // セッション完了
  const handleComplete = () => {
    if (!startTime) return;
    
    const duration = (Date.now() - startTime) / 1000; // 秒単位
    const turns = Math.floor(messages.length / 2);
    const accuracy = 0.85; // デモ用の仮の精度
    
    if (onComplete) {
      onComplete({ duration, turns, accuracy });
    }
  };

  // フェーズ名を取得
  const getPhaseLabel = (phase: number) => {
    const phases = [
      '準備',
      'キーフレーズ練習',
      'ダイアログ練習',
      '単語練習',
      '質問タイム'
    ];
    return phases[phase] || `フェーズ ${phase}`;
  };

  return (
    <Paper sx={{ p: 3, height: '80vh', display: 'flex', flexDirection: 'column' }}>
      {sessionStarted && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1">
            現在のフェーズ: {getPhaseLabel(currentPhase)}
            {currentPhase === 1 && (
              <span style={{ marginLeft: '10px', fontSize: '0.8em', color: '#666' }}>
                (練習回数: {phraseRepeatCount}/{maxPhraseRepeatCount})
              </span>
            )}
          </Typography>
          <IconButton 
            onClick={replayLastAudio} 
            disabled={!audioData}
            color="primary"
            title="最後の音声を再生"
          >
            <VolumeUpIcon />
          </IconButton>
        </Box>
      )}
      
      {!sessionStarted ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Button
            variant="contained"
            size="large"
            onClick={startSession}
            disabled={isLoading}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'レッスンを開始'
            )}
          </Button>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              mb: 2,
              p: 2,
              bgcolor: 'background.default',
              borderRadius: 1,
            }}
          >
            {visibleMessages.map((msg, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  justifyContent: msg.role === 'assistant' ? 'flex-start' : 'flex-end',
                  mb: 2,
                }}
              >
                <Paper
                  sx={{
                    p: 2,
                    maxWidth: '70%',
                    bgcolor: msg.role === 'assistant' ? 'primary.light' : 'secondary.light',
                    color: msg.role === 'assistant' ? 'primary.contrastText' : 'secondary.contrastText',
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Typography>
                </Paper>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Box>
          
          <Grid container spacing={1} alignItems="center">
            <Grid item xs>
              <TextField
                fullWidth
                placeholder="メッセージを入力..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={isLoading || isRecording}
                multiline
                maxRows={3}
              />
            </Grid>
            <Grid item>
              <IconButton
                color={isRecording ? "secondary" : "primary"}
                onClick={isRecording ? () => setIsRecording(false) : startRecording}
                disabled={isLoading}
              >
                {isRecording ? <StopIcon /> : <MicIcon />}
              </IconButton>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                onClick={sendMessage}
                disabled={isLoading || isRecording || !inputText.trim()}
                startIcon={<SendIcon />}
              >
                送信
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleComplete}
              >
                終了
              </Button>
            </Grid>
          </Grid>
        </>
      )}
    </Paper>
  );
};

export default LearningSession; 