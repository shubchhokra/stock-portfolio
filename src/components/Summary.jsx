import React from 'react';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export default function Summary({ stocks, prices }) {
  const totalInvested = stocks.reduce((sum, s) => sum + s.shares * s.purchasePrice, 0);

  const totalCurrent = stocks.reduce((sum, s) => {
    const p = prices[s.symbol];
    return sum + s.shares * (p ? p.price : s.purchasePrice);
  }, 0);

  const totalPL = totalCurrent - totalInvested;
  const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  const isPositive = totalPL >= 0;

  const stats = [
    { label: 'Total Invested', value: formatCurrency(totalInvested), color: 'var(--text)' },
    { label: 'Current Value', value: formatCurrency(totalCurrent), color: 'var(--text)' },
    {
      label: 'Total P/L',
      value: `${isPositive ? '+' : ''}${formatCurrency(totalPL)}`,
      color: isPositive ? 'var(--green)' : 'var(--red)',
    },
    {
      label: 'Total P/L %',
      value: `${isPositive ? '+' : ''}${totalPLPercent.toFixed(2)}%`,
      color: isPositive ? 'var(--green)' : 'var(--red)',
    },
    { label: 'Positions', value: stocks.length.toString(), color: 'var(--text)' },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 16,
      marginBottom: 0,
    }}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px 20px',
          }}
        >
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {stat.label}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: stat.color }}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
