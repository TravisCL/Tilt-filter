import React, { useState } from 'react';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

/**
 * Sign-in gate. Rendered instead of the main app whenever Supabase is
 * configured and nobody's signed in — every table is now RLS-locked to
 * auth.uid(), so there's no meaningful "logged out" view of the app to show.
 *
 * New accounts only come through Discord (role-gated, see App.tsx's
 * discordGate logic) — email/password sign-IN stays for accounts that
 * already existed before that gate, but there's no email sign-UP anymore,
 * so nobody can skip the Discord check by just registering with an email.
 */
export const AuthView: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [discordLoading, setDiscordLoading] = useState(false);

  const handleDiscordSignIn = async () => {
    if (!supabase) return;
    setDiscordLoading(true);
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { scopes: 'identify email guilds guilds.members.read' },
    });
    if (oauthError) {
      setError(oauthError.message || 'Could not start Discord sign-in. Try again.');
      setDiscordLoading(false);
    }
    // On success the browser redirects to Discord — nothing else to do here.
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-xs text-slate-400">Sign in to your account</p>
        </div>

        <button
          type="button"
          onClick={handleDiscordSignIn}
          disabled={discordLoading}
          className="w-full py-2.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-60 text-white font-black text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {discordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue with Discord'}
        </button>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--c-173752)]" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">or</span>
          <div className="h-px flex-1 bg-[var(--c-173752)]" />
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
