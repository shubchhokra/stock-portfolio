import { useState } from 'react';
import { apiFetch, fmtCurrency, fmtPct, fmtShares } from '../utils/api.js';

export default function HoldingsTable({ holdings, prices, onTradeComplete }) {
  const [sellLoading, setSellLoading] = useState(null);

  async function sellAll(symbol, shares) {
    if (!window.confirm(`Sell all ${shares} shares of ${symbol}?`)) return;
    setSellLoading(symbol);
    try {
      await apiFetch('/trade/sell', { method: 'POST', body: { symbol, shares } });
      onTradeComplete();
    } catch (err) {
      alert(err.message);
    } finally {
      setSellLoading(null);
    }
  }

  if (!holdings.length) {
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
        padding: '48px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>💼</div>
        <p style={{ color: 'var(--muted)', margin: 0 }}>No positions yet. Go to <strong>Trade</strong> to buy your first stock.</p>
      </div>
    );
  }

  const totalCost = holdings.reduce((s, h) => s + h.shares * h.avg_cost, 0);
  const totalValue = holdings.reduce((s, h) => s + h.shares * (prices[h.symbol]?.price || h.avg_cost), 0);
  const totalPL = totalValue - totalCost;

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Holdings</h3>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{holdings.length} position{holdings.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Symbol', 'Shares', 'Avg Cost', 'Current', 'Mkt Value', 'P/L', 'P/L %', ''].map(h => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: h === '' ? 'center' : 'left',
                  fontSize: '11px', fontWeight: '600', color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {holdings.map(h => {
              const quote = prices[h.symbol];
              const currentPrice = quote?.price || h.avg_cost;
              const mktValue = h.shares * currentPrice;
              const cost = h.shares * h.avg_cost;
              const pl = mktValue - cost;
              const plPct = (pl / cost) * 100;
              const isLoaded = !!quote;

              return (
                <tr key={h.symbol} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: '700', fontSize: '15px' }}>{h.symbol}</div>
                    {quote && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{quote.name}</div>}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text)' }}>{fmtShares(h.shares)}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--muted)' }}>{fmtCurrency(h.avg_cost)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    {isLoaded ? (
                      <div>
                        <div>{fmtCurrency(currentPrice)}</div>
                        <div style={{ fontSize: '11px', color: quote.change >= 0 ? 'var(--green)' : 'var(--red)', marginTop: '2px' }}>
                          {quote.change >= 0 ? '+' : ''}{quote.changePercent?.toFixed(2)}%
                        </div>
                      </div>
                    ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '600' }}>{fmtCurrency(mktValue)}</td>
                  <td style={{ padding: '14px 16px', color: pl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: '600' }}>
                    {pl >= 0 ? '+' : ''}{fmtCurrency(pl)}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                      background: pl >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: pl >= 0 ? 'var(--green)' : 'var(--red)',
                    }}>
                      {fmtPct(plPct)}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <button
                      onClick={() => sellAll(h.symbol, h.shares)}
                      disabled={sellLoading === h.symbol}
                      title="Sell all shares"
                      style={{
                        padding: '5px 10px', fontSize: '12px', background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px',
                        color: 'var(--red)', cursor: 'pointer', fontWeight: '500',
                      }}
                    >
                      {sellLoading === h.symbol ? '…' : 'Sell'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              <td colSpan={4} style={{ padding: '12px 16px', fontWeight: '600', fontSize: '13px' }}>Total</td>
              <td style={{ padding: '12px 16px', fontWeight: '700' }}>{fmtCurrency(totalValue)}</td>
              <td style={{ padding: '12px 16px', fontWeight: '700', color: totalPL >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {totalPL >= 0 ? '+' : ''}{fmtCurrency(totalPL)}
              </td>
              <td colSpan={2} style={{ padding: '12px 16px' }}>
                <span style={{
                  display: 'inline-block', padding: '3px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                  background: totalPL >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: totalPL >= 0 ? 'var(--green)' : 'var(--red)',
                }}>
                  {fmtPct(totalCost > 0 ? (totalPL / totalCost) * 100 : 0)}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
