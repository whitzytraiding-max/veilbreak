import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Settings } from './SettingsManager.js';

// Thin wrapper around Capacitor Haptics, gated by the player's setting. No-ops
// gracefully on web / unsupported devices (promise rejections are swallowed).
function safe(run) {
  if (!Settings.isHaptics()) return;
  try {
    const r = run();
    if (r && typeof r.catch === 'function') r.catch(() => {});
  } catch { /* unsupported */ }
}

export const Haptic = {
  light()  { safe(() => Haptics.impact({ style: ImpactStyle.Light })); },
  medium() { safe(() => Haptics.impact({ style: ImpactStyle.Medium })); },
  heavy()  { safe(() => Haptics.impact({ style: ImpactStyle.Heavy })); },
  success(){ safe(() => Haptics.notification({ type: NotificationType.Success })); },
  warning(){ safe(() => Haptics.notification({ type: NotificationType.Warning })); },
};
