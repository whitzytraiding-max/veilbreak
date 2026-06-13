import Phaser from 'phaser';
import { GAME_W, GAME_H } from './constants.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { WorldMapScene } from './scenes/WorldMapScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIOverlayScene } from './scenes/UIOverlayScene.js';
import { WinScene } from './scenes/WinScene.js';
import { FailScene } from './scenes/FailScene.js';
import { StoryScene } from './scenes/StoryScene.js';
import { AdManager } from './managers/AdManager.js';

export function createPhaserGame(parent) {
  AdManager.init();

  // Retina crispness: Phaser renders the canvas backing store at width×height.
  // A 400×800 design upscaled to a 3× phone screen looks soft, so we render the
  // canvas at design×RES backing pixels and zoom every scene camera by RES — the
  // game keeps working in 400×800 design coords (see fitCamera in scenes), while
  // the actual pixels drawn match the device. Capped at 3 to bound fill-rate.
  const RES = Math.min(Math.max(Math.round(window.devicePixelRatio || 1), 1), 3);
  window.__RES = RES;

  const config = {
    type: Phaser.AUTO,
    width: GAME_W * RES,
    height: GAME_H * RES,
    backgroundColor: '#05040F',
    parent,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false,
    },
    input: {
      activePointers: 3,
    },
    scene: [
      BootScene,
      MenuScene,
      WorldMapScene,
      GameScene,
      UIOverlayScene,
      WinScene,
      FailScene,
      StoryScene,
    ],
  };

  const game = new Phaser.Game(config);
  window.__veilbreak = game; // dev access
  return game;
}
