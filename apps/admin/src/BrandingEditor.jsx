import React, { useState } from 'react';

const C = {
  surfaceLow: '#0b0f19',
  surfaceLowest: '#070a10',
  outline: '#4b5570',
  outlineVariant: '#263047',
  primary: '#c0c1ff',
  inversePrimary: '#494bd6',
  primaryContainer: '#8083ff',
  secondary: '#4cd7f6',
  tertiary: '#4edea3',
  onSurface: '#e2e7f5',
  onSurfaceVariant: '#8e99b5',
  error: '#ffb4ab',
};

export default function BrandingEditor({ merchant, apiKey }) {
  const [accent, setAccent] = useState(merchant?.branding?.accentColor || '#528FF0');
  const [bName, setBName] = useState(merchant?.branding?.name || merchant?.business_name || '');
  const [logo, setLogo] = useState(merchant?.branding?.logoUrl || '');
  const [msg, setMsg] = useState('');

  const mono = { fontFamily: 'JetBrains Mono, monospace' };

  async function save(e) {
    e.preventDefault();
    if (!apiKey) { setMsg('API key missing'); return; }
    try {
      const r = await fetch(`/api/v1/merchants/${merchant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branding: { accentColor: accent, name: bName, logoUrl: logo } }),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(j.error || 'failed'); return; }
      setMsg('Saved!');
    } catch (e) { setMsg('Error: ' + e.message); }
  }

  const inputStyle = { width: '100%', background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, borderRadius: 4, padding: '6px 10px', ...mono, fontSize: 11, color: C.onSurface, outline: 'none' };

  return (
    <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ ...mono, fontSize: 10, color: C.onSurfaceVariant, display: 'block', marginBottom: 4 }}>Brand Name</label>
          <input style={inputStyle} value={bName} onChange={e => setBName(e.target.value)} placeholder="Merchant display name" />
        </div>
        <div>
          <label style={{ ...mono, fontSize: 10, color: C.onSurfaceVariant, display: 'block', marginBottom: 4 }}>Accent Color</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: 4, border: `1px solid ${C.outline}`, background: accent, flexShrink: 0 }}></div>
            <input style={inputStyle} value={accent} onChange={e => setAccent(e.target.value)} placeholder="#528FF0" />
          </div>
        </div>
      </div>
      <div>
        <label style={{ ...mono, fontSize: 10, color: C.onSurfaceVariant, display: 'block', marginBottom: 4 }}>Logo URL (CDN)</label>
        <input style={inputStyle} value={logo} onChange={e => setLogo(e.target.value)} placeholder="https://cdn.merchant.com/logo.png" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="submit" style={{ padding: '6px 16px', borderRadius: 4, background: C.primary, color: C.surfaceLowest, ...mono, fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer' }}>Save Branding</button>
        {msg && <span style={{ ...mono, fontSize: 10, color: msg === 'Saved!' ? C.tertiary : C.error }}>{msg}</span>}
      </div>
      <div style={{ ...mono, fontSize: 9, color: C.onSurfaceVariant, marginTop: 4 }}>
        Preview: Checkout page will use accent color <span style={{ color: accent, fontWeight: 600 }}>{accent}</span> and brand name "{bName || merchant?.business_name}"
      </div>
    </form>
  );
}
