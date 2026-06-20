'use client';

import React from 'react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export default function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-bg px-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-light">
            <span className="text-2xl">🩺</span>
          </div>
          <h1 className="text-xl font-semibold text-warm-gray">Medical Assistant</h1>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-warm-border bg-white p-8 shadow-md">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-warm-gray">{title}</h2>
            <p className="mt-1 text-sm text-muted-warm">{subtitle}</p>
          </div>

          {children}
        </div>

        {/* Footer link */}
        <div className="mt-4 text-center text-sm text-muted-warm">
          {footer}
        </div>
      </div>
    </div>
  );
}
