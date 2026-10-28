import React, { useState, useEffect } from 'react';

const C = {
  surfaceLow: '#0b0f19',
  surfaceLowest: '#070a10',
  outline: '#4b5570',
  outlineVariant: '#263047',
  primary: '#c0c1ff',
  secondary: '#4cd7f6',
  tertiary: '#4edea3',
  error: '#ffb4ab',
  onSurface: '#e2e7f5',
  onSurfaceVariant: '#8e99b5',
};

export default function PaymentsView({ apiKey }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const mono = { fontFamily: 'JetBrains Mono, monospace' };

  async function load() {
    if (!apiKey) return;
    setLoading(true);
    try {
      const r = await fetch('/api/v1/payments?limit=50', { headers: { 'X-API-Key': apiKey } });
      const j = await r.json();
      setPayments(j.payments || []);
    } catch (e) {}
    setLoading(false);
  }

  useEffect(() => { load(); const iv = setInterval(load, 5000); return () => clearInterval(iv); }, [apiKey]);

  const statusColor = (s) => ({ SUCCESS: C.tertiary, FAILED: C.error, ACTIVE: '#f59e0b', PROCESSING: C.secondary, EXPIRED: C.onSurfaceVariant, CANCELLED: C.onSurfaceVariant, QUEUED: '#8b5cf6' }[s] || C.onSurfaceVariant);

  if (!apiKey) return <div style={{ ...mono, fontSize: 11, color: C.error, padding: 20 }}>Select a merchant and paste API key first.</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ ...mono, fontSize: 10, color: C.onSurfaceVariant }}>Live payment tracking (auto-refresh 5s)</span>
        <button onClick={load} style={{ ...mono, fontSize: 10, padding: '3px 8px', borderRadius: 3, border: `1px solid ${C.outlineVariant}`, background: C.surfaceLow, color: C.onSurface, cursor: 'pointer' }}>⟳ Refresh</button>
      </div>
      {loading && payments.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 36, background: C.surfaceLow, borderRadius: 4, animation: 'pulse 1.5s infinite' }} />)}
        </div>
      )}
      <div style={{ background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: 6, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: C.surfaceLow }}>
              {['Order', 'Amount', 'Method', 'Status', 'UTR', 'Created'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 10px', ...mono, fontSize: 9, color: C.onSurfaceVariant, fontWeight: 600, borderBottom: `1px solid ${C.outlineVariant}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${C.outlineVariant}30` }}>
                <td style={{ padding: '8px 10px', ...mono, fontSize: 11, color: '#fff', fontWeight: 600 }}>{p.order_id}</td>
                <td style={{ padding: '8px 10px', ...mono, fontSize: 11, color: C.onSurface }}>₹{(p.amount_paise / 100).toFixed(2)}</td>
                <td style={{ padding: '8px 10px', ...mono, fontSize: 9, color: C.onSurfaceVariant }}>{p.method}</td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{ ...mono, fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 3, background: statusColor(p.status) + '15', color: statusColor(p.status), border: `1px solid ${statusColor(p.status)}30` }}>{p.status}</span>
                </td>
                <td style={{ padding: '8px 10px', ...mono, fontSize: 9, color: C.onSurfaceVariant, fontFamily: 'monospace' }}>{p.utr || '—'}</td>
                <td style={{ padding: '8px 10px', ...mono, fontSize: 9, color: C.onSurfaceVariant }}>{new Date(p.created_at).toLocaleTimeString()}</td>
              </tr>
            ))}
            {payments.length === 0 && !loading && (
              <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', ...mono, fontSize: 10, color: C.onSurfaceVariant }}>No payments yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
