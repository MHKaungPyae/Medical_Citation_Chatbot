'use client';

import React from 'react';
import { IconClose } from './Icons';

interface ImagePreviewProps {
  src: string;
  alt?: string;
  onRemove?: () => void;
}

function ImagePreview({ src, alt = 'Selected image', onRemove }: ImagePreviewProps) {
  return (
    <div className="relative inline-block">
      <img
        src={src}
        alt={alt}
        className="h-20 w-20 rounded-xl object-cover ring-1 ring-white/20"
      />
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center
                     rounded-full bg-red-500/80 text-white backdrop-blur-sm
                     transition-colors hover:bg-red-500"
          aria-label="Remove image"
        >
          <IconClose size={10} />
        </button>
      )}
    </div>
  );
}

export default React.memo(ImagePreview);
