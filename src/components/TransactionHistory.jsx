import { useState, useEffect } from 'react';
import { apiFetch, fmtCurrency, fmtShares } from '../utils/api.js';

export default function TransactionHistory() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/transactions')
      .then(setTxns)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '64px' }}>Loading…</div>;

  if (!txns.length) {
    return (
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
        padding: '48px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
        <p style={{ color: 'var(--muted)', margin: 0 }}>No trades yet. Head to <strong>Trade</strong> to make your first move.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', marginTop: 0 }}>
        Trade History <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: '400' }}>({txns.length} trades)</span>
      </h2>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Date & Time', 'Symbol', 'Type', 'Shares', 'Price', 'Total'].map(h => (
                <th key={h} style={{
                  padding: '12px 20px', textAlign: 'left',
                  fontSize: '11px', fontWeight: '600', color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txns.map(t => {
              const isBuy = t.type === 'buy';
              const date = new Date(t.created_at.replace(' ', 'T') + 'Z');
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 20px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    <div>{date.toLocaleDateString()}</div>
                    <div style={{ fontSize: '12px' }}>{date.toLocaleTimeString()}</div>
                  </td>
                  <td style={{ padding: '14px 20px', fontWeight: '700' }}>{t.symbol}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                      background: isBuy ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                      color: isBuy ? 'var(--green)' : 'var(--red)',
                      textTransform: 'uppercase',
                    }}>
                      {t.type}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>{fmtShares(t.shares)}</td>
                  <td style={{ padding: '14px 20px' }}>{fmtCurrency(t.price)}</td>
                  <td style={{ padding: '14px 20px', fontWeight: '600' }}>
                    <span style={{ color: isBuy ? 'var(--red)' : 'var(--green)' }}>
                      {isBuy ? '-' : '+'}{fmtCurrency(t.total)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
