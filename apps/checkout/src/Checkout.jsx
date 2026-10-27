import React, { useState, useEffect } from 'react';

export default function Checkout() {
  const id = window.location.pathname.split('/').pop();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('LOADING');
  const [err, setErr] = useState('');

  useEffect(() => {
    let timer;
    async function poll() {
      try {
        const r = await fetch(`/api/v1/checkout/${id}`);
        const j = await r.json();
        if (!r.ok) { setErr(j.error || 'not found'); setStatus('ERROR'); return; }
        setData(j);
        setStatus(j.payment.status);
        if (['SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(j.payment.status)) return;
        timer = setTimeout(poll, 3000);
      } catch (e) { setErr(e.message); setStatus('ERROR'); }
    }
    poll();
    return () => clearTimeout(timer);
  }, [id]);

  useEffect(() => {
    if (status === 'SUCCESS' && data && window.parent !== window) {
      window.parent.postMessage({ type: 'skarpay:success', payload: { status: 'SUCCESS', order_id: data.payment.orderId, amount_received: data.payment.amountPaise / 100 } }, '*');
    }
    if (status === 'FAILED' && data && window.parent !== window) {
      window.parent.postMessage({ type: 'skarpay:failed', payload: { status: 'FAILED', order_id: data.payment.orderId } }, '*');
    }
  }, [status, data]);

  if (status === 'LOADING') return <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>;
  if (status === 'ERROR') return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>{err}</div>;

  const p = data.payment;
  const expired = p.expiresAt && new Date(p.expiresAt) < new Date();
  const brand = data.merchant?.branding || {};
  const accent = brand.accentColor || '#4f46e5';
  const brandName = brand.name || data.merchant?.name || 'Merchant';

  if (status === 'SUCCESS') {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h1 style={{ color: 'green' }}>Payment Successful</h1>
        <p>Order: {p.orderId}</p>
        <p>Amount: ₹{(p.amountPaise / 100).toFixed(2)}</p>
      </div>
    );
  }
  if (status === 'FAILED') return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}><h1>Payment Failed</h1></div>;
  if (status === 'EXPIRED' || expired) return <div style={{ padding: 40, textAlign: 'center' }}><h1>Expired</h1></div>;
  if (status === 'CANCELLED') return <div style={{ padding: 40, textAlign: 'center' }}><h1>Cancelled</h1></div>;

  return (
    <div style={{ padding: 40, textAlign: 'center', maxWidth: 420, margin: '0 auto' }}>
      <h2 style={{ color: accent }}>{brandName}</h2>
      <p style={{ fontSize: 24, fontWeight: 700 }}>₹{(p.amountPaise / 100).toFixed(2)}</p>
      <p>Order: {p.orderId}</p>
      {data.qr && <div dangerouslySetInnerHTML={{ __html: data.qr.svg }} />}
      <p style={{ fontSize: 12, color: '#666', marginTop: 12 }}>Scan with any UPI app</p>
      <p style={{ fontSize: 12, color: '#666' }}>VPA: {data.account?.vpa}</p>
      <button onClick={async () => { await fetch(`/api/v1/checkout/${id}/cancel`, { method: 'POST' }); window.location.reload(); }} style={{ marginTop: 16, background: accent, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>
        Cancel
      </button>
    </div>
  );
}
