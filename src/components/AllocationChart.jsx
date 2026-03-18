import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16',
];

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const total = payload[0]?.payload?.total;
  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
  return (
    <div style={{
      backgroundColor: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
    }}>
      <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{item.name}</div>
      <div style={{ color: 'var(--muted)' }}>Value: <span style={{ color: 'var(--text)' }}>{formatCurrency(item.value)}</span></div>
      <div style={{ color: 'var(--muted)' }}>Share: <span style={{ color: item.payload.fill }}>{pct}%</span></div>
    </div>
  );
};

export default function AllocationChart({ holdings, prices }) {
  // Support both old prop name (stocks) and new (holdings)
  const items = holdings || [];

  const total = items.reduce((sum, s) => {
    const p = prices[s.symbol];
    return sum + s.shares * (p ? p.price : s.avg_cost || s.purchasePrice || 0);
  }, 0);

  const data = items.map((s, i) => {
    const p = prices[s.symbol];
    const value = s.shares * (p ? p.price : s.avg_cost || s.purchasePrice || 0);
    return {
      name: s.symbol,
      value,
      total,
      fill: COLORS[i % COLORS.length],
    };
  }).filter(d => d.value > 0);

  if (data.length === 0) {
    return (
      <div style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 24,
        textAlign: 'center',
        color: 'var(--muted)',
        fontSize: 14,
      }}>
        No positions yet
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 24,
    }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>
        Portfolio Allocation
      </h2>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={entry.fill} stroke="var(--surface)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span style={{ color: 'var(--text)', fontSize: 12 }}>{value}</span>
            )}
            iconSize={10}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
