'use client';

import { useRef, useState, useCallback } from 'react';

/** Distance from bottom (px) before "scroll to bottom" button appears. */
const SCROLL_BOTTOM_THRESHOLD = 60;

export function useScrollManager() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const rafRef = useRef<number | null>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const handleScroll = useCallback(() => {
    // Throttle via requestAnimationFrame — at most one check per frame
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!scrollRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setUserScrolledUp(
        scrollHeight - scrollTop - clientHeight >= SCROLL_BOTTOM_THRESHOLD,
      );
    });
  }, []);

  return {
    scrollRef,
    userScrolledUp,
    setUserScrolledUp,
    scrollToBottom,
    handleScroll,
  };
}
