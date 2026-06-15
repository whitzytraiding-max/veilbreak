import { Capacitor } from '@capacitor/core';

const IS_NATIVE = Capacitor.isNativePlatform();

const AD_IDS = {
  ios: {
    interstitial: 'ca-app-pub-5758394034635206/9440525293',
    rewarded:     'ca-app-pub-5758394034635206/2872237195',
  },
  android: {
    interstitial: 'ca-app-pub-5758394034635206/8304235691',
    rewarded:     'ca-app-pub-5758394034635206/9142969795',
  },
};

const platform = Capacitor.getPlatform();
const ids = AD_IDS[platform] || AD_IDS.ios;

let _admob = null;
let _levelsSinceInterstitial = 0;
let _interstitialReady = false;
let _rewardedReady = false;

async function _getAdMob() {
  if (_admob) return _admob;
  const mod = await import('@capacitor-community/admob');
  _admob = mod.AdMob;
  return _admob;
}

export const AdManager = {
  async init() {
    if (!IS_NATIVE) {
      console.log('[AdManager] web/dev — ads simulated');
      return;
    }
    try {
      const AdMob = await _getAdMob();
      await AdMob.initialize({ requestTrackingAuthorization: true });
      await Promise.all([_preloadInterstitial(), _preloadRewarded()]);
      console.log('[AdManager] initialized');
    } catch (e) {
      console.warn('[AdManager] init failed:', e);
    }
  },

  // Returns true when caller should show interstitial (every 10 levels)
  onLevelComplete() {
    _levelsSinceInterstitial += 1;
    if (_levelsSinceInterstitial >= 10) {
      _levelsSinceInterstitial = 0;
      return true;
    }
    return false;
  },

  async showInterstitial(onComplete) {
    if (!IS_NATIVE) {
      console.log('[AdManager] simulated interstitial');
      setTimeout(() => onComplete?.(), 800);
      return;
    }
    try {
      const AdMob = await _getAdMob();
      if (!_interstitialReady) await _preloadInterstitial();
      await AdMob.showInterstitial();
      _interstitialReady = false;
      _preloadInterstitial();
    } catch (e) {
      console.warn('[AdManager] interstitial failed:', e);
    } finally {
      onComplete?.();
    }
  },

  async showRewarded(type, onRewarded, onSkipped) {
    if (!IS_NATIVE) {
      console.log(`[AdManager] simulated rewarded type=${type}`);
      setTimeout(() => onRewarded?.(), 800);
      return;
    }
    try {
      const AdMob = await _getAdMob();
      if (!_rewardedReady) await _preloadRewarded();

      let rewarded = false;
      const listener = await AdMob.addListener('onRewardedVideoAdReward', () => {
        rewarded = true;
      });

      await AdMob.showRewardVideoAd();
      listener.remove();
      _rewardedReady = false;
      _preloadRewarded();

      if (rewarded) onRewarded?.();
      else onSkipped?.();
    } catch (e) {
      console.warn('[AdManager] rewarded failed:', e);
      onSkipped?.();
    }
  },
};

async function _preloadInterstitial() {
  try {
    const AdMob = await _getAdMob();
    await AdMob.prepareInterstitial({ adId: ids.interstitial });
    _interstitialReady = true;
  } catch (e) {
    console.warn('[AdManager] preload interstitial failed:', e);
  }
}

async function _preloadRewarded() {
  try {
    const AdMob = await _getAdMob();
    await AdMob.prepareRewardVideoAd({ adId: ids.rewarded });
    _rewardedReady = true;
  } catch (e) {
    console.warn('[AdManager] preload rewarded failed:', e);
  }
}

// Reward types: 'EXTRA_MOVES' | 'EXTRA_LIFE' | 'BOOSTER'
