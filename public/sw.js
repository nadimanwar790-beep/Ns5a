/* NSTA unified root PWA & Web Push Service Worker.
 * Handles offline caching delegation, background Web Push & Firebase Messaging.
 * Guarantees Android WebAPK app attribution (NSTA app name and logo).
 */
self.skipWaiting();

// In-memory cache to prevent duplicate notification banners within 3 seconds
const seenPushMap = new Map();
function isDuplicatePush(id) {
  if (!id) return false;
  const now = Date.now();
  const lastSeen = seenPushMap.get(id);
  if (lastSeen && now - lastSeen < 3000) {
    return true;
  }
  seenPushMap.set(id, now);
  if (seenPushMap.size > 200) {
    for (const [k, v] of seenPushMap.entries()) {
      if (now - v > 60000) seenPushMap.delete(k);
    }
  }
  return false;
}

function toAbsoluteUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  try {
    return new URL(path, self.location.origin).href;
  } catch (_) {
    return path;
  }
}

function displayPushNotification(title, body, data, iconUrl) {
  const notifId = data.id || data.messageId || (title + '_' + (data.timestamp || ''));
  if (isDuplicatePush(notifId)) {
    return Promise.resolve();
  }

  const candidateIcon = (data && (data.senderPhoto || data.icon)) || iconUrl;
  const rawIcon = (candidateIcon && !candidateIcon.endsWith('.svg')) ? candidateIcon : '/icons/icon-192.png?v=3';
  const icon = toAbsoluteUrl(rawIcon);
  const badge = toAbsoluteUrl('/icons/badge-monochrome.png?v=4');
  // Fresh unique tag forces Android to pop up a heads-up banner over other apps instead of silently collapsing
  const tagKey = 'nsta-alert-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);

  const richOptions = {
    body: body || 'New update received!',
    icon: icon,
    badge: badge,
    tag: tagKey,
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: [500, 200, 500, 200, 500],
    timestamp: Date.now(),
    data: { url: data.url || '/', ...data },
    actions: [
      { action: 'open', title: 'खोलें (Open)' },
      { action: 'dismiss', title: 'हटाएं' },
    ],
  };

  return self.registration.showNotification(title || 'NSTA Alert', richOptions).catch(() => {
    // Fallback without actions for mobile browsers with strict notification action policies
    return self.registration.showNotification(title || 'NSTA Alert', {
      body: body || 'New update received!',
      icon: icon,
      badge: badge,
      tag: tagKey,
      renotify: true,
      requireInteraction: true,
      silent: false,
      vibrate: [500, 200, 500, 200, 500],
      timestamp: Date.now(),
      data: { url: data.url || '/', ...data },
    });
  });
}

try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

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
    const icon = notification.icon || data.icon || data.senderPhoto || '/icons/icon-192.png?v=3';

    return displayPushNotification(title, body, { ...data, ...notification }, icon);
  });
} catch (e) {
  console.warn('[SW] Compat messaging init warning:', e);
}

// Native Web Push listener: Guarantees display when device is locked or app is closed,
// regardless of whether FCM compat script has executed or if payload is raw Web Push.
self.addEventListener('push', (event) => {
  let title = 'NSTA Study App';
  let body = 'New notification received!';
  let data = {};
  let icon = '/icons/icon-192.png?v=3';

  if (event.data) {
    try {
      const parsed = event.data.json();
      const notif = parsed.notification || {};
      const payloadData = parsed.data || {};
      title = notif.title || payloadData.title || title;
      body = notif.body || payloadData.body || body;
      icon = notif.icon || payloadData.icon || payloadData.senderPhoto || icon;
      data = { ...payloadData, ...notif };
    } catch (_) {
      try {
        body = event.data.text() || body;
      } catch (_) {}
    }
  }

  event.waitUntil(displayPushNotification(title, body, data, icon));
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
              notifType: notifData.type || notifData.notifType || '',
              tab: notifData.tab || notifData.schoolTab || '',
              schoolTab: notifData.schoolTab || notifData.tab || '',
              threadType: notifData.threadType || '',
              classId: notifData.classId || '',
              teacherId: notifData.teacherId || '',
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
