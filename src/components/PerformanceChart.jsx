import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
    }}>
      <div style={{ color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#6366f1', fontWeight: 700 }}>{formatCurrency(payload[0].value)}</div>
    </div>
  );
};

export default function PerformanceChart({ stocks }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (stocks.length === 0) {
      setChartData([]);
      return;
    }

    const fetchHistorical = async () => {
      setLoading(true);
      setError('');
      try {
        const results = await Promise.allSettled(
          stocks.map(s =>
            fetch(`/api/historical/${s.symbol}?months=6`)
              .then(r => r.json())
              .then(data => ({ symbol: s.symbol, shares: s.shares, data }))
          )
        );

        // Build a map: date -> total portfolio value
        const dateMap = {};

        results.forEach(result => {
          if (result.status !== 'fulfilled') return;
          const { symbol, shares, data } = result.value;
          if (!Array.isArray(data)) return;

          data.forEach(point => {
            if (!point.date || point.close == null) return;
            const dateKey = new Date(point.date).toISOString().split('T')[0];
            if (!dateMap[dateKey]) dateMap[dateKey] = 0;
            dateMap[dateKey] += shares * point.close;
          });
        });

        const sorted = Object.entries(dateMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, value]) => ({
            date: formatDate(date),
            value: Math.round(value * 100) / 100,
          }));

        setChartData(sorted);
      } catch (err) {
        setError('Failed to load performance data.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistorical();
  }, [stocks]);

  const minValue = chartData.length > 0 ? Math.min(...chartData.map(d => d.value)) : 0;
  const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 0;
  const padding = (maxValue - minValue) * 0.1 || 1000;

  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 24,
    }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 20 }}>
        6-Month Performance
      </h2>

      {loading && (
        <div style={{
          height: 240,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--muted)',
          fontSize: 14,
        }}>
          Loading performance data...
        </div>
      )}

      {error && !loading && (
        <div style={{
          height: 240,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--red)',
          fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {!loading && !error && chartData.length === 0 && (
        <div style={{
          height: 240,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--muted)',
          fontSize: 14,
        }}>
          No historical data available
        </div>
      )}

      {!loading && !error && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minValue - padding, maxValue + padding]}
              tick={{ fill: 'var(--muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#6366f1', stroke: 'var(--surface)', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
