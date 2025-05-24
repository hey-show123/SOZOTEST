import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // 長いテキストは適切な場所で分割して複数のリクエストに
    const chunks = splitTextIntoChunks(text);
    const audioChunks = [];

    for (const chunk of chunks) {
      // 各チャンクを並行してリクエストするのではなく、順番に処理
      // OpenAI TTS APIを呼び出し
      const response = await axios.post(
        'https://api.openai.com/v1/audio/speech',
        {
          model: 'tts-1', // 標準モデルを使用して処理速度を向上
          voice: 'shimmer', // より自然な声のshimmerを使用
          input: chunk,
          speed: 1.5, // より速く設定（1.2から1.5に変更）
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          responseType: 'arraybuffer', // バイナリデータとして受け取る
        }
      );

      audioChunks.push(response.data);
    }

    // 全てのオーディオチャンクを結合
    const combinedAudio = Buffer.concat(audioChunks);

    // 音声データをクライアントに返す
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24時間キャッシュ
    return res.status(200).send(combinedAudio);
  } catch (error) {
    console.error('Error in TTS API:', error);
    return res.status(500).json({ error: 'Failed to convert text to speech' });
  }
}

/**
 * テキストを適切な場所で分割する
 * ピリオド、疑問符、感嘆符、改行などの自然な区切りで分割
 */
function splitTextIntoChunks(text: string): string[] {
  // 既に短いテキストなら分割しない
  if (text.length < 500) {
    return [text];
  }

  // 文の区切りとなる記号のパターン
  const sentenceEndPattern = /[.!?。]\s+/g;
  
  // matchAllの代わりに従来のアプローチを使用
  const sentences = text.split(sentenceEndPattern).filter(Boolean);
  
  // 文が少ない場合は分割しない
  if (sentences.length < 3) {
    return [text];
  }

  const chunks = [];
  let currentChunk = '';
  
  // 各文を処理し、約300〜500文字のチャンクに結合
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i] + (i < sentences.length - 1 ? '. ' : '');
    
    if (currentChunk.length + sentence.length > 500) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  
  // 残りのテキストがあれば追加
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  // 分割できなかった場合は元のテキストをそのまま返す
  return chunks.length ? chunks : [text];
} 