import React, { useState } from 'react';

export default function BrandingEditor({ merchant, apiKey }) {
  const [accent, setAccent] = useState(merchant?.branding?.accentColor || '#528FF0');
  const [bName, setBName] = useState(merchant?.branding?.name || merchant?.business_name || '');
  const [logo, setLogo] = useState(merchant?.branding?.logoUrl || '');
  const [msg, setMsg] = useState('');

  async function save(e) {
    e.preventDefault();
    if (!apiKey) { setMsg('API key missing'); return; }
    const r = await fetch(`/api/v1/merchants/${merchant.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branding: { accentColor: accent, name: bName, logoUrl: logo } }),
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || 'failed'); return; }
    setMsg('Saved!');
  }

  return (
    <form onSubmit={save} style={{ background: '#f9fafb', borderRadius: 8, padding: 12, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input style={{ flex: 1, padding: 8, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} value={bName} onChange={e => setBName(e.target.value)} placeholder="Brand name" />
        <input style={{ width: 80, padding: 8, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} value={accent} onChange={e => setAccent(e.target.value)} placeholder="#color" />
      </div>
      <input style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, marginBottom: 8 }} value={logo} onChange={e => setLogo(e.target.value)} placeholder="Logo URL" />
      <button type="submit" style={{ background: '#528FF0', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Save Branding</button>
      {msg && <span style={{ marginLeft: 8, fontSize: 12, color: '#10b981' }}>{msg}</span>}
    </form>
  );
}
