import { createClient } from '@supabase/supabase-js';

// Fallback values below are the "publishable" Supabase keys — safe to have
// in client code by design (protection is RLS, not secrecy; this exact URL
// and key already appear in every network request the browser makes).
// Used only if the env vars aren't set, which some deploy environments have
// failed to pick up despite being configured correctly on the platform side.
const FALLBACK_SUPABASE_URL = 'https://hogammqmlngqfnsidvwq.supabase.co';
const FALLBACK_SUPABASE_KEY = 'sb_publishable_LBHVXSwxC0OZuSiMfdgg6A_icz5UWRI';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_SUPABASE_URL;
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || FALLBACK_SUPABASE_KEY;

// If env vars aren't set (e.g. local dev without .env), the app still works
// fully off localStorage — Supabase sync is simply skipped.
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const isSupabaseConfigured = Boolean(supabase);
