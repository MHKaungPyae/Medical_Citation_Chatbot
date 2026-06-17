'use client';

import React from 'react';

export default function StreamingDots() {
  return (
    <div className="flex gap-1.5 py-1" aria-label="Streaming response..." role="status">
      <div className="dot-pulse h-1.5 w-1.5 rounded-full bg-teal-primary" />
      <div className="dot-pulse h-1.5 w-1.5 rounded-full bg-teal-primary" />
      <div className="dot-pulse h-1.5 w-1.5 rounded-full bg-teal-primary" />
    </div>
  );
}
