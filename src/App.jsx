import React, { useEffect, useRef } from 'react';
import { createPhaserGame } from './game/PhaserGame.js';
import { AudioManager } from './game/managers/AudioManager.js';

export default function App() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    // iOS WKWebView: unlock AudioContext synchronously on very first touch
    const unlockAudio = () => {
      AudioManager.unlock();
      document.removeEventListener('touchstart', unlockAudio, true);
      document.removeEventListener('mousedown', unlockAudio, true);
    };
    document.addEventListener('touchstart', unlockAudio, true);
    document.addEventListener('mousedown', unlockAudio, true);

    if (!gameRef.current && containerRef.current) {
      gameRef.current = createPhaserGame(containerRef.current);
    }

    return () => {
      document.removeEventListener('touchstart', unlockAudio, true);
      document.removeEventListener('mousedown', unlockAudio, true);
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 0px)',
        left: 'env(safe-area-inset-left, 0px)',
        right: 'env(safe-area-inset-right, 0px)',
        bottom: 'env(safe-area-inset-bottom, 0px)',
        touchAction: 'none',
        background: '#080818',
      }}
    />
  );
}
