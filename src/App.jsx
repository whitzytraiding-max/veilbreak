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

    // Safe-area insets (status bar / notch) can be applied AFTER first paint,
    // especially on Android edge-to-edge. That shifts the canvas down, but
    // Phaser caches the canvas screen-position at boot for mapping touches →
    // game coords, leaving it stale — so every touch lands ~one row below the
    // finger. Recompute the bounds once insets settle and on any layout change.
    const refreshBounds = () => {
      const g = gameRef.current;
      if (g && g.scale) {
        g.scale.refresh();
        g.scale.updateBounds();
      }
    };
    const t1 = setTimeout(refreshBounds, 200);
    const t2 = setTimeout(refreshBounds, 900);
    const onVisible = () => {
      if (document.visibilityState === 'visible') setTimeout(refreshBounds, 150);
    };
    window.addEventListener('resize', refreshBounds);
    window.addEventListener('orientationchange', refreshBounds);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('touchstart', unlockAudio, true);
      document.removeEventListener('mousedown', unlockAudio, true);
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', refreshBounds);
      window.removeEventListener('orientationchange', refreshBounds);
      document.removeEventListener('visibilitychange', onVisible);
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
        background: '#05040F',
      }}
    />
  );
}
