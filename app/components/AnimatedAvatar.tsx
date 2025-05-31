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

  // コンソールログでアニメーション状態を確認
  useEffect(() => {
    console.log('アニメーション状態:', isPlaying ? '再生中' : '停止中', '現在の画像:', currentImage);
  }, [isPlaying, currentImage]);

  return (
    <div className="avatar-background absolute top-[10%] left-0 right-0 flex justify-center pointer-events-none">
      <div className="relative w-auto h-auto max-w-[400px]">
        {currentImage === 'closed' ? (
          <Image
            src="/images/avatar/avatar-closed.png"
            alt="AI Avatar"
            width={400}
            height={400}
            className="object-contain"
            priority
          />
        ) : (
          <Image
            src="/images/avatar/avatar-open.png"
            alt="AI Avatar Speaking"
            width={400}
            height={400}
            className="object-contain"
            priority
          />
        )}
      </div>
    </div>
  );
} 