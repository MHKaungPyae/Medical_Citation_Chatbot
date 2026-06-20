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
      className="w-full rounded-xl bg-teal-primary px-4 py-2.5 text-sm font-medium text-white
                 transition-all hover:bg-teal-dark hover:shadow-md
                 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-teal-primary disabled:hover:shadow-none"
    >
      {loading ? loadingText : children}
    </button>
  );
}
