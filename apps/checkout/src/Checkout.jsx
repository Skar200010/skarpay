import React, { useState, useEffect } from 'react';

export default function Checkout() {
  const id = window.location.pathname.split('/').pop();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('LOADING');
  const [err, setErr] = useState('');
  const [timeLeft, setTimeLeft] = useState('11:42');
  const [activeTab, setActiveTab] = useState('upi');
  const [vpaInput, setVpaInput] = useState('');

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
      if (ms <= 0) { setTimeLeft('00:00'); clearInterval(iv); return; }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(iv);
  }, [data]);

  const p = data?.payment;
  const brand = data?.merchant?.branding || {};
  const brandName = brand.name || data?.merchant?.name || 'Merchant';
  const accent = brand.accentColor || '#8083ff';
  const amount = p ? (p.amountPaise / 100).toFixed(2) : '0.00';
  const total = amount;

  function switchTab(tabId) {
    setActiveTab(tabId);
  }

  if (status === 'LOADING') {
    return <div className="min-h-screen bg-background flex items-center justify-center text-on-surface-variant">Loading checkout…</div>;
  }
  if (status === 'ERROR') {
    return <div className="min-h-screen bg-background flex items-center justify-center text-error">{err}</div>;
  }

  // Success
  if (status === 'SUCCESS') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-surface-container-low border border-outline-variant/25 rounded-xl p-8 max-w-md w-full text-center specular-card">
          <div className="h-16 w-16 rounded-full bg-tertiary/20 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-tertiary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface mb-2">Payment Successful</h1>
          <p className="text-body-sm text-on-surface-variant mb-6">Your payment has been confirmed</p>
          <div className="bg-surface-container-lowest rounded-lg p-4 space-y-3 text-left">
            <div className="flex justify-between"><span className="text-body-sm text-on-surface-variant">Order ID</span><span className="font-code-sm text-body-sm text-on-surface font-semibold">{p.orderId}</span></div>
            <div className="flex justify-between"><span className="text-body-sm text-on-surface-variant">Amount Paid</span><span className="font-code-sm text-body-lg text-tertiary font-bold">₹{amount}</span></div>
            <div className="flex justify-between"><span className="text-body-sm text-on-surface-variant">UTR</span><span className="font-code-sm text-body-sm text-on-surface">{p.utr || '—'}</span></div>
          </div>
        </div>
      </div>
    );
  }

  // Failed
  if (status === 'FAILED') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-surface-container-low border border-outline-variant/25 rounded-xl p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-full bg-error-container/30 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-error text-4xl">cancel</span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface mb-2">Payment Failed</h1>
          <p className="text-body-sm text-on-surface-variant mb-6">Amount mismatch or verification timeout</p>
          <button className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-primary-container to-inverse-primary text-on-surface font-label-md font-bold text-sm" onClick={() => window.location.reload()}>Try Again</button>
        </div>
      </div>
    );
  }

  // Expired
  if (status === 'EXPIRED' || (p?.expiresAt && new Date(p.expiresAt) < new Date())) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-surface-container-low border border-outline-variant/25 rounded-xl p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-full bg-surface-container-high flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-on-surface-variant text-4xl">timer_off</span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface mb-2">QR Code Expired</h1>
          <p className="text-body-sm text-on-surface-variant mb-6">This payment session has expired. Please request a new one.</p>
        </div>
      </div>
    );
  }

  // Cancelled
  if (status === 'CANCELLED') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="bg-surface-container-low border border-outline-variant/25 rounded-xl p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-full bg-surface-container-high flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-on-surface-variant text-4xl">cancel</span>
          </div>
          <h1 className="text-headline-lg font-headline-lg text-on-surface mb-2">Payment Cancelled</h1>
          <p className="text-body-sm text-on-surface-variant mb-6">You cancelled this payment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 lg:py-8">
      {/* Merchant Context Banner */}
      <div className="bg-surface-container-low border border-outline-variant/25 rounded-xl p-4 mb-6 specular-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-surface-container-high border border-outline-variant/40 flex items-center justify-center text-primary font-bold text-lg shadow-inner">
            <span className="material-symbols-outlined text-2xl text-secondary">token</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-headline-md font-headline-md text-on-surface font-bold tracking-tight">{brandName}</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-label-sm font-semibold bg-tertiary/15 text-tertiary border border-tertiary/20">
                <span className="h-1.5 w-1.5 rounded-full bg-tertiary"></span> Verified Merchant
              </span>
            </div>
            <p className="text-body-sm font-body-sm text-on-surface-variant flex items-center gap-2 mt-0.5">
              <span>MID: <span className="font-code-sm text-secondary">{p.orderId}</span></span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-surface-container-lowest/90 px-4 py-2.5 rounded-lg border border-outline-variant/30 self-start sm:self-auto">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
            </span>
            <span className="text-body-sm font-body-sm text-on-surface-variant">Session expires in:</span>
          </div>
          <span className="font-code-sm text-body-lg font-semibold text-secondary tracking-wider">{timeLeft}</span>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Payment Methods */}
        <div className="lg:col-span-7 space-y-5">
          {/* Tabs */}
          <div className="bg-surface-container-low border border-outline-variant/25 rounded-xl p-1.5 specular-card">
            <nav className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'upi', icon: 'qr_code_scanner', label: 'UPI & QR' },
                { id: 'card', icon: 'credit_card', label: 'Cards' },
                { id: 'netbanking', icon: 'account_balance', label: 'Net Banking' },
                { id: 'wallets', icon: 'account_balance_wallet', label: 'Wallets & EMI' },
              ].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-body-sm font-medium transition-all duration-150 ${activeTab === t.id ? 'bg-primary-container text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60'}`}>
                  <span className="material-symbols-outlined text-base">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* UPI Tab */}
          {activeTab === 'upi' && (
            <section className="bg-surface-container-low border border-outline-variant/25 rounded-xl p-5 sm:p-6 specular-card">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 mb-5">
                <div>
                  <h2 className="text-headline-md font-headline-md text-on-surface font-semibold flex items-center gap-2">
                    Scan QR or Enter UPI ID
                    <span className="text-xs px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary font-label-sm border border-tertiary/20">Instant Settlement</span>
                  </h2>
                  <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">Zero convenience surcharge on all UPI VPAs.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center mb-6">
                <div className="md:col-span-5 flex flex-col items-center">
                  <div className="relative p-3 rounded-xl bg-surface-container-lowest border-2 border-primary/30 specular-card shadow-lg">
                    <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-primary"></div>
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-primary"></div>
                    <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-primary"></div>
                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-primary"></div>
                    <div className="scanner-laser absolute inset-x-2 top-2 h-0.5 bg-gradient-to-r from-transparent via-secondary to-transparent pointer-events-none z-20"></div>
                    <div className="relative bg-white p-3 rounded-lg" style={{ width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {data.qr && <div dangerouslySetInnerHTML={{ __html: data.qr.svg }} style={{ width: 160, height: 160, maxWidth: '100%', maxHeight: '100%' }} />}
                    </div>
                  </div>
                  <span className="text-label-sm font-label-sm text-on-surface-variant mt-2.5 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-tertiary">autorenew</span> Auto-refreshes
                  </span>
                </div>
                <div className="md:col-span-7 space-y-3.5">
                  <div className="bg-surface-container-lowest/80 border border-outline-variant/30 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-secondary animate-pulse"></span>
                      <span className="text-body-sm font-body-sm font-semibold text-on-surface">Polling Status:</span>
                      <span className="text-body-sm font-body-sm text-secondary font-code-sm">Waiting for payment...</span>
                    </div>
                    <p className="text-body-sm font-body-sm text-on-surface-variant leading-relaxed">Open any UPI-enabled mobile payment app and scan this dynamic QR.</p>
                    <div className="pt-2 border-t border-outline-variant/20 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase font-label-sm text-outline tracking-wider mr-1">Scan with:</span>
                      {['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'CRED'].map(a => (
                        <span key={a} className="px-2 py-0.5 rounded bg-surface-container-high text-xs font-semibold text-on-surface border border-outline-variant/30">{a}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-label-sm font-label-sm text-on-surface-variant">UPI ID:</span>
                    <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3.5 py-2.5 text-on-surface text-body-md font-code-sm">{data.account?.vpa}</div>
                  </div>
                </div>
              </div>
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-outline-variant/20"></div></div>
                <div className="relative inline-block px-3 bg-surface-container-low text-xs font-code-sm uppercase tracking-wider text-outline">OR ENTER UPI VPA</div>
              </div>
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); alert('Verifying...'); }}>
                <div>
                  <label className="block text-label-md font-label-md text-on-surface mb-1.5">Virtual Payment Address (VPA)</label>
                  <div className="relative flex items-center">
                    <input className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-3.5 py-2.5 text-on-surface text-body-md font-code-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="e.g. yourhandle@okhdfcbank" type="text" value={vpaInput} onChange={e => setVpaInput(e.target.value)} />
                  </div>
                </div>
                <button className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-primary-container to-inverse-primary hover:opacity-95 text-on-surface font-label-md font-bold text-sm tracking-wide shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2" type="submit">
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                  <span>Verify &amp; Pay ₹{amount} via UPI</span>
                </button>
              </form>
            </section>
          )}

          {/* Cards Tab */}
          {activeTab === 'card' && (
            <section className="bg-surface-container-low border border-outline-variant/25 rounded-xl p-5 sm:p-6 specular-card">
              <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 mb-5">
                <div>
                  <h2 className="text-headline-md font-headline-md text-on-surface font-semibold">Credit &amp; Debit Cards</h2>
                  <p className="text-body-sm font-body-sm text-on-surface-variant">Domestic and International Cards with 3D Secure 2.0</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-code-sm">
                  <span className="px-2 py-0.5 rounded bg-surface-container-lowest border border-outline-variant/30">Visa</span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-lowest border border-outline-variant/30">Mastercard</span>
                  <span className="px-2 py-0.5 rounded bg-surface-container-lowest border border-outline-variant/30">RuPay</span>
                </div>
              </div>
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-4">credit_card</span>
                <h3 className="text-headline-md font-headline-md text-on-surface mb-2">Card Payment at Counter</h3>
                <p className="text-body-sm text-on-surface-variant mb-4">Please visit the store counter to complete card payment via POS terminal.</p>
                <button className="py-3 px-6 rounded-lg bg-gradient-to-r from-primary-container to-inverse-primary text-on-surface font-label-md font-bold text-sm" onClick={() => { fetch(`/api/v1/checkout/${id}/processing`, { method: 'POST' }); }}>
                  I've Paid at Counter — Verify
                </button>
              </div>
            </section>
          )}

          {/* Net Banking Tab */}
          {activeTab === 'netbanking' && (
            <section className="bg-surface-container-low border border-outline-variant/25 rounded-xl p-5 sm:p-6 specular-card">
              <div className="pb-4 border-b border-outline-variant/20 mb-5">
                <h2 className="text-headline-md font-headline-md text-on-surface font-semibold">Net Banking</h2>
                <p className="text-body-sm font-body-sm text-on-surface-variant">Transfer directly to merchant UPI ID</p>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-4 mb-4">
                <div className="text-body-sm text-on-surface-variant mb-2">Merchant UPI ID:</div>
                <div className="font-code-sm text-body-lg text-secondary font-semibold">{data.account?.vpa}</div>
              </div>
              <p className="text-body-sm text-on-surface-variant">Open your bank app, go to UPI transfer, and send ₹{amount} to the above UPI ID. Then click verify.</p>
              <button className="w-full mt-4 py-3 px-4 rounded-lg bg-gradient-to-r from-primary-container to-inverse-primary text-on-surface font-label-md font-bold text-sm" onClick={() => { fetch(`/api/v1/checkout/${id}/processing`, { method: 'POST' }); }}>
                I've Paid — Verify
              </button>
            </section>
          )}

          {/* Wallets Tab */}
          {activeTab === 'wallets' && (
            <section className="bg-surface-container-low border border-outline-variant/25 rounded-xl p-5 sm:p-6 specular-card">
              <div className="pb-4 border-b border-outline-variant/20 mb-5">
                <h2 className="text-headline-md font-headline-md text-on-surface font-semibold">Wallets &amp; EMI</h2>
                <p className="text-body-sm font-body-sm text-on-surface-variant">Wallet payments supported via UPI. EMI available for orders above ₹3,000.</p>
              </div>
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-4">account_balance_wallet</span>
                <p className="text-body-sm text-on-surface-variant mb-4">Please use UPI for wallet payments. EMI available for orders above ₹3,000 — contact merchant.</p>
                <button className="py-3 px-6 rounded-lg bg-surface-container-high text-on-surface font-label-md font-bold text-sm" onClick={() => setActiveTab('upi')}>Use UPI Instead</button>
              </div>
            </section>
          )}

          {/* I've Paid button */}
          <div className="flex gap-3">
            <button className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-primary-container to-inverse-primary hover:opacity-95 text-on-surface font-label-md font-bold text-sm tracking-wide shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2" onClick={async () => {
              await fetch(`/api/v1/checkout/${id}/processing`, { method: 'POST' }).catch(() => {});
            }}>
              <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              <span>I've Paid — Verify</span>
            </button>
            <button className="py-3 px-5 rounded-lg border border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:border-outline transition-colors font-label-md text-sm" onClick={async () => { await fetch(`/api/v1/checkout/${id}/cancel`, { method: 'POST' }); window.location.reload(); }}>
              Cancel
            </button>
          </div>

          {/* Buyer Protection */}
          <div className="bg-surface-container-lowest/90 border border-outline-variant/25 rounded-xl p-4 flex items-center gap-3.5">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-tertiary/10 border border-tertiary/20 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
            </div>
            <div>
              <h3 className="text-body-md font-label-md text-on-surface font-semibold">SkarPay 100% Buyer Protection Guarantee</h3>
              <p className="text-body-sm font-body-sm text-on-surface-variant">In the unlikely event of an account debit without order fulfillment, auto-refunds are credited back within 2 business hours.</p>
            </div>
          </div>
        </div>

        {/* RIGHT: Order Summary */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-surface-container-low border border-outline-variant/25 rounded-xl p-5 sm:p-6 specular-card">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20 mb-4">
              <div>
                <span className="text-label-sm font-label-sm uppercase tracking-wider text-outline">Order Details</span>
                <h2 className="text-headline-md font-headline-md text-on-surface font-bold">Checkout Summary</h2>
              </div>
              <span className="text-xs font-code-sm px-2.5 py-1 rounded bg-surface-container-lowest border border-outline-variant/40 text-secondary">{p.orderId}</span>
            </div>
            <div className="space-y-3.5 pb-4 border-b border-outline-variant/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-body-md font-medium text-on-surface">{brandName}</p>
                  <p className="text-body-sm text-on-surface-variant">Payment to {brandName}</p>
                </div>
                <span className="font-code-sm text-body-md text-on-surface font-semibold shrink-0">₹{amount}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-on-surface-variant">Gateway Fee</span>
                <span className="font-code-sm text-tertiary">FREE</span>
              </div>
            </div>
            <div className="pt-4 space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-body-lg font-label-md font-semibold text-on-surface">Total Payable</span>
                <div className="text-right">
                  <span className="text-headline-xl font-headline-xl font-bold text-on-surface tracking-tight">₹{total}</span>
                  <span className="block text-[11px] font-code-sm text-outline">No additional charges</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="bg-surface-container-low border border-outline-variant/25 rounded-xl p-5 specular-card space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/20">
              <span className="material-symbols-outlined text-primary text-lg">verified</span>
              <h3 className="text-body-md font-headline-md font-semibold text-on-surface">Security &amp; Compliance</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-body-sm">
              {[
                { icon: 'lock', title: '256-Bit TLS', desc: 'End-to-End Encrypted' },
                { icon: 'policy', title: 'PCI-DSS V4.0', desc: 'Level 1 Certified' },
                { icon: 'account_balance', title: 'RBI Regulated', desc: 'PA License Holder' },
                { icon: 'hub', title: 'NPCI Gateway', desc: 'UPI Ready' },
              ].map(b => (
                <div key={b.title} className="bg-surface-container-lowest p-2.5 rounded-lg border border-outline-variant/30 flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-lg">{b.icon}</span>
                  <div>
                    <div className="text-xs font-semibold text-on-surface">{b.title}</div>
                    <div className="text-[10px] text-on-surface-variant font-code-sm">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Support */}
          <div className="text-center bg-surface-container-lowest/50 p-3 rounded-lg border border-outline-variant/20">
            <p className="text-body-sm font-body-sm text-on-surface-variant">Need assistance?</p>
            <div className="flex items-center justify-center gap-4 mt-2">
              <a className="inline-flex items-center gap-1.5 text-xs text-secondary hover:underline font-code-sm" href="mailto:support@skarpay.io">
                <span className="material-symbols-outlined text-sm">mail</span> support@skarpay.io
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
