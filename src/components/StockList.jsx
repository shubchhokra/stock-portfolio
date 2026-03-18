import React from 'react';
import StockCard from './StockCard.jsx';

const columns = ['Symbol', 'Shares', 'Buy Price', 'Current', 'Change', 'P/L', 'P/L %', 'Actions'];

export default function StockList({ stocks, prices, onRemove }) {
  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
          Holdings
        </h2>
      </div>

      {/* Header row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1.2fr 1.2fr 1fr 60px',
        padding: '10px 20px',
        backgroundColor: 'var(--card)',
        borderBottom: '1px solid var(--border)',
        gap: 8,
      }}>
        {columns.map(col => (
          <div
            key={col}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              textAlign: col === 'Actions' ? 'center' : 'left',
            }}
          >
            {col}
          </div>
        ))}
      </div>

      {/* Stock rows */}
      <div>
        {stocks.map((stock) => (
          <StockCard
            key={stock.id}
            stock={stock}
            quote={prices[stock.symbol]}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
