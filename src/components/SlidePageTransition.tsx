import React, { useState, useEffect, useRef } from 'react';

export interface SlidePageTransitionProps {
  pageKey: string | number;
  direction?: 'forward' | 'backward';
  children: React.ReactNode;
  className?: string;
  durationMs?: number;
  disabled?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export const SlidePageTransition: React.FC<SlidePageTransitionProps> = ({
  pageKey,
  direction = 'forward',
  children,
  className = '',
  durationMs = 310,
  disabled = false,
  onSwipeLeft,
  onSwipeRight,
}) => {
  const [currentKey, setCurrentKey] = useState(pageKey);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [exitingChildren, setExitingChildren] = useState<React.ReactNode | null>(null);
  const [activeDirection, setActiveDirection] = useState<'forward' | 'backward'>(direction);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const prevKeyRef = useRef(pageKey);
  const timerRef = useRef<any>(null);

  // Swipe detection refs
  const touchStartRef = useRef<{ x: number; y: number; time: number; target: EventTarget | null } | null>(null);

  useEffect(() => {
    if (disabled) {
      setCurrentKey(pageKey);
      setDisplayChildren(children);
      setExitingChildren(null);
      setIsTransitioning(false);
      prevKeyRef.current = pageKey;
      return;
    }

    if (pageKey !== prevKeyRef.current) {
      // Transitioning to a new page!
      setExitingChildren(displayChildren);
      setDisplayChildren(children);
      setCurrentKey(pageKey);
      setActiveDirection(direction);
      setIsTransitioning(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsTransitioning(false);
        setExitingChildren(null);
      }, durationMs);

      prevKeyRef.current = pageKey;
    } else {
      // Normal props update without pageKey change
      setDisplayChildren(children);
    }
  }, [pageKey, children, direction, disabled, durationMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
      target: e.target,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const { x: startX, y: startY, time: startTime, target: startTarget } = touchStartRef.current;
    touchStartRef.current = null;

    const dt = Date.now() - startTime;
    if (dt > 650) return; // Too slow for a swipe gesture

    const targetEl = startTarget as HTMLElement | null;
    if (targetEl) {
      // Ignore interactive controls and horizontal scrollables
      if (
        targetEl.closest(
          'input, textarea, select, [contenteditable="true"], canvas, [data-no-swipe], .no-swipe, .carousel, .embla, [role="slider"], [role="dialog"], audio, video'
        )
      ) {
        return;
      }
      const scrollContainer = targetEl.closest(
        '.overflow-x-auto, [style*="overflow-x: auto"], [style*="overflow-x: scroll"]'
      );
      if (scrollContainer && scrollContainer.scrollWidth > scrollContainer.clientWidth + 15) {
        return;
      }
    }

    const touch = e.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;

    // Minimum 45px swipe, predominantly horizontal
    if (Math.abs(dx) >= 45 && Math.abs(dx) > 1.6 * Math.abs(dy)) {
      if (dx < 0) {
        // Swiped Left -> trigger next page
        onSwipeLeft?.();
      } else {
        // Swiped Right -> trigger prev page
        onSwipeRight?.();
      }
    }
  };

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={`relative w-full overflow-x-hidden min-h-[calc(100dvh-64px)] ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Exiting Page: slides out in activeDirection */}
      {isTransitioning && exitingChildren && (
        <div
          key={`exit-${String(currentKey)}`}
          aria-hidden="true"
          className={`absolute inset-0 w-full h-full pointer-events-none overflow-y-auto ${
            activeDirection === 'forward' ? 'nst-page-exit-forward' : 'nst-page-exit-backward'
          }`}
        >
          {exitingChildren}
        </div>
      )}

      {/* Entering Page: slides in in activeDirection */}
      <div
        key={`enter-${String(currentKey)}`}
        className={`w-full min-h-full ${
          isTransitioning
            ? activeDirection === 'forward'
              ? 'nst-page-enter-forward relative'
              : 'nst-page-enter-backward relative'
            : ''
        }`}
      >
        {displayChildren}
      </div>
    </div>
  );
};
