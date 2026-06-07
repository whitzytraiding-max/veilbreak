import React, { useEffect, useRef } from 'react';
import { createPhaserGame } from './game/PhaserGame.js';

export default function App() {
  const containerRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    if (!gameRef.current && containerRef.current) {
      gameRef.current = createPhaserGame(containerRef.current);
    }
    return () => {
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
