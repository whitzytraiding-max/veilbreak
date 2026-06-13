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

  const config = {
    type: Phaser.AUTO,
    width: GAME_W,
    height: GAME_H,
    backgroundColor: '#080818',
    parent,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      resolution: window.devicePixelRatio || 1,
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
