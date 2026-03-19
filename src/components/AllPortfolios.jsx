import { useState, useEffect } from 'react';
import { apiFetch, fmtCurrency, fmtPct, fmtShares } from '../utils/api.js';

const MEDALS = ['🥇', '🥈', '🥉'];
const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#14b8a6','#f97316','#84cc16'];

export default function AllPortfolios({ currentUser }) {
  const [players, setPlayers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [prices, setPrices] = useState({});
  const [loadingList, setLoadingList] = useState(true);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  // Load ranked player list from leaderboard
  useEffect(() => {
    apiFetch('/leaderboard')
      .then(setPlayers)
      .catch(console.error)
      .finally(() => setLoadingList(false));
  }, []);

  // Load selected player's portfolio
  useEffect(() => {
    if (!selected) return;
    setPortfolio(null);
    setPrices({});
    setLoadingPortfolio(true);
    apiFetch(`/portfolio/${selected}`)
      .then(async data => {
        setPortfolio(data);
        if (data.holdings?.length) {
          const results = await Promise.allSettled(
            data.holdings.map(h => apiFetch(`/quote/${h.symbol}`))
          );
          const p = {};
          results.forEach((r, i) => {
            if (r.status === 'fulfilled') p[data.holdings[i].symbol] = r.value;
          });
          setPrices(p);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingPortfolio(false));
  }, [selected]);

  const marketValue = portfolio?.holdings?.reduce(
    (s, h) => s + h.shares * (prices[h.symbol]?.price || h.avg_cost), 0
  ) ?? 0;
  const totalValue = (portfolio?.cash ?? 0) + marketValue;
  const returnDollar = totalValue - 1_000_000;
  const returnPct = (returnDollar / 1_000_000) * 100;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', alignItems: 'start' }}>

      {/* Player list */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: '13px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Players
        </div>
        {loadingList && <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>}
        {!loadingList && players.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>No players yet</div>
        )}
        {players.map(p => {
          const isMe = p.username === currentUser;
          const isSelected = p.username === selected;
          const isPos = p.returnDollar >= 0;
          return (
            <button key={p.username} onClick={() => setSelected(p.username)} style={{
              width: '100%', padding: '12px 16px', background: isSelected ? 'rgba(99,102,241,0.1)' : 'transparent',
              border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left',
              borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
            }}>
              <span style={{ fontSize: '18px', width: '24px', flexShrink: 0 }}>
                {MEDALS[p.rank - 1] || `#${p.rank}`}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', fontSize: '14px', color: isMe ? 'var(--primary)' : 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {p.username}
                  {isMe && <span style={{ fontSize: '10px', padding: '1px 5px', background: 'rgba(99,102,241,0.2)', borderRadius: '4px', color: 'var(--primary)' }}>you</span>}
                </div>
                <div style={{ fontSize: '12px', color: isPos ? 'var(--green)' : 'var(--red)', marginTop: '2px' }}>
                  {fmtCurrency(p.totalValue)} · {fmtPct(p.returnPct)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Portfolio detail */}
      <div>
        {!selected && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '64px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>👈</div>
            <p style={{ color: 'var(--muted)', margin: 0 }}>Select a player to view their portfolio</p>
          </div>
        )}

        {selected && loadingPortfolio && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '64px', textAlign: 'center', color: 'var(--muted)' }}>
            Loading…
          </div>
        )}

        {selected && !loadingPortfolio && portfolio && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Header */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>
                  {portfolio.username}
                  {portfolio.username === currentUser && <span style={{ fontSize: '13px', color: 'var(--primary)', marginLeft: '8px' }}>(you)</span>}
                </h2>
                <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '13px' }}>
                  {portfolio.holdings?.length || 0} position{portfolio.holdings?.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Total Value', value: fmtCurrency(totalValue), color: 'var(--text)' },
                  { label: 'Cash', value: fmtCurrency(portfolio.cash), color: 'var(--text)' },
                  { label: 'Return', value: `${fmtCurrency(returnDollar)} (${fmtPct(returnPct)})`, color: returnDollar >= 0 ? 'var(--green)' : 'var(--red)' },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: s.color, marginTop: '2px' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Holdings */}
            {portfolio.holdings?.length === 0 ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>💰</div>
                <p style={{ color: 'var(--muted)', margin: 0 }}>All cash — no positions yet</p>
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: '13px', fontWeight: '700', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Holdings</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Symbol', 'Shares', 'Avg Cost', 'Current', 'Mkt Value', 'P/L', 'P/L %'].map(h => (
                        <th key={h} style={{ padding: '10px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {portfolio.holdings.map((h, i) => {
                      const quote = prices[h.symbol];
                      const current = quote?.price || h.avg_cost;
                      const mktVal = h.shares * current;
                      const cost = h.shares * h.avg_cost;
                      const pl = mktVal - cost;
                      const plPct = (pl / cost) * 100;
                      return (
                        <tr key={h.symbol} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                              <div>
                                <div style={{ fontWeight: '700' }}>{h.symbol}</div>
                                {quote && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{quote.name}</div>}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 20px', color: 'var(--muted)' }}>{fmtShares(h.shares)}</td>
                          <td style={{ padding: '14px 20px', color: 'var(--muted)' }}>{fmtCurrency(h.avg_cost)}</td>
                          <td style={{ padding: '14px 20px' }}>
                            {quote ? (
                              <div>
                                <div>{fmtCurrency(current)}</div>
                                <div style={{ fontSize: '11px', color: quote.change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                  {quote.change >= 0 ? '+' : ''}{quote.changePercent?.toFixed(2)}%
                                </div>
                              </div>
                            ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                          </td>
                          <td style={{ padding: '14px 20px', fontWeight: '600' }}>{fmtCurrency(mktVal)}</td>
                          <td style={{ padding: '14px 20px', fontWeight: '600', color: pl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            {pl >= 0 ? '+' : ''}{fmtCurrency(pl)}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <span style={{
                              display: 'inline-block', padding: '3px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                              background: pl >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                              color: pl >= 0 ? 'var(--green)' : 'var(--red)',
                            }}>
                              {fmtPct(plPct)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
