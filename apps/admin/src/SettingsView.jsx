import React, { useState, useEffect } from 'react';

export default function SettingsView({ selected, apiKey }) {
  const [webhookUrl, setWebhookUrl] = useState(selected?.webhook_url || '');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setWebhookUrl(selected?.webhook_url || '');
  }, [selected]);

  async function saveWebhook(e) {
    e.preventDefault();
    if (!selected || !apiKey) { setMsg('Select a merchant and paste API key first'); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/v1/merchants/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhook_url: webhookUrl }),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(j.error || 'Failed'); return; }
      setMsg('Webhook URL saved!');
    } catch (e) { setMsg('Error: ' + e.message); }
    setSaving(false);
  }

  const S = {
    card: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 24, marginBottom: 20 },
    h1: { fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#111' },
    h2: { fontSize: 18, fontWeight: 600, margin: '0 0 16px', color: '#111' },
    label: { fontSize: 12, color: '#6b7280', marginBottom: 4, display: 'block', fontWeight: 500 },
    input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, width: '100%', outline: 'none' },
    btn: { background: '#528FF0', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  };

  if (!selected) {
    return (
      <div style={S.card}>
        <h1 style={S.h1}>Settings</h1>
        <p style={{ color: '#6b7280', fontSize: 14 }}>Select a merchant from the Merchants tab first.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={S.card}>
        <h1 style={S.h1}>Settings</h1>
        <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px' }}>Configure {selected.business_name}</p>

        <h2 style={S.h2}>Merchant Info</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div><label style={S.label}>Business Name</label><div style={{ fontSize: 14, fontWeight: 600 }}>{selected.business_name}</div></div>
          <div><label style={S.label}>Merchant ID</label><div style={{ fontSize: 12, fontFamily: 'monospace', color: '#6b7280' }}>{selected.id}</div></div>
          <div><label style={S.label}>Status</label><div style={{ fontSize: 14 }}>{selected.is_active ? '✅ Active' : '❌ Inactive'}</div></div>
        </div>

        <h2 style={S.h2}>Webhook Configuration</h2>
        <form onSubmit={saveWebhook} style={{ marginBottom: 16 }}>
          <label style={S.label}>Webhook URL (where payment events are sent)</label>
          <input style={S.input} value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://yoursite.com/api/webhook" />
          <div style={{ marginTop: 12 }}>
            <button type="submit" style={S.btn} disabled={saving}>{saving ? 'Saving...' : 'Save Webhook URL'}</button>
            {msg && <span style={{ marginLeft: 12, fontSize: 13, color: msg.includes('saved') || msg.includes('Saved') ? '#10b981' : '#ef4444' }}>{msg}</span>}
          </div>
        </form>
        <div style={{ fontSize: 12, color: '#9ca3af', background: '#f9fafb', borderRadius: 6, padding: 12 }}>
          <strong>Webhook Secret:</strong> (shown when merchant was created — used to verify HMAC signatures)<br />
          <strong>Headers sent:</strong> X-Gateway-Event, X-Gateway-Signature (sha256=...), X-Gateway-Delivery-Id, X-Gateway-Timestamp<br />
          <strong>Events:</strong> SUCCESS (UPI, COD, CASH_COUNTER, CARD_COUNTER)
        </div>
      </div>

      <div style={S.card}>
        <h2 style={S.h2}>API Key Management</h2>
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>Lost your API key? Regenerate a new one. The old key will stop working.</p>
          <button style={{ ...S.btn, background: '#ef4444' }} onClick={async () => {
            if (!selected) return;
            if (!confirm('Regenerate API key? Old key will stop working.')) return;
            const r = await fetch(`/api/v1/merchants/${selected.id}/regenerate-key`, { method: 'POST' });
            const j = await r.json();
            if (!r.ok) { setMsg(j.error || 'Failed'); return; }
            setMsg('New API Key: ' + j.api_key);
            localStorage.setItem('sk_apikey_' + selected.id, j.api_key);
            setApiKeyInput?.(j.api_key);
          }}>Regenerate API Key</button>
          {msg && msg.startsWith('New API Key') && (
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: 12, marginTop: 12, fontSize: 13 }}>
              <strong>⚠️ Save this key (shown once):</strong><br />
              <code style={{ wordBreak: 'break-all' }}>{msg.replace('New API Key: ', '')}</code>
            </div>
          )}
        </div>

        <h2 style={S.h2}>API Integration</h2>
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.8 }}>
          <div><strong>API Base URL:</strong> <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>http://localhost:4100/api/v1</code></div>
          <div><strong>Auth:</strong> <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>X-API-Key: mk_live_...</code></div>
          <div><strong>Create Payment:</strong> POST /payments</div>
          <div><strong>Check Status:</strong> GET /payments/:id</div>
          <div><strong>Verify:</strong> POST /payments/:id/verify</div>
          <div><strong>Checkout:</strong> GET /checkout/:id</div>
          <div><strong>Webhook:</strong> POST /api/webhook (merchant's endpoint)</div>
        </div>
      </div>
    </div>
  );
}
