'use client';

import { useState } from 'react';
import { useVoice, VOICE_INFO, VoiceType } from '../context/VoiceContext';

export default function VoiceSelector() {
  const { voice, setVoice, voiceInfo } = useVoice();
  const [isOpen, setIsOpen] = useState(false);

  const handleVoiceChange = (newVoice: VoiceType) => {
    setVoice(newVoice);
    setIsOpen(false);
  };

  return (
    <div className="relative mb-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          音声の選択
        </label>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-center px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {voiceInfo[voice].name}
          <svg
            className={`ml-2 h-4 w-4 transition-transform ${
              isOpen ? 'rotate-180' : ''
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

      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 rounded-md shadow-lg bg-white z-10 ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {Object.entries(voiceInfo).map(([voiceKey, info]) => (
              <button
                key={voiceKey}
                onClick={() => handleVoiceChange(voiceKey as VoiceType)}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  voice === voiceKey
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
  );
} 