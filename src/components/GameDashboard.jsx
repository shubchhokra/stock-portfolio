import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiFetch, fmtCurrency, fmtPct } from '../utils/api.js';
import TradePanel from './TradePanel.jsx';
import HoldingsTable from './HoldingsTable.jsx';
import Leaderboard from './Leaderboard.jsx';
import TransactionHistory from './TransactionHistory.jsx';
import AllocationChart from './AllocationChart.jsx';

const TABS = ['Portfolio', 'Trade', 'Leaderboard', 'History'];

export default function GameDashboard() {
  const { username, logout } = useAuth();
  const [tab, setTab] = useState('Portfolio');
  const [portfolio, setPortfolio] = useState(null);
  const [prices, setPrices] = useState({});
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);

  const fetchPortfolio = useCallback(async () => {
    try {
      const data = await apiFetch('/portfolio');
      setPortfolio(data);
    } catch (err) {
      console.error('Portfolio fetch failed:', err);
    } finally {
      setLoadingPortfolio(false);
    }
  }, []);

  const fetchPrices = useCallback(async (holdings) => {
    if (!holdings?.length) return;
    const results = await Promise.allSettled(
      holdings.map(h => apiFetch(`/quote/${h.symbol}`))
    );
    const newPrices = {};
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') newPrices[holdings[i].symbol] = r.value;
    });
    setPrices(p => ({ ...p, ...newPrices }));
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  useEffect(() => {
    if (portfolio?.holdings?.length) fetchPrices(portfolio.holdings);
  }, [portfolio?.holdings, fetchPrices]);

  // Auto-refresh prices every 60s
  useEffect(() => {
    const id = setInterval(() => {
      if (portfolio?.holdings?.length) fetchPrices(portfolio.holdings);
    }, 60_000);
    return () => clearInterval(id);
  }, [portfolio?.holdings, fetchPrices]);

  const onTradeComplete = () => fetchPortfolio();

  // Compute summary stats
  const marketValue = portfolio?.holdings?.reduce((s, h) => s + h.shares * (prices[h.symbol]?.price || h.avg_cost), 0) ?? 0;
  const totalValue = (portfolio?.cash ?? 0) + marketValue;
  const returnDollar = totalValue - 1_000_000;
  const returnPct = (returnDollar / 1_000_000) * 100;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '0 24px', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', height: '60px' }}>
          <span style={{ fontSize: '20px', fontWeight: '700', marginRight: '32px' }}>
            📈 Stock Game
          </span>

          {/* Tabs */}
          <nav style={{ display: 'flex', gap: '4px', flex: 1 }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '7px 16px', border: 'none', borderRadius: '8px',
                background: tab === t ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: tab === t ? 'var(--primary)' : 'var(--muted)',
                fontWeight: tab === t ? '600' : '400',
                fontSize: '14px', cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {t}
              </button>
            ))}
          </nav>

          {/* User info + logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>{username}</div>
              <div style={{
                fontSize: '12px',
                color: returnDollar >= 0 ? 'var(--green)' : 'var(--red)',
              }}>
                {fmtPct(returnPct)}
              </div>
            </div>
            <button onClick={logout} style={{
              padding: '7px 14px', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: '8px',
              color: 'var(--muted)', fontSize: '13px', cursor: 'pointer',
            }}>
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Summary bar */}
      {!loadingPortfolio && portfolio && (
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '14px 24px', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            {[
              { label: 'Portfolio Value', value: fmtCurrency(totalValue), sub: null },
              { label: 'Cash', value: fmtCurrency(portfolio.cash), sub: null },
              { label: 'Invested', value: fmtCurrency(marketValue), sub: null },
              { label: 'Total Return', value: fmtCurrency(returnDollar), pct: fmtPct(returnPct), positive: returnDollar >= 0 },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: s.positive != null ? (s.positive ? 'var(--green)' : 'var(--red)') : 'var(--text)', marginTop: '2px' }}>
                  {s.value}
                  {s.pct && <span style={{ fontSize: '13px', marginLeft: '8px' }}>{s.pct}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
        {loadingPortfolio && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '64px' }}>Loading…</div>
        )}

        {!loadingPortfolio && tab === 'Portfolio' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <HoldingsTable
                holdings={portfolio?.holdings || []}
                prices={prices}
                onTradeComplete={onTradeComplete}
              />
            </div>
            <div>
              <AllocationChart holdings={portfolio?.holdings || []} prices={prices} />
            </div>
          </div>
        )}

        {!loadingPortfolio && tab === 'Trade' && (
          <TradePanel cash={portfolio?.cash ?? 0} onTradeComplete={onTradeComplete} />
        )}

        {tab === 'Leaderboard' && (
          <Leaderboard currentUser={username} />
        )}

        {!loadingPortfolio && tab === 'History' && (
          <TransactionHistory />
        )}
      </main>
    </div>
  );
}
