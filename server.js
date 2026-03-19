import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const INITIAL_CASH = 1_000_000;
const PORT = process.env.PORT || 3001;

// Public client — for leaderboard reads and token verification
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Returns a client that acts as the authenticated user (respects RLS)
function userClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Price cache ──────────────────────────────────────────────────────────────

const priceCache = new Map();

async function getPrice(symbol) {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() - cached.cachedAt < 60_000) return cached;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' } });
  if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status} for ${symbol}`);

  const data = await res.json();
  const meta = data.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) throw new Error(`Symbol "${symbol}" not found`);

  const prevClose = meta.chartPreviousClose || meta.previousClose;
  const quote = {
    symbol: meta.symbol,
    price: meta.regularMarketPrice,
    name: meta.longName || meta.shortName || symbol,
    change: prevClose ? meta.regularMarketPrice - prevClose : 0,
    changePercent: prevClose ? ((meta.regularMarketPrice - prevClose) / prevClose) * 100 : 0,
    previousClose: prevClose,
    volume: meta.regularMarketVolume,
    cachedAt: Date.now(),
  };
  priceCache.set(symbol, quote);
  return quote;
}

// ─── Auth middleware ──────────────────────────────────────────────────────────

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  const token = header.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid or expired session' });
  req.userId = user.id;
  req.token = token;
  next();
}

// ─── Express setup ────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_, res) => res.json({ ok: true }));

// ─── Check username availability (called before frontend signup) ──────────────

app.get('/api/auth/check-username/:username', async (req, res) => {
  const { data } = await supabase
    .from('profiles').select('id').eq('username', req.params.username.trim()).maybeSingle();
  res.json({ available: !data });
});

// ─── Public portfolio by username ─────────────────────────────────────────────

app.get('/api/portfolio/:username', async (req, res) => {
  const { data: profile } = await supabase
    .from('profiles').select('id, username, cash').eq('username', req.params.username).maybeSingle();
  if (!profile) return res.status(404).json({ error: 'Player not found' });

  const { data: holdings } = await supabase
    .from('holdings').select('symbol, shares, avg_cost').eq('user_id', profile.id).gt('shares', 0);

  res.json({ ...profile, holdings: holdings || [] });
});

// ─── Portfolio (own) ──────────────────────────────────────────────────────────

app.get('/api/portfolio', requireAuth, async (req, res) => {
  const db = userClient(req.token);
  const [{ data: profile }, { data: holdings }] = await Promise.all([
    db.from('profiles').select('id, username, cash').eq('id', req.userId).single(),
    db.from('holdings').select('symbol, shares, avg_cost').eq('user_id', req.userId).gt('shares', 0),
  ]);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json({ ...profile, holdings: holdings || [] });
});

// ─── Trade: Buy ───────────────────────────────────────────────────────────────

app.post('/api/trade/buy', requireAuth, async (req, res) => {
  const { symbol, shares } = req.body || {};
  const numShares = parseFloat(shares);
  if (!symbol || !numShares || numShares <= 0)
    return res.status(400).json({ error: 'Valid symbol and share count required' });

  try {
    const quote = await getPrice(symbol.toUpperCase());
    const total = parseFloat((quote.price * numShares).toFixed(4));
    const db = userClient(req.token);

    const { data: profile } = await db.from('profiles').select('cash').eq('id', req.userId).single();
    if (!profile || profile.cash < total)
      return res.status(400).json({ error: `Insufficient funds — need ${fmt(total)}, have ${fmt(profile?.cash ?? 0)}` });

    const { data: existing } = await db
      .from('holdings').select('shares, avg_cost').eq('user_id', req.userId).eq('symbol', quote.symbol).maybeSingle();

    await db.from('profiles').update({ cash: parseFloat((profile.cash - total).toFixed(2)) }).eq('id', req.userId);

    if (existing) {
      const newShares = parseFloat((existing.shares + numShares).toFixed(8));
      const newAvg = parseFloat(((existing.shares * existing.avg_cost + numShares * quote.price) / newShares).toFixed(4));
      await db.from('holdings').update({ shares: newShares, avg_cost: newAvg }).eq('user_id', req.userId).eq('symbol', quote.symbol);
    } else {
      await db.from('holdings').insert({ user_id: req.userId, symbol: quote.symbol, shares: numShares, avg_cost: quote.price });
    }

    await db.from('transactions').insert({ user_id: req.userId, symbol: quote.symbol, type: 'buy', shares: numShares, price: quote.price, total });

    const { data: updated } = await db.from('profiles').select('cash').eq('id', req.userId).single();
    res.json({ success: true, symbol: quote.symbol, price: quote.price, shares: numShares, total, cash: updated.cash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Trade: Sell ──────────────────────────────────────────────────────────────

app.post('/api/trade/sell', requireAuth, async (req, res) => {
  const { symbol, shares } = req.body || {};
  const numShares = parseFloat(shares);
  if (!symbol || !numShares || numShares <= 0)
    return res.status(400).json({ error: 'Valid symbol and share count required' });

  const sym = symbol.toUpperCase();
  const db = userClient(req.token);
  const { data: holding } = await db.from('holdings').select('shares').eq('user_id', req.userId).eq('symbol', sym).maybeSingle();
  if (!holding || holding.shares < numShares - 0.0001)
    return res.status(400).json({ error: `You only own ${holding?.shares?.toFixed(4) || 0} shares of ${sym}` });

  try {
    const quote = await getPrice(sym);
    const total = parseFloat((quote.price * numShares).toFixed(4));

    const { data: profile } = await db.from('profiles').select('cash').eq('id', req.userId).single();
    await db.from('profiles').update({ cash: parseFloat((profile.cash + total).toFixed(2)) }).eq('id', req.userId);

    const remaining = parseFloat((holding.shares - numShares).toFixed(8));
    if (remaining < 0.0001) {
      await db.from('holdings').delete().eq('user_id', req.userId).eq('symbol', sym);
    } else {
      await db.from('holdings').update({ shares: remaining }).eq('user_id', req.userId).eq('symbol', sym);
    }

    await db.from('transactions').insert({ user_id: req.userId, symbol: sym, type: 'sell', shares: numShares, price: quote.price, total });

    const { data: updated } = await db.from('profiles').select('cash').eq('id', req.userId).single();
    res.json({ success: true, symbol: sym, price: quote.price, shares: numShares, total, cash: updated.cash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Leaderboard ──────────────────────────────────────────────────────────────

app.get('/api/leaderboard', async (req, res) => {
  try {
    const [{ data: profiles }, { data: allHoldings }] = await Promise.all([
      supabase.from('profiles').select('id, username, cash'),
      supabase.from('holdings').select('user_id, symbol, shares, avg_cost').gt('shares', 0),
    ]);

    const symbols = [...new Set((allHoldings || []).map(h => h.symbol))];
    const prices = {};
    await Promise.allSettled(symbols.map(async sym => {
      try { prices[sym] = (await getPrice(sym)).price; } catch { prices[sym] = 0; }
    }));

    const board = (profiles || []).map(p => {
      const holdings = (allHoldings || []).filter(h => h.user_id === p.id);
      const marketValue = holdings.reduce((s, h) => s + h.shares * (prices[h.symbol] || 0), 0);
      const totalValue = p.cash + marketValue;
      return {
        username: p.username,
        totalValue,
        cash: p.cash,
        marketValue,
        returnDollar: totalValue - INITIAL_CASH,
        returnPct: ((totalValue - INITIAL_CASH) / INITIAL_CASH) * 100,
        positions: holdings.length,
      };
    }).sort((a, b) => b.totalValue - a.totalValue).map((p, i) => ({ ...p, rank: i + 1 }));

    res.json(board);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Transactions ─────────────────────────────────────────────────────────────

app.get('/api/transactions', requireAuth, async (req, res) => {
  const db = userClient(req.token);
  const { data } = await db
    .from('transactions').select('*').eq('user_id', req.userId)
    .order('created_at', { ascending: false }).limit(100);
  res.json(data || []);
});

// ─── Quote / Historical ───────────────────────────────────────────────────────

app.get('/api/quote/:symbol', async (req, res) => {
  try {
    res.json(await getPrice(req.params.symbol.toUpperCase()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/historical/:symbol', async (req, res) => {
  const months = parseInt(req.query.months) || 6;
  try {
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    const p1 = Math.floor(start.getTime() / 1000);
    const p2 = Math.floor(Date.now() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(req.params.symbol.toUpperCase())}?period1=${p1}&period2=${p2}&interval=1d`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' } });
    if (!response.ok) throw new Error(`Yahoo Finance returned ${response.status}`);

    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) throw new Error('No data returned');

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    res.json(timestamps
      .map((ts, i) => ({ date: new Date(ts * 1000).toISOString().split('T')[0], close: closes[i] }))
      .filter(q => q.close != null));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

app.listen(PORT, () => console.log(`Stock Game API running on port ${PORT}`));
