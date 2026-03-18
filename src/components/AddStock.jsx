import React, { useState } from 'react';

export default function AddStock({ onAdd, existingSymbols }) {
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const sym = symbol.trim().toUpperCase();
    const sharesNum = parseFloat(shares);
    const priceNum = parseFloat(purchasePrice);

    if (!sym) return setError('Please enter a ticker symbol.');
    if (isNaN(sharesNum) || sharesNum <= 0) return setError('Please enter a valid number of shares.');
    if (isNaN(priceNum) || priceNum <= 0) return setError('Please enter a valid purchase price.');
    if (existingSymbols.includes(sym)) return setError(`${sym} is already in your portfolio.`);

    setLoading(true);
    try {
      const res = await fetch(`/api/quote/${sym}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(`Could not find ticker "${sym}". Please check the symbol.`);
        setLoading(false);
        return;
      }

      onAdd({
        id: Date.now().toString(),
        symbol: sym,
        shares: sharesNum,
        purchasePrice: priceNum,
        addedAt: new Date().toISOString(),
      });

      setSymbol('');
      setShares('');
      setPurchasePrice('');
    } catch {
      setError('Failed to validate ticker. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontSize: 14,
    padding: '10px 14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
  };

  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 24,
      marginBottom: 24,
    }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>
        Add Stock
      </h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 160px' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 6 }}>
            Ticker Symbol
          </label>
          <input
            type="text"
            placeholder="e.g. AAPL"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            style={inputStyle}
            maxLength={10}
            disabled={loading}
          />
        </div>
        <div style={{ flex: '1 1 140px' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 6 }}>
            Shares
          </label>
          <input
            type="number"
            placeholder="e.g. 10"
            value={shares}
            onChange={e => setShares(e.target.value)}
            style={inputStyle}
            min="0.0001"
            step="any"
            disabled={loading}
          />
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 6 }}>
            Purchase Price ($)
          </label>
          <input
            type="number"
            placeholder="e.g. 150.00"
            value={purchasePrice}
            onChange={e => setPurchasePrice(e.target.value)}
            style={inputStyle}
            min="0.01"
            step="any"
            disabled={loading}
          />
        </div>
        <div style={{ flex: '0 0 auto' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? 'var(--border)' : 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              whiteSpace: 'nowrap',
              transition: 'background-color 0.2s',
            }}
          >
            {loading ? 'Validating...' : '+ Add Stock'}
          </button>
        </div>
      </form>
      {error && (
        <div style={{
          marginTop: 12,
          padding: '10px 14px',
          backgroundColor: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8,
          color: 'var(--red)',
          fontSize: 13,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
