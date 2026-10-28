import React, { useState, useEffect } from 'react';
import BrandingEditor from './BrandingEditor.jsx';
import PaymentsView from './PaymentsView.jsx';
import SettingsView from './SettingsView.jsx';

const API = '/api/v1';

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
  const [tab, setTab] = useState('credentials');
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [keyValid, setKeyValid] = useState(null);
  const [payments, setPayments] = useState([]);
  const [showProvision, setShowProvision] = useState(false);

  const C = {
    bg: '#080b12',
    surfaceLowest: '#070a10',
    surfaceLow: '#0b0f19',
    surface: '#111624',
    surfaceHigh: '#181f31',
    surfaceHighest: '#222a40',
    onSurface: '#e2e7f5',
    onSurfaceVariant: '#8e99b5',
    outline: '#4b5570',
    outlineVariant: '#263047',
    primary: '#c0c1ff',
    primaryContainer: '#8083ff',
    inversePrimary: '#494bd6',
    secondary: '#4cd7f6',
    secondaryContainer: '#03b5d3',
    tertiary: '#4edea3',
    error: '#ffb4ab',
    errorContainer: '#93000a',
  };

  async function loadMerchants() {
    try {
      const r = await fetch(`${API}/merchants`);
      const j = await r.json();
      setMerchants(j.merchants || []);
    } catch (e) { setErr('Failed to load merchants'); }
  }
  useEffect(() => { loadMerchants(); }, []);

  async function loadPayments(key) {
    if (!key) return;
    try {
      const r = await fetch(`${API}/payments?limit=20`, { headers: { 'X-API-Key': key } });
      const j = await r.json();
      setPayments(j.payments || []);
    } catch (e) {}
  }

  async function createMerchant(e) {
    e.preventDefault();
    setErr('');
    if (!name.trim()) { setErr('Business name required'); return; }
    try {
      const r = await fetch(`${API}/merchants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_name: name, branding: { phone, upi, name } }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || 'Failed'); return; }
      setCreds(j.credentials);
      localStorage.setItem('sk_apikey_' + j.merchant.id, j.credentials.api_key);
      setName(''); setPhone(''); setUpi('');
      await loadMerchants();
      selectMerchant(j.merchant);
    } catch (e) { setErr('Network error: ' + e.message); }
  }

  async function loadAccounts(merchantId, key) {
    if (!key) { setAccounts([]); setKeyValid(null); return; }
    try {
      const meRes = await fetch(`${API}/merchants/me`, { headers: { 'X-API-Key': key } });
      if (!meRes.ok) { setKeyValid(false); setErr('Invalid API key'); setAccounts([]); return; }
      const me = await meRes.json();
      if (me.merchant.id !== merchantId) {
        setKeyValid(false);
        setErr(`⚠️ API key belongs to "${me.merchant.business_name}", not selected merchant.`);
        setAccounts([]);
        return;
      }
      setKeyValid(true);
      const r = await fetch(`${API}/payments/accounts`, { headers: { 'X-API-Key': key } });
      const j = await r.json();
      setAccounts(j.accounts || []);
    } catch (e) { setErr('Network error: ' + e.message); setAccounts([]); }
  }

  async function selectMerchant(m) {
    setSelected(m);
    const key = localStorage.getItem('sk_apikey_' + m.id) || '';
    setApiKeyInput(key);
    setAccounts([]);
    setErr('');
    setKeyValid(null);
    setTab('credentials');
    if (key) { await loadAccounts(m.id, key); loadPayments(key); }
  }

  async function addAccount(e) {
    e.preventDefault();
    if (!selected || !apiKeyInput || !vpa.trim()) return;
    try {
      const r = await fetch(`${API}/payments/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKeyInput },
        body: JSON.stringify({ vpa: vpa.trim(), account_name: acctName.trim() || vpa.trim() }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || 'Failed'); return; }
      setVpa(''); setAcctName('');
      await loadAccounts(selected.id, apiKeyInput);
    } catch (e) { setErr('Network error'); }
  }

  async function toggleAccount(id) {
    if (!apiKeyInput) return;
    try {
      await fetch(`${API}/payments/accounts/${id}/toggle`, { method: 'PUT', headers: { 'X-API-Key': apiKeyInput } });
      await loadAccounts(selected.id, apiKeyInput);
    } catch (e) {}
  }

  async function setDefault(id) {
    if (!apiKeyInput) return;
    try {
      await fetch(`${API}/payments/accounts/${id}/default`, { method: 'PUT', headers: { 'X-API-Key': apiKeyInput } });
      setErr('✅ Default VPA set');
    } catch (e) {}
  }

  async function createPayment(e) {
    e.preventDefault();
    if (!selected || !apiKeyInput || !keyValid) return;
    try {
      const r = await fetch(`${API}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKeyInput },
        body: JSON.stringify({ order_id: orderId, amount: orderAmt, receiving_account_id: selectedVpa || undefined, customer: { name: 'Test', phone: '9999999999' } }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || 'Failed'); return; }
      window.open(j.checkoutUrl, '_blank');
      loadPayments(apiKeyInput);
    } catch (e) { setErr('Network error'); }
  }

  const mono = { fontFamily: 'JetBrains Mono, monospace' };
  const sans = { fontFamily: 'Inter, sans-serif' };

  return (
    <div style={{ background: C.bg, color: C.onSurface, minHeight: '100vh', ...sans, fontSize: 12 }}>
      {/* Top Bar */}
      <header style={{ height: 48, background: C.surfaceLowest, borderBottom: `1px solid ${C.outlineVariant}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #494bd6, #8083ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(73,75,214,0.4)' }}>
            <span style={{ color: '#fff', fontSize: 14 }}>⚡</span>
          </div>
          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 14, color: '#fff', letterSpacing: '-0.02em' }}>SkarPay</span>
          <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: C.primary, fontWeight: 600, background: `${C.primary}15`, padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.primary}30` }}>OPS:CONSOLE</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6, background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, cursor: 'pointer' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.tertiary, boxShadow: `0 0 8px ${C.tertiary}80` }}></span>
            <span style={{ ...mono, fontSize: 11, color: C.onSurface, fontWeight: 500 }}>env:production</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={{ height: 28, padding: '0 10px', borderRadius: 6, background: C.surface, border: `1px solid ${C.outlineVariant}`, color: C.onSurface, ...mono, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <span style={{ color: C.tertiary }}>⟳</span> Resync
          </button>
          <button style={{ height: 28, padding: '0 12px', borderRadius: 6, background: `linear-gradient(90deg, ${C.inversePrimary}, ${C.primaryContainer})`, color: '#fff', ...mono, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', border: 'none' }}>
            ▶ Run Test
          </button>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: C.primaryContainer, color: '#fff', ...mono, fontWeight: 700, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>SA</div>
        </div>
      </header>

      {/* 3-column layout */}
      <div style={{ display: 'flex', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
        {/* Column 1: Merchant List */}
        <aside style={{ width: 320, flexShrink: 0, background: C.surfaceLowest, borderRight: `1px solid ${C.outlineVariant}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: `1px solid ${C.outlineVariant}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `${C.surfaceLow}60` }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 12, color: '#fff', margin: 0 }}>Merchants Registry</h2>
                <span style={{ ...mono, fontSize: 10, color: C.primary, background: `${C.primary}15`, padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.primary}30` }}>{merchants.length} nodes</span>
              </div>
              <p style={{ ...mono, fontSize: 10, color: C.onSurfaceVariant, margin: '2px 0 0' }}>Dual-redundant UPI routing</p>
            </div>
            <button onClick={() => setShowProvision(!showProvision)} style={{ height: 24, padding: '0 8px', borderRadius: 4, background: C.surfaceHigh, border: `1px solid ${C.primary}50`, color: C.primary, ...mono, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              + Register
            </button>
          </div>

          {/* Quick provision drawer */}
          {showProvision && (
            <div style={{ padding: 12, background: C.surfaceLow, borderBottom: `1px solid ${C.outlineVariant}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, borderBottom: `1px solid ${C.outlineVariant}` }}>
                <span style={{ ...mono, fontSize: 11, color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: C.primary }}>⊕</span> POST /v2/merchants
                </span>
                <button onClick={() => setShowProvision(false)} style={{ background: 'none', border: 'none', color: C.outline, cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
              <div>
                <label style={{ ...mono, fontSize: 10, color: C.onSurfaceVariant, display: 'block', marginBottom: 2 }}>Business Name *</label>
                <input style={{ width: '100%', background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: 4, padding: '4px 8px', ...mono, fontSize: 11, color: '#fff', outline: 'none' }} placeholder="Acme Store" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ ...mono, fontSize: 10, color: C.onSurfaceVariant, display: 'block', marginBottom: 2 }}>WhatsApp / Mobile</label>
                  <input style={{ width: '100%', background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: 4, padding: '4px 8px', ...mono, fontSize: 10, color: '#fff', outline: 'none' }} placeholder="+91 9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div>
                  <label style={{ ...mono, fontSize: 10, color: C.onSurfaceVariant, display: 'block', marginBottom: 2 }}>Primary VPA</label>
                  <input style={{ width: '100%', background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: 4, padding: '4px 8px', ...mono, fontSize: 10, color: '#fff', outline: 'none' }} placeholder="merchant@okaxis" value={upi} onChange={e => setUpi(e.target.value)} />
                </div>
              </div>
              <button onClick={createMerchant} style={{ width: '100%', height: 24, borderRadius: 4, background: C.primary, color: C.surfaceLowest, ...mono, fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                ⊕ Provision Node
              </button>
              {err && <div style={{ ...mono, fontSize: 10, color: C.error, padding: 4 }}>{err}</div>}
              {creds && (
                <div style={{ background: `${C.tertiary}15`, border: `1px solid ${C.tertiary}40`, borderRadius: 4, padding: 8, ...mono, fontSize: 10 }}>
                  <div style={{ color: C.tertiary, fontWeight: 600, marginBottom: 4 }}>⚠️ Save credentials (shown once)</div>
                  <div style={{ color: C.onSurface, wordBreak: 'break-all' }}>API: {creds.api_key}</div>
                  <div style={{ color: C.onSurface, wordBreak: 'break-all' }}>Secret: {creds.webhook_secret}</div>
                </div>
              )}
            </div>
          )}

          {/* Merchant list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {merchants.map(m => (
              <div key={m.id} onClick={() => selectMerchant(m)} style={{ padding: 10, borderBottom: `1px solid ${C.outlineVariant}30`, cursor: 'pointer', background: selected?.id === m.id ? `${C.surfaceHigh}b0` : 'transparent', borderLeft: selected?.id === m.id ? `2px solid ${C.primary}` : '2px solid transparent', transition: 'background 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 4, background: `${C.primary}20`, border: `1px solid ${C.primary}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontWeight: 700, fontSize: 10, color: C.primary, flexShrink: 0 }}>
                      {m.business_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: 11, color: '#fff', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.business_name}</span>
                      <span style={{ ...mono, fontSize: 9, color: C.onSurfaceVariant }}>id: {m.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                    <span style={{ ...mono, fontSize: 9, color: C.tertiary, background: `${C.tertiary}15`, padding: '1px 6px', borderRadius: 8, border: `1px solid ${C.tertiary}30` }}>ACTIVE</span>
                  </div>
                </div>
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.outlineVariant}20`, display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 9, color: C.onSurfaceVariant }}>
                  <span>{accounts.length || 0} VPAs</span>
                  <span style={{ color: C.tertiary }}>₹0 settled</span>
                </div>
              </div>
            ))}
            {merchants.length === 0 && <div style={{ padding: 20, textAlign: 'center', ...mono, fontSize: 11, color: C.onSurfaceVariant }}>No merchants yet</div>}
          </div>

          <div style={{ padding: 8, borderTop: `1px solid ${C.outlineVariant}`, display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 9, color: C.onSurfaceVariant }}>
            <span>Showing {merchants.length} merchants</span>
          </div>
        </aside>

        {/* Column 2: Merchant Detail */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0a0d15', overflowY: 'auto', minWidth: 0 }}>
          {selected ? (
            <>
              {/* Merchant header */}
              <div style={{ padding: 16, borderBottom: `1px solid ${C.outlineVariant}`, background: `${C.surfaceLowest}cc`, position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(8px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 6, background: C.surfaceHigh, border: `1px solid ${C.primary}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary, ...mono, fontWeight: 700, fontSize: 12 }}>
                      {selected.business_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h1 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 16, color: '#fff', margin: 0 }}>{selected.business_name}</h1>
                        <span style={{ ...mono, fontSize: 9, color: C.tertiary, background: `${C.tertiary}15`, padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.tertiary}30` }}>ONLINE</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...mono, fontSize: 10, color: C.onSurfaceVariant, marginTop: 2 }}>
                        <span>UUID: <span style={{ color: '#fff' }}>{selected.id}</span></span>
                        <span style={{ color: C.outline }}>|</span>
                        <span>Tier: <span style={{ color: C.primary }}>Standard</span></span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ height: 28, padding: '0 10px', borderRadius: 4, background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, color: C.onSurface, ...mono, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>Sync</button>
                    <button style={{ height: 28, padding: '0 10px', borderRadius: 4, background: `${C.errorContainer}30`, border: `1px solid ${C.error}40`, color: C.error, ...mono, fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>Deactivate</button>
                  </div>
                </div>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginTop: 12, borderBottom: `1px solid ${C.outlineVariant}`, paddingBottom: 0 }}>
                  {[
                    { id: 'credentials', label: 'Credentials & VPAs', icon: '🔑' },
                    { id: 'branding', label: 'Branding', icon: '🎨' },
                    { id: 'payments', label: 'Payments', icon: '💳' },
                    { id: 'settings', label: 'Settings', icon: '⚙️' },
                  ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '6px 12px', ...mono, fontSize: 10, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? C.primary : C.onSurfaceVariant, background: 'transparent', border: 'none', borderBottom: tab === t.id ? `2px solid ${C.primary}` : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {err && <div style={{ ...mono, fontSize: 11, color: C.error, background: `${C.errorContainer}20`, border: `1px solid ${C.error}40`, borderRadius: 4, padding: 8 }}>{err}</div>}

                {tab === 'credentials' && (
                  <>
                    {/* API Key Vault */}
                    <div style={{ background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: `1px solid ${C.outlineVariant}`, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: C.primary, fontSize: 16 }}>🔒</span>
                          <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Merchant Secret & API Key Vault</h3>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono, fontSize: 9 }}>
                          <span style={{ color: C.tertiary, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.tertiary }}></span> Verified
                          </span>
                        </div>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ ...mono, fontSize: 10, color: C.onSurfaceVariant, display: 'block', marginBottom: 4 }}>Active API Secret Key</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input style={{ flex: 1, background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, borderRadius: 4, padding: '6px 10px', ...mono, fontSize: 11, color: C.onSurface, outline: 'none' }} type={keyValid ? 'text' : 'password'} value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} onBlur={() => loadAccounts(selected.id, apiKeyInput)} placeholder="mk_live_..." />
                          <button onClick={() => { if (apiKeyInput) navigator.clipboard.writeText(apiKeyInput); }} style={{ padding: '6px 10px', borderRadius: 4, background: C.surfaceHigh, border: `1px solid ${C.outlineVariant}`, color: C.onSurface, ...mono, fontSize: 10, cursor: 'pointer' }}>Copy</button>
                        </div>
                        <div style={{ ...mono, fontSize: 9, color: C.outline, marginTop: 4 }}>Press Tab after pasting to verify signature</div>
                        {keyValid === true && <div style={{ ...mono, fontSize: 10, color: C.tertiary, marginTop: 4 }}>✅ Key verified — accounts loaded</div>}
                        {keyValid === false && <div style={{ ...mono, fontSize: 10, color: C.error, marginTop: 4 }}>❌ Key mismatch or invalid</div>}
                      </div>
                      <div style={{ background: `${C.surfaceLow}90`, border: `1px solid ${C.outlineVariant}`, borderRadius: 4, padding: 8, ...mono, fontSize: 10 }}>
                        <div style={{ color: C.outline, marginBottom: 4 }}>BASH / RUNTIME PROXY INVOCATION</div>
                        <code style={{ color: C.tertiary, display: 'block', overflowX: 'auto', whiteSpace: 'pre', fontSize: 9 }}>{'curl -X POST http://localhost:4100/api/v1/payments \\\n  -H "X-API-Key: {key}" \\\n  -d \'{"order_id": "ORD-1", "amount": "499"}\''}</code>
                      </div>
                    </div>

                    {/* VPAs */}
                    <div style={{ background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: `1px solid ${C.outlineVariant}`, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: C.secondary, fontSize: 16 }}>🏦</span>
                          <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Receiving Accounts (VPAs)</h3>
                        </div>
                        <span style={{ ...mono, fontSize: 9, color: C.tertiary, background: `${C.tertiary}15`, padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.tertiary}30` }}>{accounts.filter(a => a.is_active).length} ACTIVE</span>
                      </div>

                      {/* Add VPA */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 6, marginBottom: 10 }}>
                        <input style={{ background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, borderRadius: 4, padding: '6px 8px', ...mono, fontSize: 11, color: '#fff', outline: 'none' }} placeholder="vpa@bankhandle" value={vpa} onChange={e => setVpa(e.target.value)} />
                        <input style={{ background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, borderRadius: 4, padding: '6px 8px', fontSize: 11, color: '#fff', outline: 'none' }} placeholder="Account name" value={acctName} onChange={e => setAcctName(e.target.value)} />
                        <button onClick={addAccount} style={{ padding: '6px 12px', borderRadius: 4, background: C.secondary, color: C.surfaceLowest, ...mono, fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer' }}>+ Attach</button>
                      </div>

                      {/* VPA List */}
                      {loadingAccounts ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {[1, 2].map(i => <div key={i} style={{ height: 40, background: C.surfaceLow, borderRadius: 4, animation: 'pulse 1.5s infinite' }} />)}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {accounts.map(a => (
                            <div key={a.id} style={{ background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, borderRadius: 6, padding: 10, opacity: a.is_active ? 1 : 0.4, borderLeft: `3px solid ${a.is_active ? C.tertiary : C.error}` }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                  <div style={{ width: 28, height: 28, borderRadius: 4, background: `${C.secondary}15`, border: `1px solid ${C.secondary}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontWeight: 700, fontSize: 9, color: C.secondary, flexShrink: 0 }}>
                                    {a.vpa.split('@')[1]?.slice(0, 4).toUpperCase() || 'VPA'}
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <span style={{ ...mono, fontSize: 11, color: '#fff', fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.vpa}</span>
                                    <span style={{ ...mono, fontSize: 9, color: C.onSurfaceVariant }}>{a.account_name} • {a.id.slice(0, 8)}</span>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                                  <span style={{ ...mono, fontSize: 9, color: a.is_slot_busy ? '#f59e0b' : C.tertiary, background: a.is_slot_busy ? 'rgba(245,158,11,0.1)' : `${C.tertiary}10`, padding: '1px 6px', borderRadius: 3, border: `1px solid ${a.is_slot_busy ? 'rgba(245,158,11,0.3)' : C.tertiary + '30'}` }}>
                                    {a.is_slot_busy ? 'BUSY' : 'FREE'}
                                  </span>
                                  <button onClick={() => toggleAccount(a.id)} style={{ ...mono, fontSize: 9, padding: '2px 6px', borderRadius: 3, border: `1px solid ${a.is_active ? C.error + '40' : C.tertiary + '40'}`, background: a.is_active ? `${C.error}10` : `${C.tertiary}10`, color: a.is_active ? C.error : C.tertiary, cursor: 'pointer' }}>
                                    {a.is_active ? 'Deactivate' : 'Activate'}
                                  </button>
                                  <button onClick={() => setDefault(a.id)} style={{ ...mono, fontSize: 9, padding: '2px 6px', borderRadius: 3, border: `1px solid ${C.primary}40`, background: `${C.primary}10`, color: C.primary, cursor: 'pointer' }}>Default</button>
                                </div>
                              </div>
                            </div>
                          ))}
                          {accounts.length === 0 && !loadingAccounts && <div style={{ ...mono, fontSize: 11, color: C.onSurfaceVariant, textAlign: 'center', padding: 16 }}>No accounts yet. Paste API key and add VPA above.</div>}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {tab === 'branding' && (
                  <div style={{ background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: 8, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 8, borderBottom: `1px solid ${C.outlineVariant}`, marginBottom: 10 }}>
                      <span style={{ color: C.primary, fontSize: 16 }}>🎨</span>
                      <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Checkout Branding Configuration</h3>
                    </div>
                    <BrandingEditor merchant={selected} apiKey={apiKeyInput} />
                  </div>
                )}

                {tab === 'payments' && (
                  <div style={{ background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: 8, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 8, borderBottom: `1px solid ${C.outlineVariant}`, marginBottom: 10 }}>
                      <span style={{ color: C.secondary, fontSize: 16 }}>💳</span>
                      <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Payment Stream</h3>
                    </div>
                    <PaymentsView apiKey={apiKeyInput} />
                  </div>
                )}

                {tab === 'settings' && (
                  <div style={{ background: C.surfaceLowest, border: `1px solid ${C.outlineVariant}`, borderRadius: 8, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 8, borderBottom: `1px solid ${C.outlineVariant}`, marginBottom: 10 }}>
                      <span style={{ color: C.primary, fontSize: 16 }}>⚙️</span>
                      <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 11, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Merchant Settings</h3>
                    </div>
                    <SettingsView selected={selected} apiKey={apiKeyInput} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 48, opacity: 0.3 }}>🏪</span>
              <span style={{ ...mono, fontSize: 12, color: C.onSurfaceVariant }}>Select a merchant from the registry</span>
            </div>
          )}
        </main>

        {/* Column 3: Live Stream & Terminal */}
        <aside style={{ width: 320, flexShrink: 0, background: C.surfaceLowest, borderLeft: `1px solid ${C.outlineVariant}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: `1px solid ${C.outlineVariant}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `${C.surfaceLow}60` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.tertiary, boxShadow: `0 0 8px ${C.tertiary}` }}></span>
              <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 12, color: '#fff', margin: 0 }}>Live Settlement Wire</h2>
            </div>
            <span style={{ ...mono, fontSize: 9, color: C.tertiary, background: `${C.tertiary}15`, padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.tertiary}30` }}>SSE CONNECTED</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ ...mono, fontSize: 9, color: C.outline, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>EVENT STREAM</span>
              <span>LAST 10s</span>
            </div>
            {payments.slice(0, 8).map((p, i) => (
              <div key={p.id} style={{ background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, borderRadius: 6, padding: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: 10 }}>
                  <span style={{ color: p.status === 'SUCCESS' ? C.tertiary : p.status === 'FAILED' ? C.error : '#f59e0b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                    {p.status === 'SUCCESS' ? '✓' : p.status === 'FAILED' ? '✕' : '⏳'} ₹{(p.amount_paise / 100).toFixed(2)}
                  </span>
                  <span style={{ color: C.outline }}>{new Date(p.created_at).toLocaleTimeString()}</span>
                </div>
                <div style={{ ...mono, fontSize: 9, color: C.onSurface, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.order_id} • {selected?.business_name}</div>
                <div style={{ ...mono, fontSize: 8, color: C.onSurfaceVariant, display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                  <span>{p.method}</span>
                  <span style={{ color: p.utr ? C.tertiary : C.outline }}>{p.utr || 'PENDING'}</span>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <div style={{ ...mono, fontSize: 10, color: C.onSurfaceVariant, textAlign: 'center', padding: 20 }}>No payments yet. Create one to see live stream.</div>
            )}
          </div>

          {/* Terminal */}
          <div style={{ borderTop: `1px solid ${C.outlineVariant}`, background: C.surfaceLowest, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...mono, fontSize: 9, color: C.onSurfaceVariant }}>
              <span style={{ color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: C.primary }}>⌘</span> OPS DISPATCH
              </span>
              <span style={{ color: C.outline }}>v2.4 CLI</span>
            </div>
            <div style={{ background: C.surfaceLow, border: `1px solid ${C.outlineVariant}`, borderRadius: 4, padding: 8, ...mono, fontSize: 9 }}>
              <div style={{ color: C.outline, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ color: C.tertiary }}>$</span> skarpay vpa --ping-all --mesh
              </div>
              <div style={{ color: C.tertiary, fontSize: 8, marginTop: 2 }}>✔ {accounts.filter(a => a.is_active).length}/{accounts.length} VPAs active</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, ...mono, fontSize: 9 }}>
              <button onClick={() => { if (apiKeyInput) navigator.clipboard.writeText(apiKeyInput); }} style={{ height: 22, borderRadius: 4, background: C.surfaceHigh, border: `1px solid ${C.outlineVariant}`, color: C.onSurface, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer' }}>
                <span style={{ color: C.secondary }}>↗</span> Copy Key
              </button>
              <button onClick={() => loadPayments(apiKeyInput)} style={{ height: 22, borderRadius: 4, background: C.surfaceHigh, border: `1px solid ${C.outlineVariant}`, color: C.onSurface, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, cursor: 'pointer' }}>
                <span style={{ color: C.tertiary }}>⟳</span> Refresh
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}