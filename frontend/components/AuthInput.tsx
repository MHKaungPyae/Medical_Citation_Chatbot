'use client';

import React from 'react';

interface AuthInputProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  autoComplete?: string;
}

export default function AuthInput({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled,
  autoComplete,
}: AuthInputProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-white/80">
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete={autoComplete}
        className={`w-full rounded-xl border px-4 py-2.5 text-sm text-white
                   placeholder-white/40 outline-none transition-all
                   disabled:cursor-not-allowed disabled:opacity-50
                   ${error
                     ? 'border-red-400 focus:ring-2 focus:ring-red-400/30'
                     : 'border-white/15 bg-white/5 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30'
                   }`}
      />
      {error && (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
