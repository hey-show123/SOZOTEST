import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import FormData from 'form-data';
import { IncomingForm } from 'formidable';
import fs from 'fs';
import { promisify } from 'util';

// Next.jsのデフォルトのボディパーサーを無効化
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tempFilePath: string | null = null;

  try {
    // OpenAI APIキーの確認
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // ファイル処理のために formidable を使用
    const readFile = (req: NextApiRequest) => {
      return new Promise<{ fields: any; files: any }>((resolve, reject) => {
        const form = new IncomingForm({
          multiples: false,
          keepExtensions: true,
          maxFileSize: 25 * 1024 * 1024, // 25MB制限
        });

        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      });
    };

    // ファイルを受け取る
    const { files } = await readFile(req);
    const file = files.file;

    if (!file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    tempFilePath = file.filepath;
    
    // ファイルサイズをチェック
    const stats = fs.statSync(tempFilePath as string);
    console.log(`Received audio file: ${stats.size} bytes, type: ${file.mimetype}`);

    if (stats.size === 0) {
      return res.status(400).json({ error: 'Audio file is empty' });
    }

    if (stats.size < 100) {
      return res.status(400).json({ error: 'Audio file is too small' });
    }

    // FormDataを作成
    const formData = new FormData();
    formData.append('file', fs.createReadStream(tempFilePath as string), {
      filename: file.originalFilename || 'audio.webm',
      contentType: file.mimetype || 'audio/webm',
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // 英語に設定

    console.log('Sending to OpenAI Whisper API...');

    // OpenAI APIに送信
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        timeout: 30000, // 30秒のタイムアウト
      }
    );

    console.log('Whisper API response:', response.data);

    // 結果を検証
    if (!response.data || typeof response.data.text !== 'string') {
      console.error('Invalid response from Whisper API:', response.data);
      return res.status(500).json({ error: 'Invalid response from Whisper API' });
    }

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error in transcribe API:', error);
    
    // より詳細なエラー情報を提供
    if (axios.isAxiosError(error)) {
      console.error('Axios error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      
      if (error.response?.status === 413) {
        return res.status(413).json({ error: 'Audio file too large' });
      }
      
      if (error.response?.status === 400) {
        return res.status(400).json({ 
          error: 'Invalid audio format or OpenAI API error',
          details: error.response?.data?.error?.message 
        });
      }
      
      return res.status(500).json({ 
        error: 'OpenAI API error',
        details: error.response?.data?.error?.message || 'Unknown API error'
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to transcribe audio',
      details: error.message 
    });
  } finally {
    // 一時ファイルを確実に削除
    if (tempFilePath) {
      try {
        const unlink = promisify(fs.unlink);
        await unlink(tempFilePath);
        console.log('Temporary file cleaned up');
      } catch (cleanupError) {
        console.error('Failed to cleanup temporary file:', cleanupError);
      }
    }
  }
} 