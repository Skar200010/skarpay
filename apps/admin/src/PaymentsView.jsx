import React, { useState, useEffect } from 'react';

export default function PaymentsView({ apiKey }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const statusColor = (s) => ({ SUCCESS: '#10b981', FAILED: '#ef4444', ACTIVE: '#f59e0b', PROCESSING: '#3b82f6', EXPIRED: '#6b7280', CANCELLED: '#6b7280', QUEUED: '#8b5cf6' }[s] || '#6b7280');

  if (!apiKey) return <div style={{ color: '#ef4444', padding: 20 }}>Select a merchant and paste API key first.</div>;

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Payments</h1>
      <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px' }}>Live payment tracking (auto-refreshes every 5s)</p>
      {loading && payments.length === 0 && <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center' }}>Loading...</div>}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase' }}>Order</th>
              <th style={{ textAlign: 'left', padding: '12px', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: '12px', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase' }}>Method</th>
              <th style={{ textAlign: 'left', padding: '12px', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '12px', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase' }}>UTR</th>
              <th style={{ textAlign: 'left', padding: '12px', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td style={{ padding: '12px', fontSize: 13, borderBottom: '1px solid #f3f4f6', fontWeight: 600 }}>{p.order_id}</td>
                <td style={{ padding: '12px', fontSize: 13, borderBottom: '1px solid #f3f4f6' }}>Rs.{(p.amount_paise / 100).toFixed(2)}</td>
                <td style={{ padding: '12px', fontSize: 12, borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>{p.method}</td>
                <td style={{ padding: '12px', fontSize: 12, borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: statusColor(p.status) + '20', color: statusColor(p.status) }}>{p.status}</span>
                </td>
                <td style={{ padding: '12px', fontSize: 11, borderBottom: '1px solid #f3f4f6', fontFamily: 'monospace', color: '#6b7280' }}>{p.utr || '—'}</td>
                <td style={{ padding: '12px', fontSize: 11, borderBottom: '1px solid #f3f4f6', color: '#9ca3af' }}>{new Date(p.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {payments.length === 0 && !loading && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No payments yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
