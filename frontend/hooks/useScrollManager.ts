'use client';

import { useRef, useState, useCallback } from 'react';

export function useScrollManager() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setUserScrolledUp(scrollHeight - scrollTop - clientHeight >= 60);
  }, []);

  return {
    scrollRef,
    userScrolledUp,
    setUserScrolledUp,
    scrollToBottom,
    handleScroll,
  };
}
