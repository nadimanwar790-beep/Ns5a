/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<unknown>;
};

/*
 * This is the single production service worker for the NSTA PWA.
 * Keeping Firebase Messaging here is important: PWA scanners and installed
 * browsers inspect /sw.js, not a second worker registered on another scope.
 */
precacheAndRoute(self.__WB_MANIFEST, {
  ignoreURLParametersMatching: [/^v$/],
});
self.skipWaiting();
clientsClaim();

type NstaPushPayload = {
  data?: Record<string, string>;
  notification?: { title?: string; body?: string; icon?: string };
  from?: string;
  messageId?: string;
  collapse_key?: string;
  fcmOptions?: unknown;
};

const showNstaNotification = (payload: NstaPushPayload) => {
  const data = payload.data || {};
  const notification = payload.notification || {};
  const title = notification.title || data.title || 'NSTA Study App';
  const body = notification.body || data.body || 'New notification received!';
  const type = data.type || 'DEFAULT';
  const url = data.url || '/';

  const toAbsoluteUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    try {
      return new URL(path, self.location.origin).href;
    } catch {
      return path;
    }
  };

  const rawIcon = notification.icon || data.icon || data.senderPhoto;
  const icon = toAbsoluteUrl((rawIcon && !rawIcon.endsWith('.svg')) ? rawIcon : '/icons/icon-192.png');
  const badge = toAbsoluteUrl('/icons/badge-monochrome.png');

  // Unique tag per notification with renotify=true ensures Android OS plays sound & pops banner every time
  const tagKey = data.messageId
    ? `nsta-${type}-${data.messageId}`
    : data.senderId
    ? `nsta-${type}-${data.senderId}-${Date.now()}`
    : `nsta-${type}-${Date.now()}`;

  const options: NotificationOptions & {
    renotify?: boolean;
    vibrate?: number[];
    silent?: boolean;
    timestamp?: number;
  } = {
    body,
    icon,
    badge,
    tag: tagKey,
    renotify: true,
    requireInteraction: true,
    silent: false,
    vibrate: [300, 150, 300, 150, 300],
    data: { url, ...data },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  return self.registration.showNotification(title, options).catch(() => {
    // Graceful fallback for mobile browsers that reject actions/vibrate
    return self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag: tagKey,
      renotify: true,
      requireInteraction: true,
      silent: false,
      data: { url, ...data },
    });
  });
};

// Handle all background push notifications (Web Push + Firebase Cloud Messaging)
// Displays alert banner and sound/vibration even when app is closed or device is locked
self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let payload: NstaPushPayload;
  try {
    payload = event.data.json() as NstaPushPayload;
  } catch {
    payload = { data: { body: event.data.text() } };
  }

  event.waitUntil(showNstaNotification(payload));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
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
          if ('navigate' in client) void client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined;
    }),
  );
});