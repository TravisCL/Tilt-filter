import React, { useState } from 'react';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

/**
 * Email/password login + signup gate. Rendered instead of the main app
 * whenever Supabase is configured and nobody's signed in — every table is
 * now RLS-locked to auth.uid(), so there's no meaningful "logged out" view
 * of the app to show.
 */
export const AuthView: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setSignupSuccess(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-060f17)] px-4">
        <div className="w-full max-w-sm p-6 bg-[var(--c-081522)] border border-[var(--c-173752)] rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Mail className="w-6 h-6" />
          </div>
          <h2 className="text-white font-black text-lg">Check your email</h2>
          <p className="text-xs text-slate-400">
            We sent a confirmation link to <span className="text-slate-200 font-bold">{email}</span>. Click it, then
            come back and sign in.
          </p>
          <button
            type="button"
            onClick={() => {
              setSignupSuccess(false);
              setMode('signin');
            }}
            className="text-xs font-bold text-sky-400 hover:text-sky-300 cursor-pointer"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--c-060f17)] px-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-1.5">
          <img
            src="/icons/pwa-192x192.png"
            alt="Tilt Filter"
            className="w-14 h-14 mx-auto rounded-xl"
          />
          <h1 className="text-white font-black text-xl tracking-tight">Tilt Filter</h1>
          <p className="text-xs text-slate-400">{mode === 'signin' ? 'Sign in to your account' : 'Create your account'}</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 bg-[var(--c-081522)] border border-[var(--c-173752)] rounded-2xl space-y-3.5"
        >
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs font-bold">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[var(--c-0b161b)] border border-[var(--c-1e3a4a)] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/60"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[var(--c-0b161b)] border border-[var(--c-1e3a4a)] text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/60"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-black font-black text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'signin' ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
          }}
          className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
};
