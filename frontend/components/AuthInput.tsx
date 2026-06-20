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
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-warm-gray">
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
        className={`w-full rounded-xl border px-4 py-2.5 text-sm text-warm-gray
                   placeholder-muted-warm outline-none transition-all
                   disabled:cursor-not-allowed disabled:opacity-50
                   ${error
                     ? 'border-error-red focus:ring-2 focus:ring-error-red/30'
                     : 'border-warm-border focus:border-teal-primary focus:ring-2 focus:ring-teal-primary/30'
                   }`}
      />
      {error && (
        <p className="mt-1.5 text-xs text-error-red">{error}</p>
      )}
    </div>
  );
}
