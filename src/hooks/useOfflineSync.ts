import { useEffect, useState } from "react";
import {
  getOfflineSyncSnapshot,
  subscribeOfflineSyncState,
  flushOfflineSyncQueue,
  retryFailedOfflineSyncItems,
  clearFailedOfflineSyncItems,
  removeOfflineSyncItem,
  type OfflineSyncSnapshot,
} from "../services/offlineSyncService";

export function useOfflineSync() {
  const [snapshot, setSnapshot] = useState<OfflineSyncSnapshot>(() => getOfflineSyncSnapshot());

  useEffect(() => {
    const unsub = subscribeOfflineSyncState(setSnapshot);
    return unsub;
  }, []);

  return {
    ...snapshot,
    syncNow: (forceFailed = true) => flushOfflineSyncQueue(forceFailed),
    retryFailed: retryFailedOfflineSyncItems,
    clearFailed: clearFailedOfflineSyncItems,
    removeItem: removeOfflineSyncItem,
  };
}
