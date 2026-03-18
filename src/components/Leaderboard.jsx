import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch, fmtCurrency, fmtPct } from '../utils/api.js';
import { supabase } from '../lib/supabase.js';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ currentUser }) {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const fetchingRef = useRef(false);

  const fetchBoard = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const data = await apiFetch('/leaderboard');
      setBoard(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Leaderboard fetch failed:', err);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Initial fetch
  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  // Supabase Realtime — re-fetch whenever profiles or holdings change
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchBoard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'holdings' }, () => fetchBoard())
      .subscribe(status => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('live');
        else if (status === 'CHANNEL_ERROR') setRealtimeStatus('error');
        else setRealtimeStatus('connecting');
      });

    return () => supabase.removeChannel(channel);
  }, [fetchBoard]);

  // Fallback polling every 30s (in case Realtime isn't available)
  useEffect(() => {
    const id = setInterval(fetchBoard, 30_000);
    return () => clearInterval(id);
  }, [fetchBoard]);

  const myRank = board.find(p => p.username === currentUser)?.rank;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700' }}>Leaderboard</h2>
          {myRank && (
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
              Your rank: <strong style={{ color: 'var(--primary)' }}>#{myRank}</strong> of {board.length}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Realtime status pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--muted)' }}>
            <span style={{
              display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
              background: realtimeStatus === 'live' ? 'var(--green)' : realtimeStatus === 'error' ? 'var(--red)' : '#f59e0b',
              boxShadow: realtimeStatus === 'live' ? '0 0 6px var(--green)' : 'none',
            }} />
            {realtimeStatus === 'live' ? 'Live' : realtimeStatus === 'error' ? 'Offline' : 'Connecting'}
          </div>
          {lastUpdated && (
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button onClick={fetchBoard} disabled={loading} style={{
            padding: '7px 14px', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: '8px',
            color: 'var(--muted)', fontSize: '13px', cursor: 'pointer',
          }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '64px' }}>Loading…</div>}

      {!loading && board.length === 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
          padding: '64px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆</div>
          <p style={{ color: 'var(--muted)', margin: 0 }}>No players yet. Share the link and get competing!</p>
        </div>
      )}

      {!loading && board.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Rank', 'Player', 'Portfolio Value', 'Cash', 'Invested', 'Total Return', 'Positions'].map(h => (
                  <th key={h} style={{
                    padding: '12px 20px', textAlign: 'left',
                    fontSize: '11px', fontWeight: '600', color: 'var(--muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {board.map((player, idx) => {
                const isMe = player.username === currentUser;
                const isPos = player.returnDollar >= 0;

                return (
                  <tr key={player.username} style={{
                    borderBottom: idx < board.length - 1 ? '1px solid var(--border)' : 'none',
                    background: isMe ? 'rgba(99,102,241,0.07)' : 'transparent',
                  }}>
                    <td style={{ padding: '16px 20px', fontSize: '20px', fontWeight: '700' }}>
                      {MEDALS[player.rank - 1] || <span style={{ color: 'var(--muted)', fontSize: '14px' }}>#{player.rank}</span>}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                          background: isMe ? 'var(--primary)' : 'var(--card)',
                          border: `2px solid ${isMe ? 'var(--primary)' : 'var(--border)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '14px', fontWeight: '800',
                          color: isMe ? '#fff' : 'var(--text)',
                        }}>
                          {player.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: isMe ? 'var(--primary)' : 'var(--text)' }}>
                            {player.username}
                            {isMe && (
                              <span style={{ fontSize: '10px', fontWeight: '700', marginLeft: '6px', padding: '2px 6px', background: 'rgba(99,102,241,0.2)', borderRadius: '4px', color: 'var(--primary)', verticalAlign: 'middle' }}>
                                YOU
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', fontWeight: '700', fontSize: '16px', whiteSpace: 'nowrap' }}>
                      {fmtCurrency(player.totalValue)}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {fmtCurrency(player.cash)}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {fmtCurrency(player.marketValue)}
                    </td>
                    <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                      <div style={{ color: isPos ? 'var(--green)' : 'var(--red)', fontWeight: '600' }}>
                        {isPos ? '+' : ''}{fmtCurrency(player.returnDollar)}
                      </div>
                      <span style={{
                        display: 'inline-block', padding: '2px 7px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', marginTop: '3px',
                        background: isPos ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                        color: isPos ? 'var(--green)' : 'var(--red)',
                      }}>
                        {fmtPct(player.returnPct)}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: 'var(--muted)' }}>
                      {player.positions}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: '12px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Starting capital: $1,000,000 · Ranked by total portfolio value</span>
            <span>{board.length} player{board.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}
    </div>
  );
}
