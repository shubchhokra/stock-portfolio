-- ============================================================
-- Stock Market Game – Supabase Schema
-- Run this entire file in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ─── Tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username  TEXT UNIQUE NOT NULL,
  cash      NUMERIC(15, 2) NOT NULL DEFAULT 1000000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.holdings (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol   TEXT NOT NULL,
  shares   NUMERIC(20, 8) NOT NULL,
  avg_cost NUMERIC(15, 4) NOT NULL,
  UNIQUE(user_id, symbol)
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symbol     TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  shares     NUMERIC(20, 8) NOT NULL,
  price      NUMERIC(15, 4) NOT NULL,
  total      NUMERIC(15, 4) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ───────────────────────────────────────
-- (Backend uses service_role key and bypasses RLS.
--  These policies protect direct client access.)

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read (leaderboard), only owner can update
CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Holdings: anyone can read (leaderboard), only owner can modify
CREATE POLICY "Holdings are publicly readable"
  ON public.holdings FOR SELECT USING (true);

CREATE POLICY "Users manage own holdings"
  ON public.holdings FOR ALL USING (auth.uid() = user_id);

-- Transactions: private to owner
CREATE POLICY "Users read own transactions"
  ON public.transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own transactions"
  ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─── Realtime ─────────────────────────────────────────────────
-- Enables live leaderboard updates

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.holdings;

-- ─── Done ────────────────────────────────────────────────────
-- After running this, go to Supabase > Authentication > Providers
-- and make sure Email provider is enabled.
-- To skip email confirmation during development:
-- Authentication > Email > Disable "Confirm email"
