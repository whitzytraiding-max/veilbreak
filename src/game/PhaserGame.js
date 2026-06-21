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
import { SettingsScene } from './scenes/SettingsScene.js';
import { AdManager } from './managers/AdManager.js';

export function createPhaserGame(parent) {
  AdManager.init();

  // Retina crispness vs fill-rate: Phaser renders the canvas backing store at
  // width×height. A 400×800 design upscaled to a high-DPR phone looks soft, so
  // we render at design×RES backing pixels and zoom every scene camera by RES
  // (game keeps working in 400×800 design coords, see fitCamera in scenes).
  // Capped at 2: this game leans heavily on additive-blended glows, so fill-rate
  // is the bottleneck — 3× backing (1200×2400) tanks frame-rate and battery on
  // mid devices for little visible gain on soft glow art. 2× stays crisp.
  const RES = Math.min(Math.max(Math.round(window.devicePixelRatio || 1), 1), 2);
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
      SettingsScene,
    ],
  };

  const game = new Phaser.Game(config);
  window.__veilbreak = game; // dev access
  return game;
}
