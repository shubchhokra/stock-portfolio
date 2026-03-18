import React from 'react';

const formatCurrency = (value) => {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercent = (value) => {
  if (value == null) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};

const Skeleton = ({ width = '100%', height = 16 }) => (
  <div style={{
    width,
    height,
    backgroundColor: 'var(--border)',
    borderRadius: 4,
    animation: 'pulse 1.5s ease-in-out infinite',
  }} />
);

export default function StockCard({ stock, quote, onRemove }) {
  const currentPrice = quote?.price ?? null;
  const plPerShare = currentPrice != null ? currentPrice - stock.purchasePrice : null;
  const totalPL = plPerShare != null ? plPerShare * stock.shares : null;
  const plPercent = plPerShare != null ? (plPerShare / stock.purchasePrice) * 100 : null;
  const isPositive = plPerShare != null ? plPerShare >= 0 : null;

  const changeIsPositive = quote?.change != null ? quote.change >= 0 : null;

  const cellStyle = {
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
  };

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .stock-row:hover {
          background-color: var(--card-hover) !important;
        }
      `}</style>
      <div
        className="stock-row"
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1.2fr 1.2fr 1.2fr 1fr 60px',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          transition: 'background-color 0.15s',
          gap: 8,
          alignItems: 'center',
        }}
      >
        {/* Symbol + Name */}
        <div style={cellStyle}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
              {stock.symbol}
            </div>
            {quote?.name ? (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {quote.name}
              </div>
            ) : (
              <Skeleton width={100} height={12} />
            )}
          </div>
        </div>

        {/* Shares */}
        <div style={cellStyle}>
          <span style={{ color: 'var(--text)' }}>{stock.shares}</span>
        </div>

        {/* Buy Price */}
        <div style={cellStyle}>
          <span style={{ color: 'var(--text)' }}>{formatCurrency(stock.purchasePrice)}</span>
        </div>

        {/* Current Price */}
        <div style={cellStyle}>
          {currentPrice != null ? (
            <span style={{ color: 'var(--text)', fontWeight: 600 }}>
              {formatCurrency(currentPrice)}
            </span>
          ) : (
            <Skeleton width={70} />
          )}
        </div>

        {/* Day Change */}
        <div style={cellStyle}>
          {quote?.change != null ? (
            <div>
              <div style={{ color: changeIsPositive ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                {changeIsPositive ? '+' : ''}{formatCurrency(quote.change)}
              </div>
              <div style={{ fontSize: 11, color: changeIsPositive ? 'var(--green)' : 'var(--red)' }}>
                {formatPercent(quote.changePercent)}
              </div>
            </div>
          ) : (
            <Skeleton width={60} />
          )}
        </div>

        {/* Total P/L */}
        <div style={cellStyle}>
          {totalPL != null ? (
            <div>
              <div style={{ color: isPositive ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                {isPositive ? '+' : ''}{formatCurrency(totalPL)}
              </div>
              <div style={{ fontSize: 11, color: isPositive ? 'var(--green)' : 'var(--red)' }}>
                {isPositive ? '+' : ''}{formatCurrency(plPerShare)} / share
              </div>
            </div>
          ) : (
            <Skeleton width={70} />
          )}
        </div>

        {/* P/L % */}
        <div style={cellStyle}>
          {plPercent != null ? (
            <span style={{
              color: isPositive ? 'var(--green)' : 'var(--red)',
              fontWeight: 600,
              backgroundColor: isPositive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              padding: '3px 8px',
              borderRadius: 20,
              fontSize: 13,
            }}>
              {formatPercent(plPercent)}
            </span>
          ) : (
            <Skeleton width={55} />
          )}
        </div>

        {/* Delete */}
        <div style={{ ...cellStyle, justifyContent: 'center' }}>
          <button
            onClick={() => onRemove(stock.id)}
            title="Remove stock"
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: 14,
              transition: 'all 0.15s',
              lineHeight: 1,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--red)';
              e.currentTarget.style.color = 'var(--red)';
              e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--muted)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
