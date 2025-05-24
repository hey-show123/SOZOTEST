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
  pdfFilename?: string;
  onComplete?: (data: { duration: number; turns: number; accuracy: number }) => void;
}

const LearningSession: React.FC<LearningSessionProps> = ({ scenarioId, pdfFilename, onComplete }) => {
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
      const response = await lessonService.startLesson(pdfFilename);
      
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
        updatedMessages,
        currentPhase,
        true
      );
      
      // AIの応答をメッセージリストに追加
      const aiMessage = { role: 'assistant', content: response.message };
      setMessages([...updatedMessages, aiMessage]);
      setVisibleMessages([...visibleMessages, userMessage, aiMessage]);
      
      // フェーズを更新
      setCurrentPhase(response.phase);
      
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
      'あいさつ',
      'フレーズ練習',
      'ダイアログ',
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