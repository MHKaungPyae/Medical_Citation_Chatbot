'use client';

import React from 'react';

interface AuthButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
}

export default function AuthButton({
  children,
  loading,
  loadingText = 'Loading...',
  disabled,
  type = 'submit',
  onClick,
}: AuthButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-white
                 transition-all hover:brightness-110 hover:shadow-md
                 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 disabled:hover:shadow-none"
      style={{
        background: 'linear-gradient(to top, rgba(99,102,241,0.9), rgba(99,102,241,0.7))',
        backdropFilter: 'blur(12px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 8px rgba(99,102,241,0.25)',
      }}
    >
      {loading ? loadingText : children}
    </button>
  );
}
