'use client';

import { useState } from 'react';
import { 
  useModel, 
  ChatModelType, 
  WhisperModelType, 
  TTSModelType,
  GPT4oMiniSettings,
  TTSPromptSettings
} from '../context/ModelContext';

export default function ModelSelector() {
  const { 
    chatModel, 
    setChatModel, 
    whisperModel, 
    setWhisperModel,
    ttsModel,
    setTtsModel,
    gpt4oMiniSettings,
    updateGpt4oMiniSettings,
    ttsPromptSettings,
    updateTtsPromptSettings,
    chatModelInfo,
    whisperModelInfo,
    ttsModelInfo
  } = useModel();

  const [showChatOptions, setShowChatOptions] = useState(false);
  const [showWhisperOptions, setShowWhisperOptions] = useState(false);
  const [showTtsOptions, setShowTtsOptions] = useState(false);
  
  // ChatGPTモデル選択時の処理
  const handleChatModelChange = (newModel: ChatModelType) => {
    setChatModel(newModel);
    setShowChatOptions(false);
  };
  
  // Whisperモデル選択時の処理
  const handleWhisperModelChange = (newModel: WhisperModelType) => {
    setWhisperModel(newModel);
    setShowWhisperOptions(false);
  };
  
  // TTSモデル選択時の処理
  const handleTtsModelChange = (newModel: TTSModelType) => {
    setTtsModel(newModel);
    setShowTtsOptions(false);
  };
  
  // GPT-4o Mini設定の更新
  const handleGpt4oMiniSettingChange = (key: keyof GPT4oMiniSettings) => {
    updateGpt4oMiniSettings({ [key]: !gpt4oMiniSettings[key] });
  };

  // TTSプロンプト設定の更新
  const handleTtsPromptSettingChange = (useCustom: boolean) => {
    updateTtsPromptSettings({ useCustomPrompt: useCustom });
  };

  // TTSプロンプトテキスト更新
  const handleTtsPromptTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateTtsPromptSettings({ voicePrompt: e.target.value });
  };

  return (
    <div className="space-y-4">
      {/* ChatGPTモデル選択 */}
      <div className="relative mb-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ChatGPTモデル
          </label>
          <button
            type="button"
            onClick={() => setShowChatOptions(!showChatOptions)}
            className="inline-flex items-center justify-center px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {chatModelInfo[chatModel].name}
            <svg
              className={`ml-2 h-4 w-4 transition-transform ${
                showChatOptions ? 'rotate-180' : ''
              }`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {showChatOptions && (
          <div className="absolute right-0 mt-1 w-56 rounded-md shadow-lg bg-white z-10 ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              {Object.entries(chatModelInfo).map(([modelKey, info]) => (
                <button
                  key={modelKey}
                  onClick={() => handleChatModelChange(modelKey as ChatModelType)}
                  className={`block w-full text-left px-4 py-2 text-sm ${
                    chatModel === modelKey
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{info.name}</div>
                  <div className="text-xs text-gray-500">{info.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* GPT-4o Miniの特別設定 */}
      {chatModel === 'gpt-4o-mini' && (
        <div className="p-3 bg-gray-50 rounded-lg mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">GPT-4o Mini設定</p>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={gpt4oMiniSettings.vision}
                onChange={() => handleGpt4oMiniSettingChange('vision')}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">画像認識 (Vision)</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={gpt4oMiniSettings.codeInterpreter}
                onChange={() => handleGpt4oMiniSettingChange('codeInterpreter')}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">コードインタプリタ</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={gpt4oMiniSettings.retrieval}
                onChange={() => handleGpt4oMiniSettingChange('retrieval')}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">ウェブ検索</span>
            </label>
          </div>
        </div>
      )}

      {/* Whisperモデル選択 */}
      <div className="relative mb-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            音声認識モデル
          </label>
          <button
            type="button"
            onClick={() => setShowWhisperOptions(!showWhisperOptions)}
            className="inline-flex items-center justify-center px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {whisperModelInfo[whisperModel].name}
            <svg
              className={`ml-2 h-4 w-4 transition-transform ${
                showWhisperOptions ? 'rotate-180' : ''
              }`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {showWhisperOptions && (
          <div className="absolute right-0 mt-1 w-56 rounded-md shadow-lg bg-white z-10 ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              {Object.entries(whisperModelInfo).map(([modelKey, info]) => (
                <button
                  key={modelKey}
                  onClick={() => handleWhisperModelChange(modelKey as WhisperModelType)}
                  className={`block w-full text-left px-4 py-2 text-sm ${
                    whisperModel === modelKey
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{info.name}</div>
                  <div className="text-xs text-gray-500">{info.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* TTSモデル選択 */}
      <div className="relative mb-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            音声合成モデル
          </label>
          <button
            type="button"
            onClick={() => setShowTtsOptions(!showTtsOptions)}
            className="inline-flex items-center justify-center px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {ttsModelInfo[ttsModel].name}
            <svg
              className={`ml-2 h-4 w-4 transition-transform ${
                showTtsOptions ? 'rotate-180' : ''
              }`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {showTtsOptions && (
          <div className="absolute right-0 mt-1 w-56 rounded-md shadow-lg bg-white z-10 ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              {Object.entries(ttsModelInfo).map(([modelKey, info]) => (
                <button
                  key={modelKey}
                  onClick={() => handleTtsModelChange(modelKey as TTSModelType)}
                  className={`block w-full text-left px-4 py-2 text-sm ${
                    ttsModel === modelKey
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{info.name}</div>
                  <div className="text-xs text-gray-500">{info.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* GPT-4o Mini TTSのプロンプト設定 */}
      {ttsModel === 'gpt-4o-mini-tts' && (
        <div className="p-3 bg-gray-50 rounded-lg mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">GPT-4o Mini TTS 声質設定</p>
          
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={ttsPromptSettings.useCustomPrompt}
                onChange={() => handleTtsPromptSettingChange(!ttsPromptSettings.useCustomPrompt)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">カスタム声質プロンプトを使用</span>
            </label>
            
            {ttsPromptSettings.useCustomPrompt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  声質プロンプト
                </label>
                <textarea
                  value={ttsPromptSettings.voicePrompt}
                  onChange={handleTtsPromptTextChange}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: あなたは落ち着いた声で読み上げてください"
                />
                <p className="text-xs text-gray-500 mt-1">
                  声質を指定するプロンプトを入力してください。例: 「あなたは元気な女性の声で話してください」
                </p>
              </div>
            )}

            <div className="mt-2">
              <p className="text-xs text-gray-700">声質プリセット：</p>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button 
                  className="text-xs bg-white px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                  onClick={() => updateTtsPromptSettings({ 
                    useCustomPrompt: true, 
                    voicePrompt: 'あなたは落ち着いた男性の声で読み上げてください' 
                  })}
                >
                  落ち着いた男性声
                </button>
                <button 
                  className="text-xs bg-white px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                  onClick={() => updateTtsPromptSettings({ 
                    useCustomPrompt: true, 
                    voicePrompt: 'あなたは明るく元気な女性の声で読み上げてください' 
                  })}
                >
                  明るい女性声
                </button>
                <button 
                  className="text-xs bg-white px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                  onClick={() => updateTtsPromptSettings({ 
                    useCustomPrompt: true, 
                    voicePrompt: 'あなたは低く重厚な声で読み上げてください' 
                  })}
                >
                  低く重厚な声
                </button>
                <button 
                  className="text-xs bg-white px-2 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                  onClick={() => updateTtsPromptSettings({ 
                    useCustomPrompt: true, 
                    voicePrompt: 'あなたは優しく穏やかな声で読み上げてください' 
                  })}
                >
                  優しく穏やかな声
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 