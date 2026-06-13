// Retina render scaling.
//
// The game is authored in a fixed 400×800 design space, but the canvas backing
// store is created at design×RES device pixels (see PhaserGame.js) so it renders
// crisp on high-DPR phones. To keep every scene working in 400×800 coordinates,
// we zoom its main camera by RES and anchor that zoom at the top-left (origin 0,0)
// so the visible world stays exactly [0..400]×[0..800].
//
// Call fitCamera(this) at the very top of each scene's create().
export function fitCamera(scene) {
  const RES = window.__RES || 1;
  if (RES === 1) return;
  const cam = scene.cameras.main;
  cam.setOrigin(0, 0);
  cam.setZoom(RES);
}
