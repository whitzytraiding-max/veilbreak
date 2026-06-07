// Stub AdManager — replace internals with AdMob Capacitor plugin when ready.
// All game logic already routes through these methods so integration is one file.

let _adReadyCallback = null;
let _levelsSinceInterstitial = 0;

export const AdManager = {
  init() {
    // TODO: Capacitor AdMob init
    // AdMob.initialize({ requestTrackingAuthorization: true });
    console.log('[AdManager] initialized (stub)');
  },

  // Called after each level completion
  onLevelComplete() {
    _levelsSinceInterstitial += 1;
    if (_levelsSinceInterstitial >= 10) {
      _levelsSinceInterstitial = 0;
      return true; // caller should show interstitial
    }
    return false;
  },

  // Show mandatory interstitial (every 10 levels, story panel reveal gate)
  showInterstitial(onComplete) {
    console.log('[AdManager] showInterstitial');
    // TODO: AdMob.showInterstitial()
    // Simulate 1s ad delay in dev
    setTimeout(() => onComplete?.(), 1000);
  },

  // Show rewarded ad and call onRewarded if user watches to completion
  showRewarded(type, onRewarded, onSkipped) {
    console.log(`[AdManager] showRewarded type=${type}`);
    // TODO: real ad — for now simulate
    const watched = true; // always reward in dev
    setTimeout(() => {
      if (watched) onRewarded?.();
      else onSkipped?.();
    }, 800);
  },
};

// Reward types used by the game:
//   'EXTRA_MOVES'  → +3 moves on fail screen
//   'EXTRA_LIFE'   → +1 life on no-lives screen
//   'BOOSTER'      → a random booster on game over
