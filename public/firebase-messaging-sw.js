/* NSTA background FCM worker.
 * Handles push notifications with native browser push event and Firebase messaging compat.
 * Works even when app is closed or phone is locked.
 */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

try {
  firebase.initializeApp({
    apiKey: 'AIzaSyCtjCnVHwFIj9NPWZnVXcm4Ayw5YZJna54',
    authDomain: 'nst2512-6a2e4.firebaseapp.com',
    databaseURL: 'https://nst2512-6a2e4-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'nst2512-6a2e4',
    storageBucket: 'nst2512-6a2e4.firebasestorage.app',
    messagingSenderId: '1041659780014',
    appId: '1:1041659780014:web:26db9e156334f2de87063f',
    measurementId: 'G-VRSSQK3TB0',
  });

  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const notification = payload.notification || {};
    const title = notification.title || data.title || 'NSTA Study App';
    const body = notification.body || data.body || 'New notification received!';
    const type = data.type || 'DEFAULT';
    const url = data.url || '/';
    const urgent = type === 'CHAT' || type === 'FRIEND_REQUEST' || type === 'DIRECT_MESSAGE';

    return self.registration.showNotification(title, {
      body,
      icon: notification.icon || data.icon || data.senderPhoto || '/icons/icon-192.png?v=3',
      badge: '/icons/icon-192.png?v=3',
      tag: data.senderId ? `nsta-${type}-${data.senderId}` : `nsta-${type}-${Date.now()}`,
      renotify: urgent,
      requireInteraction: urgent,
      vibrate: urgent ? [200, 100, 200] : [100, 50, 100],
      data: { url, ...data },
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    }).catch(() => {
      return self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png?v=3',
        badge: '/icons/icon-192.png?v=3',
        data: { url, ...data },
      });
    });
  });
} catch (e) {
  console.warn('[FCM SW] Compat messaging init warning:', e);
}

// Native Web Push listener: Guarantees display when device is locked or app is closed,
// regardless of whether FCM compat script has executed or if payload is raw Web Push.
self.addEventListener('push', (event) => {
  let title = 'NSTA Study App';
  let body = 'New notification received!';
  let data = {};

  if (event.data) {
    try {
      const parsed = event.data.json();
      const notif = parsed.notification || {};
      const payloadData = parsed.data || {};
      title = notif.title || payloadData.title || title;
      body = notif.body || payloadData.body || body;
      data = { ...payloadData, ...notif };
    } catch (_) {
      try {
        body = event.data.text() || body;
      } catch (_) {}
    }
  }

  const type = data.type || 'DEFAULT';
  const isSchoolUrgent =
    type === 'MONTHLY_FEE' ||
    type === 'FEE_RECEIPT' ||
    type === 'SCHOOL_NOTICE' ||
    type === 'SCHOOL_HOLIDAY' ||
    data.urgent === '1';
  const urgent = isSchoolUrgent || type === 'CHAT' || type === 'FRIEND_REQUEST' || type === 'DIRECT_MESSAGE';

  const openTitle =
    type === 'MONTHLY_FEE' || type === 'FEE_RECEIPT'
      ? 'Fee Passbook खोलें'
      : type === 'SCHOOL_NOTICE' || type === 'SCHOOL_HOLIDAY'
      ? 'Notice देखें'
      : 'Open App';

  const tagKey = data.studentId
    ? `nsta-${type}-${data.studentId}`
    : data.senderId
    ? `nsta-${type}-${data.senderId}`
    : `nsta-${type}-${Date.now()}`;

  const promise = self.registration.showNotification(title, {
    body,
    icon: data.icon || data.senderPhoto || '/icons/icon-192.png?v=3',
    badge: '/icons/icon-192.png?v=3',
    tag: tagKey,
    renotify: true,
    requireInteraction: urgent,
    vibrate: urgent ? [250, 100, 250, 100, 250] : [100, 50, 100],
    data: { url: data.url || '/', ...data },
    actions: [
      { action: 'open', title: openTitle },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }).catch(() => {
    return self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png?v=3',
      badge: '/icons/icon-192.png?v=3',
      data: { url: data.url || '/', ...data },
    });
  });

  event.waitUntil(promise);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          try {
            client.postMessage({
              type: 'SCHOOL_PUSH_NAVIGATE',
              url: targetUrl,
              studentId: notifData.studentId || '',
              schoolId: notifData.schoolId || '',
              notifType: notifData.type || '',
            });
          } catch (_) {}
          if ('navigate' in client) client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow ? clients.openWindow(targetUrl) : undefined;
    }),
  );
});