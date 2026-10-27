import React, { useState, useEffect } from 'react';
import BrandingEditor from './BrandingEditor.jsx';
import PaymentsView from './PaymentsView.jsx';

const API = '/api/v1';
const ACCENT = '#528FF0';

export default function App() {
  const [merchants, setMerchants] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [upi, setUpi] = useState('');
  const [creds, setCreds] = useState(null);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [vpa, setVpa] = useState('');
  const [acctName, setAcctName] = useState('');
  const [orderId, setOrderId] = useState('ORD-1');
  const [orderAmt, setOrderAmt] = useState('499');
  const [selectedVpa, setSelectedVpa] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [tab, setTab] = useState('merchants');

  async function loadMerchants() {
    const r = await fetch(`${API}/merchants`);
    const j = await r.json();
    setMerchants(j.merchants || []);
  }
  useEffect(() => { loadMerchants(); }, []);

  async function createMerchant(e) {
    e.preventDefault();
    setErr('');
    const r = await fetch(`${API}/merchants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_name: name, branding: { phone, upi, name } }),
    });
    const j = await r.json();
    if (!r.ok) { setErr(j.error || 'failed'); return; }
    setCreds(j.credentials);
    localStorage.setItem('sk_apikey_' + j.merchant.id, j.credentials.api_key);
    setName('');
    loadMerchants();
    setSelected(j.merchant);
    setApiKeyInput(j.credentials.api_key);
    loadAccounts(j.merchant.id, j.credentials.api_key);
  }

  function getApiKey(mid) {
    return apiKeyInput || localStorage.getItem('sk_apikey_' + mid) || '';
  }

  async function selectMerchant(m) {
    setSelected(m);
    const key = localStorage.getItem('sk_apikey_' + m.id) || '';
    setApiKeyInput(key);
    await loadAccounts(m.id, key);
  }

  async function loadAccounts(merchantId, key) {
    if (!key) { setAccounts([]); return; }
    const r = await fetch(`${API}/payments/accounts`, { headers: { 'X-API-Key': key } });
    const j = await r.json();
    setAccounts(j.accounts || []);
  }

  async function addAccount(e) {
    e.preventDefault();
    if (!selected) return;
    const key = getApiKey(selected.id);
    if (!key) { setErr('API key missing'); return; }
    const r = await fetch(`${API}/payments/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
      body: JSON.stringify({ vpa, account_name: acctName }),
    });
    const j = await r.json();
    if (!r.ok) { setErr(j.error || 'failed'); return; }
    setVpa(''); setAcctName('');
    loadAccounts(selected.id, key);
  }

  async function createPayment(e) {
    e.preventDefault();
    if (!selected) return;
    const key = getApiKey(selected.id);
    if (!key) { setErr('API key missing'); return; }
    const r = await fetch(`${API}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
      body: JSON.stringify({ order_id: orderId, amount: orderAmt, receiving_account_id: selectedVpa || undefined, customer: { name: 'Test', phone: '9999999999' } }),
    });
    const j = await r.json();
    if (!r.ok) { setErr(j.error || 'failed'); return; }
    window.open(j.checkoutUrl, '_blank');
  }

  const S = {
    app: { display: 'flex', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#f4f6f9' },
    sidebar: { width: 240, background: '#1e293b', color: '#fff', padding: '24px 0', flexShrink: 0 },
    logo: { fontSize: 20, fontWeight: 700, padding: '0 24px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 16 },
    navItem: (active) => ({ padding: '10px 24px', cursor: 'pointer', background: active ? 'rgba(82,143,240,0.15)' : 'transparent', borderLeft: active ? `3px solid ${ACCENT}` : '3px solid transparent', color: active ? '#fff' : '#94a3b8', fontSize: 14, fontWeight: active ? 600 : 400 }),
    main: { flex: 1, padding: 32, overflow: 'auto' },
    card: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 24, marginBottom: 20 },
    h1: { fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#111' },
    h2: { fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#111' },
    input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, width: '100%', outline: 'none' },
    btn: { background: ACCENT, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    btnSm: { background: ACCENT, color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
    label: { fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block', fontWeight: 500 },
    badge: (color) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: color + '20', color }),
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', textTransform: 'uppercase', letterSpacing: '0.05em' },
    td: { padding: '12px', fontSize: 14, borderBottom: '1px solid #f3f4f6' },
  };

  return (
    <div style={S.app}>
      <div style={S.sidebar}>
        <div style={S.logo}>⚡ SkarPay</div>
        <div style={S.navItem(tab === 'merchants')} onClick={() => setTab('merchants')}>Merchants</div>
        <div style={S.navItem(tab === 'payments')} onClick={() => setTab('payments')}>Payments</div>
        <div style={S.navItem(tab === 'cashier')} onClick={() => setTab('cashier')}>Cashier Dock</div>
        <div style={S.navItem(tab === 'settings')} onClick={() => setTab('settings')}>Settings</div>
      </div>

      <div style={S.main}>
        {tab === 'merchants' && (
          <>
            <h1 style={S.h1}>Merchants</h1>
            <p style={{ color: '#6b7280', margin: '0 0 24px', fontSize: 14 }}>Manage your merchant accounts and payment settings</p>

            <div style={S.card}>
              <h2 style={S.h2}>Create Merchant</h2>
              <form onSubmit={createMerchant} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={S.label}>Business Name</label>
                  <input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="Acme Store" />
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={S.label}>Phone (WhatsApp)</label>
                  <input style={S.input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" />
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={S.label}>UPI ID (VPA)</label>
                  <input style={S.input} value={upi} onChange={e => setUpi(e.target.value)} placeholder="merchant@okaxis" />
                </div>
                <button type="submit" style={S.btn}>Create Merchant</button>
              </form>
              {err && <div style={{ color: '#ef4444', marginTop: 12, fontSize: 13 }}>{err}</div>}
              {creds && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: 16, marginTop: 16 }}>
                  <div style={{ fontWeight: 600, color: '#065f46', marginBottom: 8 }}>⚠️ Save these credentials (shown once)</div>
                  <div style={{ fontSize: 13, marginBottom: 4 }}><strong>API Key:</strong> <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4 }}>{creds.api_key}</code></div>
                  <div style={{ fontSize: 13 }}><strong>Webhook Secret:</strong> <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4 }}>{creds.webhook_secret}</code></div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={S.card}>
                  <h2 style={S.h2}>All Merchants</h2>
                  <table style={S.table}>
                    <thead><tr><th style={S.th}>Business</th><th style={S.th}>ID</th><th style={S.th}>Status</th></tr></thead>
                    <tbody>
                      {merchants.map(m => (
                        <tr key={m.id} style={{ cursor: 'pointer', background: selected?.id === m.id ? '#eff6ff' : 'transparent' }} onClick={() => selectMerchant(m)}>
                          <td style={S.td}><strong>{m.business_name}</strong></td>
                          <td style={{ ...S.td, fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{m.id.slice(0, 8)}…</td>
                          <td style={S.td}><span style={S.badge(m.is_active ? '#10b981' : '#ef4444')}>{m.is_active ? 'Active' : 'Inactive'}</span></td>
                        </tr>
                      ))}
                      {merchants.length === 0 && <tr><td colSpan={3} style={{ ...S.td, textAlign: 'center', color: '#9ca3af' }}>No merchants yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              {selected && (
                <div style={{ flex: 1.5 }}>
                  <div style={S.card}>
                    <h2 style={S.h2}>{selected.business_name}</h2>
                    <div style={{ marginBottom: 16 }}>
                      <label style={S.label}>API Key (paste if not saved)</label>
                      <input style={S.input} value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} onBlur={() => loadAccounts(selected.id, apiKeyInput)} placeholder="mk_live_..." />
                    </div>

                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: '16px 0 8px' }}>Receiving Accounts (VPAs)</h3>
                    <form onSubmit={addAccount} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      <input style={{ ...S.input, flex: 1 }} value={vpa} onChange={e => setVpa(e.target.value)} placeholder="yourname@okaxis" />
                      <input style={{ ...S.input, flex: 1 }} value={acctName} onChange={e => setAcctName(e.target.value)} placeholder="Account name" />
                      <button type="submit" style={S.btnSm}>Add VPA</button>
                    </form>
                    <div style={{ marginBottom: 16 }}>
                      {accounts.length === 0 && <div style={{ fontSize: 13, color: '#9ca3af' }}>No accounts yet</div>}
                      {accounts.map(a => (
                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', borderRadius: 6, marginBottom: 4, fontSize: 13, opacity: a.is_active ? 1 : 0.5 }}>
                          <span><strong>{a.vpa}</strong> — {a.account_name}</span>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={S.badge(a.is_slot_busy ? '#f59e0b' : '#10b981')}>{a.is_slot_busy ? 'Busy' : 'Free'}</span>
                            <span style={S.badge(a.is_active ? '#10b981' : '#ef4444')}>{a.is_active ? 'Active' : 'Inactive'}</span>
                            <button onClick={async () => { const key = getApiKey(selected.id); await fetch(`/api/v1/payments/accounts/${a.id}/toggle`, { method: 'PUT', headers: { 'X-API-Key': key } }); loadAccounts(selected.id, key); }} style={{ ...S.btnSm, background: a.is_active ? '#ef4444' : '#10b981', fontSize: 10, padding: '3px 8px' }}>{a.is_active ? 'Deactivate' : 'Activate'}</button>
                            <button onClick={async () => { const key = getApiKey(selected.id); await fetch(`/api/v1/payments/accounts/${a.id}/default`, { method: 'PUT', headers: { 'X-API-Key': key } }); alert('Set as default VPA'); }} style={{ ...S.btnSm, background: '#6366f1', fontSize: 10, padding: '3px 8px' }}>Default</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: '16px 0 8px' }}>Branding (White-Label)</h3>
                    <BrandingEditor merchant={selected} apiKey={getApiKey(selected.id)} />

                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: '16px 0 8px' }}>Create Payment</h3>
                    <form onSubmit={createPayment} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 120 }}>
                        <label style={S.label}>Order ID</label>
                        <input style={S.input} value={orderId} onChange={e => setOrderId(e.target.value)} />
                      </div>
                      <div style={{ width: 100 }}>
                        <label style={S.label}>Amount (₹)</label>
                        <input style={S.input} value={orderAmt} onChange={e => setOrderAmt(e.target.value)} />
                      </div>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <label style={S.label}>VPA (receiving account)</label>
                        <select style={S.input} value={selectedVpa} onChange={e => setSelectedVpa(e.target.value)}>
                          <option value="">Auto (first available)</option>
                          {accounts.map(a => (
                            <option key={a.id} value={a.id}>{a.vpa} {a.is_slot_busy ? '(BUSY)' : ''}</option>
                          ))}
                        </select>
                      </div>
                      <button type="submit" style={S.btn}>Create & Checkout</button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'payments' && (
          <PaymentsView apiKey={apiKeyInput || (selected ? localStorage.getItem('sk_apikey_' + selected.id) : '')} />
        )}

        {tab === 'cashier' && (
          <CashierDock apiKey={apiKeyInput || (selected ? localStorage.getItem('sk_apikey_' + selected.id) : '')} />
        )}

        {tab === 'settings' && (
          <div style={S.card}>
            <h1 style={S.h1}>Settings</h1>
            <p style={{ color: '#6b7280', fontSize: 14 }}>Branding, webhook URLs, and more can be configured via the API (PUT /api/v1/merchants/:id).</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CashierDock({ apiKey }) {
  const [pending, setPending] = useState([]);
  useEffect(() => {
    if (!apiKey) return;
    const iv = setInterval(async () => {
      try {
        const r = await fetch('/api/v1/admin/counter-pending', { headers: { 'X-API-Key': apiKey } });
        const j = await r.json();
        setPending(j.sessions || []);
      } catch (e) {}
    }, 3000);
    return () => clearInterval(iv);
  }, [apiKey]);

  async function approve(id) {
    await fetch(`/api/v1/admin/counter-approve/${id}`, { method: 'POST', headers: { 'X-API-Key': apiKey } });
  }
  async function decline(id) {
    await fetch(`/api/v1/admin/counter-decline/${id}`, { method: 'POST', headers: { 'X-API-Key': apiKey } });
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Cashier Dock</h1>
      <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px' }}>Pending counter payments (cash/card)</p>
      {pending.length === 0 && <div style={{ color: '#9ca3af', padding: 40, textAlign: 'center', background: '#fff', borderRadius: 12 }}>No pending payments</div>}
      {pending.map(s => (
        <div key={s.id} style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>₹{(s.amount_paise / 100).toFixed(2)}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Order: {s.order_id} · {s.method}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => approve(s.id)} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Approve</button>
            <button onClick={() => decline(s.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Decline</button>
          </div>
        </div>
      ))}
    </div>
  );
}
