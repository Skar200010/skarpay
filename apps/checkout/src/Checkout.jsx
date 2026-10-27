import React, { useState, useEffect } from 'react';

export default function Checkout() {
  const id = window.location.pathname.split('/').pop();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('LOADING');
  const [err, setErr] = useState('');
  const [method, setMethod] = useState('upi');

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

  const brand = data?.merchant?.branding || {};
  const accent = brand.accentColor || '#528FF0';
  const brandName = brand.name || data?.merchant?.name || 'Merchant';
  const logo = brand.logoUrl;

  const styles = {
    page: { minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: 16 },
    card: { background: '#fff', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.08)', width: '100%', maxWidth: 420, overflow: 'hidden' },
    header: { background: accent, padding: '24px 28px', color: '#fff' },
    body: { padding: '28px' },
    amount: { fontSize: 36, fontWeight: 700, margin: '0 0 4px' },
    label: { fontSize: 13, color: '#6b7280', margin: '0 0 2px' },
    qrWrap: { background: '#f9fafb', borderRadius: 12, padding: 16, margin: '20px 0', display: 'inline-block' },
    btn: { background: accent, color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer', width: '100%' },
    btnSecondary: { background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 8, fontSize: 14, cursor: 'pointer' },
    successIcon: { width: 72, height: 72, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff', fontSize: 36 },
    failIcon: { width: 72, height: 72, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#fff', fontSize: 36 },
  };

  if (status === 'LOADING') {
    return <div style={styles.page}><div style={styles.card}><div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>Loading checkout…</div></div></div>;
  }
  if (status === 'ERROR') {
    return <div style={styles.page}><div style={styles.card}><div style={{ padding: 60, textAlign: 'center', color: '#ef4444' }}>{err}</div></div></div>;
  }

  const p = data.payment;
  const expired = p.expiresAt && new Date(p.expiresAt) < new Date();

  if (status === 'SUCCESS') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ ...styles.header, background: '#10b981' }}>
            <div style={{ textAlign: 'center' }}>
              {logo && <img src={logo} alt="" style={{ height: 32, marginBottom: 8 }} />}
              <div style={{ fontSize: 18, fontWeight: 600 }}>{brandName}</div>
            </div>
          </div>
          <div style={{ ...styles.body, textAlign: 'center' }}>
            <div style={styles.successIcon}>✓</div>
            <h1 style={{ fontSize: 24, margin: '0 0 8px', color: '#111' }}>Payment Successful</h1>
            <p style={{ color: '#6b7280', margin: '0 0 24px' }}>Your payment has been confirmed</p>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={styles.label}>Order ID</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{p.orderId}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={styles.label}>Amount Paid</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#10b981' }}>₹{(p.amountPaise / 100).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={styles.label}>UTR</span>
                <span style={{ fontWeight: 600, fontSize: 13, fontFamily: 'monospace' }}>{p.utr || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'FAILED') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ ...styles.header, background: '#ef4444' }}>
            <div style={{ textAlign: 'center' }}>
              {logo && <img src={logo} alt="" style={{ height: 32, marginBottom: 8 }} />}
              <div style={{ fontSize: 18, fontWeight: 600 }}>{brandName}</div>
            </div>
          </div>
          <div style={{ ...styles.body, textAlign: 'center' }}>
            <div style={styles.failIcon}>✕</div>
            <h1 style={{ fontSize: 24, margin: '0 0 8px', color: '#111' }}>Payment Failed</h1>
            <p style={{ color: '#6b7280', margin: '0 0 24px' }}>Amount mismatch or verification timeout</p>
            <button style={styles.btnSecondary} onClick={() => window.location.reload()}>Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'EXPIRED' || expired) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ ...styles.header, background: '#6b7280' }}>
            <div style={{ textAlign: 'center' }}>
              {logo && <img src={logo} alt="" style={{ height: 32, marginBottom: 8 }} />}
              <div style={{ fontSize: 18, fontWeight: 600 }}>{brandName}</div>
            </div>
          </div>
          <div style={{ ...styles.body, textAlign: 'center' }}>
            <div style={{ ...styles.failIcon, background: '#6b7280' }}>⏱</div>
            <h1 style={{ fontSize: 24, margin: '0 0 8px', color: '#111' }}>Session Expired</h1>
            <p style={{ color: '#6b7280', margin: '0 0 24px' }}>This payment link has expired. Please request a new one.</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'CANCELLED') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ ...styles.header, background: '#6b7280' }}>
            <div style={{ textAlign: 'center' }}>
              {logo && <img src={logo} alt="" style={{ height: 32, marginBottom: 8 }} />}
              <div style={{ fontSize: 18, fontWeight: 600 }}>{brandName}</div>
            </div>
          </div>
          <div style={{ ...styles.body, textAlign: 'center' }}>
            <div style={{ ...styles.failIcon, background: '#6b7280' }}>✕</div>
            <h1 style={{ fontSize: 24, margin: '0 0 8px', color: '#111' }}>Payment Cancelled</h1>
            <p style={{ color: '#6b7280', margin: '0 0 24px' }}>You cancelled this payment.</p>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE - show QR
  let timeLeft = '';
  if (p.expiresAt) {
    const ms = new Date(p.expiresAt) - new Date();
    if (ms > 0) {
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      timeLeft = `${m}:${s.toString().padStart(2, '0')}`;
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              {logo && <img src={logo} alt="" style={{ height: 28, marginBottom: 4 }} />}
              <div style={{ fontSize: 16, fontWeight: 600, opacity: 0.95 }}>{brandName}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={styles.label}>Amount</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>₹{(p.amountPaise / 100).toFixed(2)}</div>
            </div>
          </div>
        </div>
        <div style={styles.body}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: '#f3f4f6', borderRadius: 8, padding: 4 }}>
            {['upi', 'card', 'cod'].map(m => (
              <button key={m} onClick={() => setMethod(m)} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: method === m ? '#fff' : 'transparent', color: method === m ? accent : '#6b7280', boxShadow: method === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                {m === 'upi' ? 'UPI' : m === 'card' ? 'Card' : 'Cash on Delivery'}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={styles.label}>Order ID</div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#111' }}>{p.orderId}</div>
          </div>
          {method === 'upi' && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <div style={styles.qrWrap}>
              {data.qr && <div dangerouslySetInnerHTML={{ __html: data.qr.svg }} />}
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '8px 0 0' }}>Scan with any UPI app</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0', fontFamily: 'monospace' }}>{data.account?.vpa}</p>
          </div>
          )}
          {method === 'card' && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#6b7280' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💳</div>
              <p style={{ fontWeight: 600, color: '#111' }}>Pay by Card at Counter</p>
              <p style={{ fontSize: 13 }}>Please visit the store counter to complete card payment.</p>
            </div>
          )}
          {method === 'cod' && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#6b7280' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💵</div>
              <p style={{ fontWeight: 600, color: '#111' }}>Cash on Delivery</p>
              <p style={{ fontSize: 13 }}>Pay in cash when your order is delivered.</p>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Time remaining</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', fontFamily: 'monospace' }}>{timeLeft}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={styles.btn} onClick={async () => {
              await fetch(`/api/v1/checkout/${id}/processing`, { method: 'POST' }).catch(() => {});
              // poll will pick up new status
            }}>I've Paid — Verify</button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button style={{ ...styles.btnSecondary, fontSize: 13 }} onClick={async () => { await fetch(`/api/v1/checkout/${id}/cancel`, { method: 'POST' }); window.location.reload(); }}>
              Cancel Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
