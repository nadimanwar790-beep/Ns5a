import React, { useEffect, useRef, useState } from "react";
import {
  WifiOff,
  CloudUpload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { toast } from "sonner";

export const GlobalOfflineSyncBar: React.FC = () => {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    syncProgress,
    lastSyncedAt,
    lastSyncedCount,
    items,
    syncNow,
    retryFailed,
    clearFailed,
    removeItem,
  } = useOfflineSync();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showJustSyncedBanner, setShowJustSyncedBanner] = useState(false);
  const prevWasOfflineOrPending = useRef(false);
  const prevLastSyncedAt = useRef<string | null>(lastSyncedAt);

  useEffect(() => {
    if (!isOnline || pendingCount > 0) {
      prevWasOfflineOrPending.current = true;
    }
  }, [isOnline, pendingCount]);

  useEffect(() => {
    if (
      lastSyncedAt &&
      lastSyncedAt !== prevLastSyncedAt.current &&
      lastSyncedCount > 0 &&
      pendingCount === 0 &&
      !isSyncing
    ) {
      prevLastSyncedAt.current = lastSyncedAt;
      setShowJustSyncedBanner(true);
      if (prevWasOfflineOrPending.current) {
        prevWasOfflineOrPending.current = false;
        toast.success(`☁️ ${lastSyncedCount} offline data records cloud par sync ho gaye!`);
      }
      const t = setTimeout(() => setShowJustSyncedBanner(false), 4500);
      return () => clearTimeout(t);
    }
  }, [lastSyncedAt, lastSyncedCount, pendingCount, isSyncing]);

  const totalPendingOrFailed = pendingCount + failedCount;
  const shouldShowPill = !isOnline || isSyncing || totalPendingOrFailed > 0 || showJustSyncedBanner;

  if (!shouldShowPill && !drawerOpen) {
    return null;
  }

  return (
    <>
      {shouldShowPill && (
        <div className="fixed bottom-4 right-3 sm:right-5 z-[9980] flex flex-col items-end gap-2 pointer-events-none">
          <button
            type="button"
            onClick={() => {
              if (isOnline && pendingCount > 0 && !isSyncing && items.length <= 1) {
                void syncNow(true);
              } else {
                setDrawerOpen(true);
              }
            }}
            className={`pointer-events-auto flex items-center gap-2.5 px-3.5 py-2 rounded-2xl shadow-xl border backdrop-blur-md transition-all active:scale-95 text-left ${
              showJustSyncedBanner && totalPendingOrFailed === 0 && isOnline && !isSyncing
                ? "bg-emerald-600/95 border-emerald-400 text-white"
                : !isOnline
                ? "bg-slate-900/95 border-amber-500/60 text-amber-100"
                : isSyncing
                ? "bg-indigo-600/95 border-indigo-400 text-white"
                : failedCount > 0
                ? "bg-rose-600/95 border-rose-400 text-white"
                : "bg-amber-600/95 border-amber-400 text-white"
            }`}
          >
            <div className="shrink-0 flex items-center justify-center">
              {showJustSyncedBanner && totalPendingOrFailed === 0 && isOnline && !isSyncing ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-100" />
              ) : !isOnline ? (
                <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
              ) : isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : failedCount > 0 ? (
                <AlertCircle className="w-4 h-4 text-white" />
              ) : (
                <CloudUpload className="w-4 h-4 text-white animate-bounce" />
              )}
            </div>

            <div className="min-w-0 leading-tight">
              {showJustSyncedBanner && totalPendingOrFailed === 0 && isOnline && !isSyncing ? (
                <div className="text-xs font-bold whitespace-nowrap">
                  All Synced ✓ ({lastSyncedCount} items)
                </div>
              ) : !isOnline ? (
                <div>
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span>Offline Mode Active</span>
                    {totalPendingOrFailed > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-500/25 text-amber-200 text-[10px] font-extrabold">
                        {totalPendingOrFailed} Saved
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-300">
                    Bina internet data add karein • Auto sync ready
                  </div>
                </div>
              ) : isSyncing ? (
                <div>
                  <div className="text-xs font-bold">
                    Syncing {syncProgress ? `${syncProgress.done}/${syncProgress.total}` : `${pendingCount}`} items...
                  </div>
                  <div className="text-[10px] text-indigo-100">Cloud upload chal raha hai</div>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-bold">
                    {pendingCount > 0 ? `${pendingCount} Pending Sync` : `${failedCount} Sync Retry`}
                  </div>
                  <div className="text-[10px] text-white/90">Tap to view &amp; sync now</div>
                </div>
              )}
            </div>

            {(totalPendingOrFailed > 0 || !isOnline) && (
              <ChevronRight className="w-3.5 h-3.5 opacity-80 shrink-0" />
            )}
          </button>
        </div>
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-[9995] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    isOnline
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                  }`}
                >
                  {isOnline ? <CloudUpload className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Offline Data &amp; Auto Cloud Sync
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isOnline
                      ? "Internet Connected — Pending data auto-sync hota hai"
                      : "Offline Mode — Data phone mein safe hai, net aate hi sync hoga"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Bar */}
            <div className="px-5 py-3 bg-slate-50/70 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Pending: <span className="font-bold text-indigo-600 dark:text-indigo-400">{pendingCount}</span>
                {failedCount > 0 && (
                  <span className="ml-2 text-rose-600 dark:text-rose-400">
                    • Failed: {failedCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {failedCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFailed}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30"
                  >
                    Clear Failed
                  </button>
                )}
                <button
                  type="button"
                  disabled={!isOnline || isSyncing || totalPendingOrFailed === 0}
                  onClick={() => {
                    if (failedCount > 0) retryFailed();
                    void syncNow(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-sm transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </button>
              </div>
            </div>

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {items.length === 0 ? (
                <div className="py-10 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Sabhi Data Sync Hai!
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Abhi koi pending record baaki nahi hai.
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                          {item.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            item.status === "syncing"
                              ? "bg-blue-100 text-blue-700"
                              : item.status === "failed"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.status === "syncing"
                            ? "Syncing..."
                            : item.status === "failed"
                            ? "Retry Needed"
                            : "Waiting Net"}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 break-words">
                        {item.label}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(item.updatedAt || item.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {item.lastError && (
                          <span className="text-rose-500 truncate max-w-[180px]" title={item.lastError}>
                            • {item.lastError}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      title="Remove from queue"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
