'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface AnimatedAvatarProps {
  isPlaying: boolean; // 音声が再生中かどうか
}

export default function AnimatedAvatar({ isPlaying }: AnimatedAvatarProps) {
  const [currentImage, setCurrentImage] = useState<'closed' | 'open'>('closed');
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // 音声再生状態が変わったときの処理
  useEffect(() => {
    // 以前のインターバルをクリア
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }

    // 音声再生中なら画像を交互に切り替える
    if (isPlaying) {
      const id = setInterval(() => {
        setCurrentImage((prev) => (prev === 'closed' ? 'open' : 'closed'));
      }, 500); // 0.5秒間隔で切り替え
      setIntervalId(id);
    } else {
      // 再生していないときは口を閉じた状態にする
      setCurrentImage('closed');
    }

    // クリーンアップ関数
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPlaying]);

  return (
    <div className="avatar-background fixed top-0 left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none z-0">
      <div className="relative w-full h-full max-w-xl max-h-xl flex items-start justify-center">
        {currentImage === 'closed' ? (
          <Image
            src="/images/avatar/avatar-closed.png"
            alt="AI Avatar"
            width={500}
            height={500}
            className="object-contain"
            priority
          />
        ) : (
          <Image
            src="/images/avatar/avatar-open.png"
            alt="AI Avatar Speaking"
            width={500}
            height={500}
            className="object-contain"
            priority
          />
        )}
      </div>
    </div>
  );
} 