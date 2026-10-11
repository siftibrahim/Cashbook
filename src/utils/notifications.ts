export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.requestPermission();
  }
  return Promise.resolve('denied' as NotificationPermission);
}

export function sendBrowserNotification(title: string, options?: NotificationOptions): void {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, options);
  }
}
