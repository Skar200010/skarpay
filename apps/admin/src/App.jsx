import React, { useState, useEffect } from 'react';

const API = '/api/v1';

export default function App() {
  const [merchants, setMerchants] = useState([]);
  const [name, setName] = useState('');
  const [creds, setCreds] = useState(null);
  const [err, setErr] = useState('');

  async function load() {
    const r = await fetch(`${API}/merchants`);
    const j = await r.json();
    setMerchants(j.merchants || []);
  }
  useEffect(() => { load(); }, []);

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
    load();
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1>SkarPay Admin</h1>
      <h2>Create Merchant</h2>
      <form onSubmit={createMerchant} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Business name" style={{ flex: 1, padding: 8 }} />
        <button type="submit">Create</button>
      </form>
      {err && <div style={{ color: 'red' }}>{err}</div>}
      {creds && (
        <div style={{ background: '#f0fff0', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <strong>Save these credentials (shown once):</strong>
          <div>API Key: <code>{creds.api_key}</code></div>
          <div>Webhook Secret: <code>{creds.webhook_secret}</code></div>
        </div>
      )}
      <h2>Merchants</h2>
      <ul>
        {merchants.map(m => (
          <li key={m.id}>{m.business_name} — <code>{m.id}</code></li>
        ))}
      </ul>
    </div>
  );
}
