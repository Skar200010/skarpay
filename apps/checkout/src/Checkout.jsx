import React, { useState, useEffect } from 'react';

export default function Checkout() {
  const id = window.location.pathname.split('/').pop();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('LOADING');
  const [err, setErr] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('upi');

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

  useEffect(() => {
    if (!data?.payment?.expiresAt) return;
    const iv = setInterval(() => {
      const ms = new Date(data.payment.expiresAt) - new Date();
      if (ms <= 0) { setTimeLeft('0:00'); clearInterval(iv); return; }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(iv);
  }, [data]);

  const brand = data?.merchant?.branding || {};
  const accent = brand.accentColor || '#0878F9';
  const brandName = brand.name || data?.merchant?.name || 'Merchant';
  const logo = brand.logoUrl;

  const isMobile = window.innerWidth < 768;
  const C = {
    page: { minHeight: '100vh', background: '#F3F5FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: isMobile ? 0 : 24 },
    container: { display: 'flex', flexDirection: isMobile ? 'column' : 'row', width: '100%', maxWidth: isMobile ? '100%' : 1475, background: '#fff', borderRadius: isMobile ? 0 : 20, boxShadow: isMobile ? 'none' : '0 20px 60px rgba(0,0,0,0.08)', overflow: 'hidden', minHeight: isMobile ? 'auto' : 720 },
    left: { width: isMobile ? '100%' : '47%', background: 'linear-gradient(145deg, #06265E 0%, #073B91 55%, #0878F9 100%)', padding: isMobile ? '20px 24px' : '36px 40px', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: isMobile ? 'flex-start' : 'space-between' },
    right: { width: isMobile ? '100%' : '53%', background: '#fff', padding: isMobile ? '20px 24px' : '38px 40px', display: 'flex', flexDirection: 'column' },
  };

  if (status === 'LOADING') {
    return <div style={C.page}><div style={{ ...C.container, alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#6b7280' }}>Loading checkout…</div></div></div>;
  }
  if (status === 'ERROR') {
    return <div style={C.page}><div style={{ ...C.container, alignItems: 'center', justifyContent: 'center' }}><div style={{ color: '#ef4444' }}>{err}</div></div></div>;
  }

  const p = data.payment;
  const expired = p.expiresAt && new Date(p.expiresAt) < new Date();

  // Success screen
  if (status === 'SUCCESS') {
    return (
      <div style={C.page}>
        <div style={{ ...C.container, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 60 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 40, marginBottom: 24 }}>✓</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>Payment Successful</h1>
          <p style={{ color: '#6b7280', margin: '0 0 32px' }}>Your payment has been confirmed</p>
          <div style={{ background: '#f9fafb', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ color: '#6b7280', fontSize: 14 }}>Order ID</span><span style={{ fontWeight: 600, fontSize: 14 }}>{p.orderId}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ color: '#6b7280', fontSize: 14 }}>Amount Paid</span><span style={{ fontWeight: 700, fontSize: 18, color: '#10b981' }}>₹{(p.amountPaise / 100).toFixed(2)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280', fontSize: 14 }}>UTR</span><span style={{ fontWeight: 600, fontSize: 13, fontFamily: 'monospace' }}>{p.utr || '—'}</span></div>
          </div>
        </div>
      </div>
    );
  }

  // Failure screen
  if (status === 'FAILED') {
    return (
      <div style={C.page}>
        <div style={{ ...C.container, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 60 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 40, marginBottom: 24 }}>✕</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>Payment Failed</h1>
          <p style={{ color: '#6b7280', margin: '0 0 24px' }}>Amount mismatch or verification timeout</p>
          <button style={{ background: accent, color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }} onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  // Expired
  if (status === 'EXPIRED' || expired) {
    return (
      <div style={C.page}>
        <div style={{ ...C.container, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 60 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 40, marginBottom: 24 }}>⏱</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>QR Code Expired</h1>
          <p style={{ color: '#6b7280', margin: '0 0 24px' }}>This payment session has expired. Please request a new one.</p>
        </div>
      </div>
    );
  }

  // Cancelled
  if (status === 'CANCELLED') {
    return (
      <div style={C.page}>
        <div style={{ ...C.container, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: 60 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 40, marginBottom: 24 }}>✕</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111', margin: '0 0 8px' }}>Payment Cancelled</h1>
          <p style={{ color: '#6b7280', margin: '0 0 24px' }}>You cancelled this payment.</p>
        </div>
      </div>
    );
  }

  // Main checkout
  const amount = (p.amountPaise / 100).toFixed(2);

  return (
    <div style={C.page}>
      <div style={C.container}>
        {/* LEFT PANEL */}
        <div style={C.left}>
          <div>
            {/* Branding header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700 }}>S</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '0.05em' }}>SKAR PAY</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Secure Payments • Trusted by Millions</div>
              </div>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', margin: '0 0 28px' }} />

            {/* Order Summary */}
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 20px' }}>Order Summary</h2>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>💻</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>Website Development</div>
                <div style={{ fontSize: 13, opacity: 0.7 }}>Business Website Package</div>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>Qty: 1</div>
              </div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>₹{amount}</div>
            </div>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', margin: '0 0 16px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14, opacity: 0.85 }}>
              <span>Subtotal</span><span>₹{amount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 14, opacity: 0.85 }}>
              <span>GST (18%)</span><span>₹{(parseFloat(amount) * 0.18).toFixed(2)}</span>
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', margin: '0 0 16px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, fontWeight: 700 }}>
              <span>Total</span><span>₹{(parseFloat(amount) * 1.18).toFixed(2)}</span>
            </div>

            {/* Trust features */}
            <div style={{ marginTop: 40 }}>
              {[
                { icon: '🛡️', title: 'Secure Payments', desc: 'Your payment information is handled securely.' },
                { icon: '⚡', title: 'Fast & Easy Checkout', desc: 'Multiple supported payment methods.' },
                { icon: '🎧', title: 'Dedicated Support', desc: 'Help when you need it.' },
                { icon: '🔒', title: 'Protected Transactions', desc: 'Your payment details are protected.' },
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 18 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{f.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom branding */}
          <div style={{ fontSize: 12, opacity: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
            Powered by <span style={{ fontWeight: 700 }}>SKAR PAY</span>
          </div>
        </div>
        {/* RIGHT PANEL */}
        <div style={C.right}>
          {/* Top toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#6b7280', cursor: 'pointer' }}>
              🌐 English <span style={{ fontSize: 10 }}>▼</span>
            </div>
            <button onClick={() => { fetch(`/api/v1/checkout/${id}/cancel`, { method: 'POST' }); window.close(); }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
          </div>

          {/* Recommended */}
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111', margin: '0 0 12px' }}>Recommended</h3>
          <div onClick={() => setSelectedMethod('upi')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: selectedMethod === 'upi' ? '2px solid #528FF0' : '1px solid #e5e7eb', borderRadius: 13, marginBottom: 16, cursor: 'pointer', background: selectedMethod === 'upi' ? '#f0f7ff' : '#fff', transition: 'all 0.2s' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #528FF0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selectedMethod === 'upi' && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#528FF0' }} />}
            </div>
            <div style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💳</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16, color: '#111' }}>UPI</div>
              <div style={{ fontSize: 13, color: '#6b7280' }}>Pay using any UPI app</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <span style={{ fontSize: 18 }}>G</span><span style={{ fontSize: 18 }}>P</span><span style={{ fontSize: 18 }}>T</span><span style={{ fontSize: 18 }}>B</span>
            </div>
            <span style={{ color: '#9ca3af', fontSize: 18 }}>›</span>
          </div>

          {/* UPI Panel */}
          {selectedMethod === 'upi' && (
            <div style={{ background: '#F0F7FF', border: '1px solid #D6E8FF', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: '#111', margin: '0 0 4px' }}>Scan & Pay with UPI QR</h4>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>Open any supported UPI app and scan the QR code.</p>
              {isMobile ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <a href={`upi://pay?pa=${encodeURIComponent(data.account?.vpa || '')}&pn=${encodeURIComponent(brandName)}&am=${amount}&tn=${encodeURIComponent(p.orderId)}`} style={{ display: 'inline-block', background: '#528FF0', color: '#fff', padding: '14px 32px', borderRadius: 8, fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>
                    Pay with UPI App
                  </a>
                  <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>Opens GPay, PhonePe, Paytm, or BHIM</p>
                </div>
              ) : (
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                {/* QR */}
                <div style={{ background: '#fff', borderRadius: 10, padding: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  {data.qr && <div dangerouslySetInnerHTML={{ __html: data.qr.svg }} style={{ width: 200, height: 200 }} />}
                </div>
                {/* Instructions */}
                <div style={{ flex: 1 }}>
                  {[
                    { n: 1, title: 'Open any UPI app', desc: 'Google Pay, PhonePe, Paytm, or another supported app.' },
                    { n: 2, title: 'Scan the QR code', desc: 'Use the scan feature in your UPI app.' },
                    { n: 3, title: 'Verify and pay', desc: 'Confirm the merchant and amount before authorizing.' },
                  ].map(s => (
                    <div key={s.n} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#D6E8FF', color: '#0878F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{s.n}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#111' }}>{s.title}</div>
                        <div style={{ fontSize: 12, color: '#6b7280' }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                  {/* Status card */}
                  <div style={{ background: '#e8f4fd', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>🕐</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0878F9' }}>Waiting for payment...</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>QR valid for {timeLeft}</div>
                    </div>
                  </div>
                </div>
              </div>
              )}
            </div>
          )}

          {/* Non-UPI method info panel */}
          {selectedMethod !== 'upi' && (
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '24px', marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{selectedMethod === 'cards' ? '💳' : selectedMethod === 'netbanking' ? '🏦' : selectedMethod === 'wallets' ? '👛' : '📅'}</div>
              <h4 style={{ fontSize: 16, fontWeight: 600, color: '#111', margin: '0 0 8px' }}>
                {selectedMethod === 'cards' ? 'Card Payment' : selectedMethod === 'netbanking' ? 'Net Banking' : selectedMethod === 'wallets' ? 'Wallet Payment' : 'EMI'}
              </h4>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
                {selectedMethod === 'cards' ? 'Card payments are processed at the store counter. Please visit the counter to complete your payment.' :
                 selectedMethod === 'netbanking' ? 'Net banking transfers can be made directly to the merchant UPI ID shown above.' :
                 selectedMethod === 'wallets' ? 'Wallet payments are supported via UPI. Please use the UPI option.' :
                 'EMI options are available for orders above ₹3,000. Contact the merchant for details.'}
              </p>
              {selectedMethod === 'netbanking' && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontFamily: 'monospace', color: '#111' }}>
                  UPI ID: {data.account?.vpa}
                </div>
              )}
            </div>
          )}

          {/* Other payment methods */}
          {[
            { id: 'cards', title: 'Cards', desc: 'Visa, Mastercard, RuPay, and more.', icon: '💳' },
            { id: 'netbanking', title: 'Net Banking', desc: 'All supported banks.', icon: '🏦' },
            { id: 'wallets', title: 'Wallets', desc: 'Pay using supported wallet balances.', icon: '👛' },
            { id: 'emi', title: 'EMI', desc: 'Available EMI options.', icon: '📅' },
          ].map(m => (
            <div key={m.id} onClick={() => setSelectedMethod(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: selectedMethod === m.id ? '2px solid #528FF0' : '1px solid #e5e7eb', borderRadius: 13, marginBottom: 10, cursor: 'pointer', background: selectedMethod === m.id ? '#f0f7ff' : '#fff', transition: 'all 0.2s' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #528FF0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {selectedMethod === m.id && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#528FF0' }} />}
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{m.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 16, color: '#111' }}>{m.title}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{m.desc}</div>
              </div>
              <span style={{ color: '#9ca3af', fontSize: 18 }}>›</span>
            </div>
          ))}

          {/* I've Paid button */}
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button style={{ flex: 1, background: accent, color: '#fff', border: 'none', padding: '12px', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }} onClick={async () => {
              await fetch(`/api/v1/checkout/${id}/processing`, { method: 'POST' }).catch(() => {});
            }}>I've Paid — Verify</button>
            <button style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '12px 20px', borderRadius: 8, fontSize: 14, cursor: 'pointer' }} onClick={async () => { await fetch(`/api/v1/checkout/${id}/cancel`, { method: 'POST' }); window.location.reload(); }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
