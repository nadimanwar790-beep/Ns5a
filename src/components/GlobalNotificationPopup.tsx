import React from 'react';

export interface InAppNotificationItem {
  id: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
  type?: string;
  timestamp: number;
}

/**
 * GlobalNotificationPopup:
 * Disabled: When the app is open, in-app notification popup is completely disabled
 * so that users are never disturbed by popups while browsing the app.
 */
export const GlobalNotificationPopup: React.FC = () => {
  return null;
};

