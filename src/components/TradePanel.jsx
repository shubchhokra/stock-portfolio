import { useState } from 'react';
import { apiFetch, fmtCurrency } from '../utils/api.js';

export default function TradePanel({ cash, onTradeComplete }) {
  const [symbol, setSymbol] = useState('');
  const [quote, setQuote] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [mode, setMode] = useState('buy'); // 'buy' | 'sell'
  const [shares, setShares] = useState('');
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeError, setTradeError] = useState('');
  const [tradeSuccess, setTradeSuccess] = useState('');

  async function handleLookup(e) {
    e.preventDefault();
    if (!symbol.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    setQuote(null);
    setTradeSuccess('');
    setTradeError('');
    setShares('');
    try {
      const data = await apiFetch(`/quote/${symbol.trim().toUpperCase()}`);
      setQuote(data);
    } catch (err) {
      setLookupError(err.message);
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleTrade(e) {
    e.preventDefault();
    const numShares = parseFloat(shares);
    if (!numShares || numShares <= 0) return setTradeError('Enter a valid number of shares');
    setTradeLoading(true);
    setTradeError('');
    setTradeSuccess('');
    try {
      const result = await apiFetch(`/trade/${mode}`, {
        method: 'POST',
        body: { symbol: quote.symbol, shares: numShares },
      });
      const action = mode === 'buy' ? 'Bought' : 'Sold';
      setTradeSuccess(`${action} ${numShares} share${numShares !== 1 ? 's' : ''} of ${result.symbol} @ ${fmtCurrency(result.price)} — Total: ${fmtCurrency(result.total)}`);
      setShares('');
      onTradeComplete();
    } catch (err) {
      setTradeError(err.message);
    } finally {
      setTradeLoading(false);
    }
  }

  const estTotal = quote && shares ? parseFloat(shares) * quote.price : null;
  const maxShares = mode === 'buy' && quote ? Math.floor(cash / quote.price) : null;

  return (
    <div style={{ maxWidth: '560px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', marginTop: 0 }}>Trade Stocks</h2>

      {/* Symbol lookup */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
        <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Search Ticker
        </label>
        <form onSubmit={handleLookup} style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <input
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g. AAPL, TSLA, NVDA"
            style={{
              flex: 1, padding: '11px 14px', background: 'var(--card)',
              border: '1px solid var(--border)', borderRadius: '8px',
              color: 'var(--text)', fontSize: '15px', outline: 'none',
            }}
          />
          <button type="submit" disabled={lookupLoading || !symbol.trim()} style={{
            padding: '11px 20px', background: 'var(--primary)', border: 'none',
            borderRadius: '8px', color: '#fff', fontWeight: '600', fontSize: '14px',
            cursor: lookupLoading ? 'not-allowed' : 'pointer', opacity: lookupLoading ? 0.7 : 1,
            whiteSpace: 'nowrap',
          }}>
            {lookupLoading ? 'Looking up…' : 'Look Up'}
          </button>
        </form>
        {lookupError && <p style={{ color: 'var(--red)', fontSize: '14px', marginTop: '10px', marginBottom: 0 }}>{lookupError}</p>}
      </div>

      {/* Quote card */}
      {quote && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          {/* Stock info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '700' }}>{quote.symbol}</div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '2px' }}>{quote.name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '26px', fontWeight: '700' }}>{fmtCurrency(quote.price)}</div>
              <div style={{ fontSize: '14px', color: quote.change >= 0 ? 'var(--green)' : 'var(--red)', marginTop: '2px' }}>
                {quote.change >= 0 ? '+' : ''}{fmtCurrency(quote.change)} ({quote.change >= 0 ? '+' : ''}{quote.changePercent?.toFixed(2)}%)
              </div>
            </div>
          </div>

          {/* Buy / Sell toggle */}
          <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: '10px', padding: '4px', marginBottom: '16px' }}>
            {['buy', 'sell'].map(m => (
              <button key={m} onClick={() => { setMode(m); setTradeError(''); setTradeSuccess(''); }} style={{
                flex: 1, padding: '9px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontWeight: '600', fontSize: '14px', transition: 'all 0.15s',
                background: mode === m ? (m === 'buy' ? 'var(--green)' : 'var(--red)') : 'transparent',
                color: mode === m ? '#fff' : 'var(--muted)',
              }}>
                {m === 'buy' ? 'Buy' : 'Sell'}
              </button>
            ))}
          </div>

          {/* Trade form */}
          <form onSubmit={handleTrade}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Shares
                </label>
                {mode === 'buy' && maxShares != null && (
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    Max: <button type="button" onClick={() => setShares(String(maxShares))} style={{
                      background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px', padding: 0,
                    }}>{maxShares}</button> shares
                  </span>
                )}
              </div>
              <input
                type="number" min="0.0001" step="any"
                value={shares} onChange={e => setShares(e.target.value)}
                placeholder="0"
                style={{
                  width: '100%', padding: '11px 14px', background: 'var(--card)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  color: 'var(--text)', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Estimated total */}
            {estTotal != null && !isNaN(estTotal) && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', padding: '12px 14px',
                background: 'var(--bg)', borderRadius: '8px', marginBottom: '16px',
                fontSize: '14px',
              }}>
                <span style={{ color: 'var(--muted)' }}>Estimated {mode === 'buy' ? 'cost' : 'proceeds'}</span>
                <span style={{ fontWeight: '700' }}>{fmtCurrency(estTotal)}</span>
              </div>
            )}

            {mode === 'buy' && (
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '14px' }}>
                Available cash: <strong style={{ color: 'var(--text)' }}>{fmtCurrency(cash)}</strong>
              </div>
            )}

            {tradeError && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px', padding: '10px 14px', marginBottom: '12px',
                color: '#f87171', fontSize: '14px',
              }}>
                {tradeError}
              </div>
            )}

            {tradeSuccess && (
              <div style={{
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: '8px', padding: '10px 14px', marginBottom: '12px',
                color: '#4ade80', fontSize: '14px',
              }}>
                ✓ {tradeSuccess}
              </div>
            )}

            <button type="submit" disabled={tradeLoading || !shares} style={{
              width: '100%', padding: '13px',
              background: mode === 'buy' ? 'var(--green)' : 'var(--red)',
              border: 'none', borderRadius: '10px', color: '#fff',
              fontWeight: '700', fontSize: '15px',
              cursor: tradeLoading ? 'not-allowed' : 'pointer',
              opacity: tradeLoading ? 0.7 : 1, transition: 'opacity 0.15s',
            }}>
              {tradeLoading ? 'Processing…' : mode === 'buy' ? `Buy ${quote.symbol}` : `Sell ${quote.symbol}`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
