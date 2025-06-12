'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/app/context/AdminContext';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function TTSDebugPage() {
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const [isClient, setIsClient] = useState(false);
  const [text, setText] = useState('Hello, this is a test of the TTS system.');
  const [voice, setVoice] = useState('nova');
  const [model, setModel] = useState('tts-1-hd');
  const [saveFile, setSaveFile] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [storageFiles, setStorageFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 管理者でない場合はログインページにリダイレクト
  useEffect(() => {
    if (isClient && !isAdmin) {
      router.push('/admin');
    } else if (isClient) {
      fetchStorageFiles();
    }
  }, [isAdmin, router, isClient]);

  const addLog = (message: string) => {
    setLogMessages(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]}: ${message}`]);
  };

  const fetchStorageFiles = async () => {
    setIsLoadingFiles(true);
    try {
      addLog('Supabaseストレージからファイル一覧を取得中...');
      const { data, error } = await supabase
        .storage
        .from('audio-files')
        .list();

      if (error) {
        throw error;
      }

      addLog(`${data.length}件のファイルを取得しました`);
      setStorageFiles(data);
    } catch (error) {
      console.error('ファイル一覧取得エラー:', error);
      addLog(`エラー: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const generateTTS = async () => {
    if (!text.trim()) {
      setError('テキストを入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAudioUrl(null);
    addLog(`音声生成開始: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);

    try {
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice,
          model,
          save: saveFile
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '音声生成に失敗しました');
      }

      if (data.isDummy) {
        addLog('ダミー音声URLが返されました。APIキーが設定されていない可能性があります。');
      }

      if (data.audioUrl) {
        addLog(`音声URL取得: ${data.audioUrl}`);
        setAudioUrl(data.audioUrl);
      } else if (data.audioBase64) {
        addLog('Base64音声データ取得');
        setAudioUrl(data.audioBase64);
      }

      // 更新されたファイル一覧を取得
      fetchStorageFiles();
    } catch (error) {
      console.error('TTS生成エラー:', error);
      setError(error instanceof Error ? error.message : String(error));
      addLog(`エラー: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFile = async (fileName: string) => {
    if (!confirm(`ファイル "${fileName}" を削除しますか？`)) {
      return;
    }

    try {
      addLog(`ファイル削除中: ${fileName}`);
      const { error } = await supabase
        .storage
        .from('audio-files')
        .remove([fileName]);

      if (error) {
        throw error;
      }

      addLog(`ファイル削除成功: ${fileName}`);
      fetchStorageFiles();
    } catch (error) {
      console.error('ファイル削除エラー:', error);
      addLog(`削除エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const playFile = async (fileName: string) => {
    try {
      addLog(`ファイル再生: ${fileName}`);
      const { data } = await supabase
        .storage
        .from('audio-files')
        .getPublicUrl(fileName);

      if (data && data.publicUrl) {
        setAudioUrl(data.publicUrl);
      }
    } catch (error) {
      console.error('ファイル再生エラー:', error);
      addLog(`再生エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // クライアントサイドレンダリングの前は何も表示しない
  if (!isClient) {
    return null;
  }

  // 管理者でない場合は何も表示しない（リダイレクト処理中）
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">TTSデバッグツール</h1>
          <div className="flex items-center space-x-4">
            <Link href="/admin/dashboard" className="text-blue-600 hover:text-blue-800">
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-1/2 bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-2">音声生成</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">テキスト</label>
              <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">音声</label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="alloy">Alloy</option>
                  <option value="echo">Echo</option>
                  <option value="fable">Fable</option>
                  <option value="onyx">Onyx</option>
                  <option value="nova">Nova</option>
                  <option value="shimmer">Shimmer</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">モデル</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 text-black"
                >
                  <option value="tts-1">tts-1 (標準)</option>
                  <option value="tts-1-hd">tts-1-hd (高品質)</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={saveFile}
                    onChange={(e) => setSaveFile(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium">ファイルとして保存</span>
                </label>
              </div>
            </div>
            
            <button
              onClick={generateTTS}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '生成中...' : '音声を生成'}
            </button>
            
            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}
            
            {audioUrl && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">生成された音声</h3>
                <audio 
                  src={audioUrl} 
                  controls 
                  className="w-full" 
                  onError={(e) => {
                    console.error('音声再生エラー:', e);
                    addLog(`音声再生エラー: ${audioUrl}`);
                  }}
                />
                <p className="text-sm text-gray-500 mt-1 break-all">{audioUrl}</p>
              </div>
            )}
          </div>
          
          <div className="w-full md:w-1/2">
            <div className="bg-white p-4 rounded shadow mb-4">
              <h2 className="text-xl font-semibold mb-2">ログ</h2>
              <div className="h-40 overflow-y-auto bg-gray-100 p-2 rounded text-sm font-mono">
                {logMessages.length > 0 ? (
                  logMessages.map((log, index) => (
                    <div key={index} className="mb-1">{log}</div>
                  ))
                ) : (
                  <div className="text-gray-500">ログはまだありません</div>
                )}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded shadow">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold">保存されたファイル</h2>
                <button
                  onClick={fetchStorageFiles}
                  disabled={isLoadingFiles}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm py-1 px-2 rounded"
                >
                  {isLoadingFiles ? '読み込み中...' : '更新'}
                </button>
              </div>
              
              {isLoadingFiles ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              ) : storageFiles.length > 0 ? (
                <div className="overflow-y-auto max-h-80">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="py-2 px-3 text-left">ファイル名</th>
                        <th className="py-2 px-3 text-right">サイズ</th>
                        <th className="py-2 px-3 text-right">アクション</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storageFiles.map((file) => (
                        <tr key={file.name} className="border-t hover:bg-gray-50">
                          <td className="py-2 px-3 truncate max-w-[200px]">{file.name}</td>
                          <td className="py-2 px-3 text-right">{Math.round(file.metadata.size / 1024)} KB</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={() => playFile(file.name)}
                              className="text-blue-500 hover:text-blue-700 mr-2"
                            >
                              再生
                            </button>
                            <button
                              onClick={() => deleteFile(file.name)}
                              className="text-red-500 hover:text-red-700"
                            >
                              削除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-gray-500 py-4 text-center">
                  保存されたファイルはありません
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 