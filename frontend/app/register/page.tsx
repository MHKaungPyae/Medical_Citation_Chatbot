'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthCard from '@/components/AuthCard';
import AuthInput from '@/components/AuthInput';
import AuthButton from '@/components/AuthButton';
import { useAuthContext } from '@/components/AuthProvider';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuthContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    const { error: authError } = await signUp(
      email.trim(),
      password,
      displayName.trim() || undefined,
    );
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setSuccess('Account created! Redirecting...');
    setTimeout(() => router.push('/'), 1000);
  };

  return (
    <AuthCard
      title="Create an account"
      subtitle="Get started with your medical assistant"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-400">
            {success}
          </div>
        )}

        <AuthInput
          id="displayName"
          label="Display Name (optional)"
          type="text"
          placeholder="John"
          value={displayName}
          onChange={setDisplayName}
          disabled={loading}
          autoComplete="name"
        />

        <AuthInput
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          disabled={loading}
          autoComplete="email"
        />

        <AuthInput
          id="password"
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={setPassword}
          disabled={loading}
          autoComplete="new-password"
        />

        <AuthButton loading={loading} loadingText="Creating account...">
          Sign Up
        </AuthButton>
      </form>
    </AuthCard>
  );
}
