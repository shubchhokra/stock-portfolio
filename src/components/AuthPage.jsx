import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage() {
  const { signup, login } = useAuth();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'signup') {
        await signup(email.trim(), username.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function switchTab(t) {
    setTab(t);
    setError('');
    setEmail('');
    setUsername('');
    setPassword('');
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ fontSize: '52px', marginBottom: '10px' }}>📈</div>
        <h1 style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text)', margin: 0, letterSpacing: '-0.5px' }}>
          Stock Market Game
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: '10px', fontSize: '15px' }}>
          Trade real stocks with <strong style={{ color: 'var(--green)' }}>$1,000,000</strong> in virtual cash. Beat the leaderboard.
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '420px',
      }}>
        {/* Tab switcher */}
        <div style={{ display: 'flex', marginBottom: '24px', background: 'var(--bg)', borderRadius: '10px', padding: '4px' }}>
          {[['login', 'Log In'], ['signup', 'Sign Up']].map(([t, label]) => (
            <button key={t} onClick={() => switchTab(t)} style={{
              flex: 1, padding: '9px', border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontWeight: '600', fontSize: '14px', transition: 'all 0.15s',
              background: tab === t ? 'var(--primary)' : 'transparent',
              color: tab === t ? '#fff' : 'var(--muted)',
            }}>
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <Field label="EMAIL" type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" autoFocus />

          {tab === 'signup' && (
            <Field label="USERNAME" type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="e.g. buffett42" />
          )}

          <Field label="PASSWORD" type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'} />

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', padding: '10px 14px', marginBottom: '16px',
              color: '#f87171', fontSize: '14px',
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px', background: 'var(--primary)',
            border: 'none', borderRadius: '10px', color: '#fff',
            fontWeight: '700', fontSize: '15px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
            marginTop: '4px',
          }}>
            {loading ? 'Please wait…' : tab === 'login' ? 'Log In' : 'Create Account & Play'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder, autoFocus }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--muted)', marginBottom: '6px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} required autoFocus={autoFocus}
        style={{
          width: '100%', padding: '11px 14px', background: 'var(--card)',
          border: '1px solid var(--border)', borderRadius: '8px',
          color: 'var(--text)', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
    </div>
  );
}
