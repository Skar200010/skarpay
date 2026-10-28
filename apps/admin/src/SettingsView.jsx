import React, { useState, useEffect } from 'react';

const C = {
  surfaceLow: '#0b0f19',
  surfaceLowest: '#070a10',
  outline: '#4b5570',
  outlineVariant: '#263047',
  primary: '#c0c1ff',
  inversePrimary: '#494bd6',
  secondary: '#4cd7f6',
  tertiary: '#4edea3',
  error: '#ffb4ab',
  onSurface: '#e2e7f5',
  onSurfaceVariant: '#8e99b5',
};

export default function SettingsView({ selected, apiKey }) {
  const [webhookUrl, setWebhookUrl] = useState(selected?.webhook_url || '');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const mono = { fontFamily: 'JetBrains Mono, monospace' };

  useEffect(() => { setWebhookUrl(selected?.webhook_url || ''); }, [selected]);

  async function saveWebhook(e) {
    e.preventDefault();
    if (!selected) { setMsg('Select a merchant first'); return; }
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

  async function regenerateKey() {
    if (!selected) return;
    if (!confirm('Regenerate API key? Old key will stop working.')) return;
    try {
      const r = await fetch(`/api/v1/merchants/${selected.id}/regenerate-key`, { method: 'POST' });
      const j = await r.json();
      if (!r.ok) { setMsg(j.error || 'Failed'); return; }
      setMsg('New key: ' + j.api_key);
      localStorage.setItem('sk_apikey_' + selected.id, j.api_key);
    } catch (e) { setMsg('Error: ' + e.message); }
  }

  const inputStyle = { width: '100%', background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, borderRadius: 4, padding: '6px 10px', ...mono, fontSize: 11, color: C.onSurface, outline: 'none' };

  if (!selected) {
    return <div style={{ ...mono, fontSize: 11, color: C.onSurfaceVariant, padding: 20 }}>Select a merchant from the registry first.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Merchant Info */}
      <div>
        <div style={{ ...mono, fontSize: 10, color: C.onSurfaceVariant, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Merchant Info</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, borderRadius: 4, padding: 8 }}>
            <div style={{ ...mono, fontSize: 9, color: C.onSurfaceVariant }}>Business Name</div>
            <div style={{ ...mono, fontSize: 11, color: C.onSurface, fontWeight: 600 }}>{selected.business_name}</div>
          </div>
          <div style={{ background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, borderRadius: 4, padding: 8 }}>
            <div style={{ ...mono, fontSize: 9, color: C.onSurfaceVariant }}>Merchant ID</div>
            <div style={{ ...mono, fontSize: 9, color: C.onSurface, wordBreak: 'break-all' }}>{selected.id}</div>
          </div>
          <div style={{ background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, borderRadius: 4, padding: 8 }}>
            <div style={{ ...mono, fontSize: 9, color: C.onSurfaceVariant }}>Status</div>
            <div style={{ ...mono, fontSize: 11, color: selected.is_active ? C.tertiary : C.error }}>{selected.is_active ? '● ACTIVE' : '● INACTIVE'}</div>
          </div>
          <div style={{ background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, borderRadius: 4, padding: 8 }}>
            <div style={{ ...mono, fontSize: 9, color: C.onSurfaceVariant }}>API Key Status</div>
            <div style={{ ...mono, fontSize: 11, color: apiKey ? C.tertiary : C.error }}>{apiKey ? '● CONFIGURED' : '● MISSING'}</div>
          </div>
        </div>
      </div>

      {/* Webhook Config */}
      <div>
        <div style={{ ...mono, fontSize: 10, color: C.onSurfaceVariant, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Webhook Configuration</div>
        <form onSubmit={saveWebhook} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label style={{ ...mono, fontSize: 10, color: C.onSurfaceVariant, display: 'block', marginBottom: 4 }}>Webhook URL (payment events destination)</label>
            <input style={inputStyle} value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://yoursite.com/api/webhook" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="submit" style={{ padding: '6px 16px', borderRadius: 4, background: C.primary, color: C.surfaceLowest, ...mono, fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer' }} disabled={saving}>{saving ? 'Saving...' : 'Save Webhook URL'}</button>
            {msg && <span style={{ ...mono, fontSize: 10, color: msg.includes('saved') || msg.includes('Saved') ? C.tertiary : C.error }}>{msg}</span>}
          </div>
        </form>
        <div style={{ ...mono, fontSize: 9, color: C.onSurfaceVariant, background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, borderRadius: 4, padding: 10, marginTop: 8, lineHeight: 1.6 }}>
          <div><strong style={{ color: C.onSurface }}>Headers:</strong> X-Gateway-Event, X-Gateway-Signature (sha256=...), X-Gateway-Delivery-Id, X-Gateway-Timestamp</div>
          <div><strong style={{ color: C.onSurface }}>Events:</strong> SUCCESS (UPI, COD, CASH_COUNTER, CARD_COUNTER)</div>
          <div><strong style={{ color: C.onSurface }}>Verification:</strong> HMAC-SHA256 over raw request body (constant-time compare)</div>
        </div>
      </div>

      {/* API Key Management */}
      <div>
        <div style={{ ...mono, fontSize: 10, color: C.onSurfaceVariant, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>API Key Management</div>
        <div style={{ background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, borderRadius: 4, padding: 10 }}>
          <p style={{ ...mono, fontSize: 10, color: C.onSurfaceVariant, marginBottom: 8 }}>Lost your API key? Regenerate a new one. The old key will stop working immediately.</p>
          <button onClick={regenerateKey} style={{ padding: '6px 16px', borderRadius: 4, background: `${C.error}20`, border: `1px solid ${C.error}40`, color: C.error, ...mono, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>⚠ Regenerate API Key</button>
          {msg && msg.startsWith('New key') && (
            <div style={{ background: `${C.tertiary}10`, border: `1px solid ${C.tertiary}40`, borderRadius: 4, padding: 10, marginTop: 8 }}>
              <div style={{ ...mono, fontSize: 9, color: C.tertiary, marginBottom: 4 }}>⚠️ Save this key (shown once):</div>
              <code style={{ ...mono, fontSize: 10, color: C.onSurface, wordBreak: 'break-all' }}>{msg.replace('New key: ', '')}</code>
            </div>
          )}
        </div>
      </div>

      {/* API Integration */}
      <div>
        <div style={{ ...mono, fontSize: 10, color: C.onSurfaceVariant, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>API Integration</div>
        <div style={{ background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, borderRadius: 4, padding: 10, ...mono, fontSize: 10, color: C.onSurfaceVariant, lineHeight: 1.8 }}>
          <div><span style={{ color: C.onSurface }}>Base URL:</span> http://localhost:4100/api/v1</div>
          <div><span style={{ color: C.onSurface }}>Auth:</span> X-API-Key: mk_live_...</div>
          <div><span style={{ color: C.onSurface }}>Create Payment:</span> POST /payments</div>
          <div><span style={{ color: C.onSurface }}>Check Status:</span> GET /payments/:id</div>
          <div><span style={{ color: C.onSurface }}>Verify:</span> POST /payments/:id/verify</div>
          <div><span style={{ color: C.onSurface }}>Checkout:</span> GET /checkout/:id</div>
          <div><span style={{ color: C.onSurface }}>Webhook:</span> POST /api/webhook (merchant's endpoint)</div>
          <div><span style={{ color: C.onSurface }}>Observers:</span> POST /observers/sms, POST /observers/gmail</div>
        </div>
      </div>
    </div>
  );
}
