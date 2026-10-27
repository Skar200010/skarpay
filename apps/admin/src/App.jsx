import React, { useState, useEffect } from 'react';

const API = '/api/v1';

export default function App() {
  const [merchants, setMerchants] = useState([]);
  const [name, setName] = useState('');
  const [creds, setCreds] = useState(null);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [vpa, setVpa] = useState('');
  const [acctName, setAcctName] = useState('');
  const [sessions, setSessions] = useState([]);
  const [orderAmt, setOrderAmt] = useState('499');
  const [orderId, setOrderId] = useState('ORD-1');

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
      body: JSON.stringify({ business_name: name }),
    });
    const j = await r.json();
    if (!r.ok) { setErr(j.error || 'failed'); return; }
    setCreds(j.credentials);
    setName('');
    loadMerchants();
  }

  async function selectMerchant(m) {
    setSelected(m);
    // need api key - prompt user to paste? For admin we don't have it stored. Use service? 
    // For MVP admin, store api key in localStorage after creation.
    loadAccounts(m.id);
    loadSessions(m.id);
  }

  async function loadAccounts(merchantId) {
    // admin has no api key; use a stored key if available
    const key = localStorage.getItem('sk_apikey_' + merchantId);
    if (!key) { setAccounts([]); return; }
    const r = await fetch(`${API}/payments/accounts`, { headers: { 'X-API-Key': key } });
    const j = await r.json();
    setAccounts(j.accounts || []);
  }

  async function addAccount(e) {
    e.preventDefault();
    if (!selected) return;
    const key = localStorage.getItem('sk_apikey_' + selected.id);
    if (!key) { setErr('API key not found for this merchant. Paste it below.'); return; }
    const r = await fetch(`${API}/payments/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
      body: JSON.stringify({ vpa, account_name: acctName }),
    });
    const j = await r.json();
    if (!r.ok) { setErr(j.error || 'failed'); return; }
    setVpa(''); setAcctName('');
    loadAccounts(selected.id);
  }

  async function loadSessions(merchantId) {
    // no list endpoint yet; skip
    setSessions([]);
  }

  async function createPayment(e) {
    e.preventDefault();
    if (!selected) return;
    const key = localStorage.getItem('sk_apikey_' + selected.id);
    if (!key) { setErr('API key missing'); return; }
    const r = await fetch(`${API}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
      body: JSON.stringify({ order_id: orderId, amount: orderAmt, customer: { name: 'Test', phone: '9999999999' } }),
    });
    const j = await r.json();
    if (!r.ok) { setErr(j.error || 'failed'); return; }
    alert('Payment created: ' + j.paymentId + '\nCheckout: ' + j.checkoutUrl);
    window.open(j.checkoutUrl, '_blank');
  }

  // Save api key when creds shown
  useEffect(() => {
    if (creds && merchants.length) {
      const last = merchants[merchants.length - 1];
      if (last) localStorage.setItem('sk_apikey_' + last.id, creds.api_key);
    }
  }, [creds, merchants]);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1>SkarPay Admin</h1>

      <h2>Create Merchant</h2>
      <form onSubmit={createMerchant} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Business name" style={{ flex: 1, padding: 8 }} />
        <button type="submit">Create</button>
      </form>
      {err && <div style={{ color: 'red', marginBottom: 12 }}>{err}</div>}
      {creds && (
        <div style={{ background: '#f0fff0', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <strong>Save these credentials (shown once):</strong>
          <div>API Key: <code>{creds.api_key}</code></div>
          <div>Webhook Secret: <code>{creds.webhook_secret}</code></div>
        </div>
      )}

      <h2>Merchants</h2>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {merchants.map(m => (
              <li key={m.id} style={{ padding: 8, border: '1px solid #ddd', marginBottom: 4, borderRadius: 6, cursor: 'pointer', background: selected?.id === m.id ? '#eef' : '#fff' }}
                  onClick={() => selectMerchant(m)}>
                {m.business_name} <span style={{ fontSize: 11, color: '#888' }}>({m.id.slice(0, 8)})</span>
              </li>
            ))}
          </ul>
        </div>

        {selected && (
          <div style={{ flex: 2 }}>
            <h3>{selected.business_name} — Accounts (VPAs)</h3>
            <form onSubmit={addAccount} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input value={vpa} onChange={e => setVpa(e.target.value)} placeholder="VPA e.g. sohan@upi" style={{ flex: 1, padding: 8 }} />
              <input value={acctName} onChange={e => setAcctName(e.target.value)} placeholder="Account name" style={{ flex: 1, padding: 8 }} />
              <button type="submit">Add VPA</button>
            </form>
            <ul>
              {accounts.map(a => (
                <li key={a.id}>{a.vpa} — {a.account_name} {a.is_slot_busy ? '(BUSY)' : '(free)'}</li>
              ))}
            </ul>

            <h3>Create Payment</h3>
            <form onSubmit={createPayment} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input value={orderId} onChange={e => setOrderId(e.target.value)} placeholder="Order ID" style={{ flex: 1, padding: 8 }} />
              <input value={orderAmt} onChange={e => setOrderAmt(e.target.value)} placeholder="Amount (INR)" style={{ width: 120, padding: 8 }} />
              <button type="submit">Create & Open Checkout</button>
            </form>

            <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
              API key for this merchant (paste if missing):
              <input placeholder="mk_live_..." style={{ width: '100%', padding: 4, marginTop: 4 }}
                onBlur={e => { if (e.target.value) localStorage.setItem('sk_apikey_' + selected.id, e.target.value); loadAccounts(selected.id); }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
