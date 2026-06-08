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
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
    />
  );
}
