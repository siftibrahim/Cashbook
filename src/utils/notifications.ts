/**
 * Web Push & In-App Notification Utility with Sound Alert
 */

// Sound alert for incoming notifications
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Two-tone pleasant notification chime
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.1); // A5

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (e) {
    // Ignore audio context autoplay limitations
  }
}

/**
 * Request Browser Notification Permission
 */
export async function requestBrowserNotificationPermission(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window) || !Notification) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied' && typeof Notification.requestPermission === 'function') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
  } catch (err) {
    console.warn('Notification permission request notice:', err);
  }

  return false;
}

/**
 * Trigger System / Phone Push Notification
 */
export function triggerSystemPushNotification(title: string, body: string, icon = '/icon.png') {
  playNotificationSound();

  try {
    if (typeof window === 'undefined' || !('Notification' in window) || !Notification) return;

    if (Notification.permission === 'granted') {
      const notif = new Notification(title, {
        body,
        icon,
        badge: icon,
        vibrate: [200, 100, 200] as any,
        tag: 'twing_notif_' + Date.now(),
      } as any);

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
  } catch (e) {
    console.warn('Error firing native notification:', e);
  }
}
