import { supabase } from '../lib/supabase.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(API_BASE + '/api' + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function fmtCurrency(n, compact = false) {
  if (n == null) return '—';
  if (compact && Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (compact && Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export function fmtPct(n) {
  if (n == null) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export function fmtShares(n) {
  if (n == null) return '—';
  return parseFloat(n.toFixed(4)).toString();
}
