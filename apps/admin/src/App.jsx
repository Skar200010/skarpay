import React, { useState, useEffect } from 'react';
import BrandingEditor from './BrandingEditor.jsx';
import PaymentsView from './PaymentsView.jsx';
import SettingsView from './SettingsView.jsx';
import PairingQR from './PairingQR.jsx';
import WhatsAppConnect from './WhatsAppConnect.jsx';

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
  const [checkoutUrl, setCheckoutUrl] = useState(null);

  async function loadMerchants() {
    try {
      const adminKey = localStorage.getItem('sk_admin_key') || 'sk_test_admin_123456789';
      const r = await fetch(`${API}/merchants`, { headers: { 'x-admin-key': adminKey } });
      const j = await r.json();
      setMerchants(j.merchants || []);
    } catch (e) { setErr('Failed to load merchants'); }
  }
  useEffect(() => { loadMerchants(); }, []);

  async function approveMerchant(id) {
    try {
      const adminKey = localStorage.getItem('sk_admin_key') || 'sk_test_admin_123456789';
      const r = await fetch(`${API}/merchants/${id}/approve`, { method: 'POST', headers: { 'x-admin-key': adminKey } });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || 'Failed to approve'); return; }
      setErr('✅ Merchant approved successfully');
      await loadMerchants();
    } catch (e) { setErr('Network error'); }
  }

  async function rejectMerchant(id) {
    if (!confirm('Reject this merchant? They will not be able to login.')) return;
    try {
      const adminKey = localStorage.getItem('sk_admin_key') || 'sk_test_admin_123456789';
      const r = await fetch(`${API}/merchants/${id}/reject`, { method: 'POST', headers: { 'x-admin-key': adminKey } });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || 'Failed to reject'); return; }
      setErr('❌ Merchant rejected');
      await loadMerchants();
    } catch (e) { setErr('Network error'); }
  }

  useEffect(() => {
    function handler(e) {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'skarpay:success' || e.data.type === 'skarpay:failed') {
        if (apiKeyInput) loadPayments(apiKeyInput);
        // close modal after a short delay
        setTimeout(() => setCheckoutUrl(null), 1200);
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [apiKeyInput]);

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
    setLoadingAccounts(true);
    setErr('');
    try {
      const meRes = await fetch(`${API}/merchants/me`, { headers: { 'X-API-Key': key } });
      if (!meRes.ok) { setKeyValid(false); setErr('Invalid API key'); setAccounts([]); setLoadingAccounts(false); return; }
      const me = await meRes.json();
      if (me.merchant.id !== merchantId) {
        setKeyValid(false);
        setErr(`⚠️ API key belongs to "${me.merchant.business_name}", not selected merchant.`);
        setAccounts([]);
        setLoadingAccounts(false);
        return;
      }
      setKeyValid(true);
      const r = await fetch(`${API}/payments/accounts`, { headers: { 'X-API-Key': key } });
      const j = await r.json();
      setAccounts(j.accounts || []);
    } catch (e) { setErr('Network error'); setAccounts([]); }
    setLoadingAccounts(false);
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
      setCheckoutUrl(j.checkoutUrl);
      loadPayments(apiKeyInput);
    } catch (e) { setErr('Network error'); }
  }

  return (
    <div className="bg-[#080b12] text-on-surface antialiased min-h-screen font-sans text-xs selection:bg-primary/20 overflow-x-hidden flex flex-col">
      {/* Top Bar */}
      <header className="h-12 bg-surface-container-lowest border-b border-outline-variant/60 flex items-center justify-between px-3.5 shrink-0 z-30 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pr-3 border-r border-outline-variant/50">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-inverse-primary to-primary-container flex items-center justify-center shadow-sm ring-1 ring-primary/30">
              <span className="material-symbols-outlined text-white text-[15px]">bolt</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline font-bold text-sm tracking-tight text-white">SkarPay</span>
              <span className="text-[10px] font-mono text-primary font-semibold tracking-wider bg-primary/10 px-1 py-0.5 rounded border border-primary/20">OPS:CONSOLE</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container-low border border-outline-variant/60">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary shadow-[0_0_8px_rgba(78,222,163,0.8)]"></span>
            <span className="font-mono text-[11px] text-on-surface font-medium">env:production</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[11px] pl-2 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-on-surface-variant text-[10px] uppercase tracking-wider">MERCHANTS:</span>
              <span className="text-tertiary font-medium">{merchants.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-on-surface-variant text-[10px] uppercase tracking-wider">VPAs:</span>
              <span className="text-secondary font-medium">{accounts.length}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowProvision(!showProvision)} className="h-7 px-3 rounded bg-gradient-to-r from-inverse-primary to-primary-container text-white font-mono font-semibold text-[11px] flex items-center gap-1.5 shadow-sm hover:brightness-110 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined text-[14px]">add</span>
            <span>Register Merchant</span>
          </button>
          <button onClick={() => { setTab('pending'); setSelected(null); loadMerchants(); }} className="h-7 px-3 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono font-semibold text-[11px] flex items-center gap-1.5 shadow-sm hover:bg-amber-500/30 active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined text-[14px]">pending_actions</span>
            <span>Pending Approvals</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-[9px]">{merchants.filter(m => m.status === 'PENDING').length}</span>
          </button>
          <div className="w-6 h-6 rounded bg-primary-container text-white font-mono font-bold text-[10px] flex items-center justify-center ring-1 ring-primary/40">SA</div>
        </div>
      </header>

      {/* Security Banner */}
      {err && err.includes('mismatch') && (
        <div className="bg-error-container/20 border-b border-error/40 px-3.5 py-1.5 flex items-center gap-2 text-[11px]">
          <span className="material-symbols-outlined text-error text-[14px]">warning</span>
          <span className="font-mono text-on-surface"><strong className="text-error">SECURITY:</strong> {err}</span>
        </div>
      )}

      {/* Main 3-column layout */}
      <div className="flex-1 flex overflow-hidden w-full">
        {/* Left Rail: Merchants */}
        <aside className="w-80 shrink-0 bg-surface-container-lowest border-r border-outline-variant/50 flex flex-col h-[calc(100vh-3rem)]">
          <div className="p-3 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-low/40">
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-headline font-bold text-white text-xs tracking-tight">Merchants Registry</h2>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">{merchants.length} nodes</span>
              </div>
              <p className="text-[10px] font-mono text-on-surface-variant mt-0.5">UPI routing nodes</p>
            </div>
          </div>

          {/* Quick provision */}
          {showProvision && (
            <div className="bg-surface-container-low border-b border-outline-variant/50 p-3 space-y-2 text-[11px]">
              <div className="flex items-center justify-between pb-1 border-b border-outline-variant/30">
                <span className="font-mono text-white font-semibold flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-primary">add_business</span> POST /v2/merchants</span>
                <button className="text-outline hover:text-white" onClick={() => setShowProvision(false)}><span className="material-symbols-outlined text-[14px]">close</span></button>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-on-surface-variant mb-0.5">Business Name *</label>
                <input className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded px-2 py-1 font-sans text-xs text-white" placeholder="Acme Store" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant mb-0.5">WhatsApp / Mobile</label>
                  <input className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded px-2 py-1 font-mono text-[10px] text-white" placeholder="+91 9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-on-surface-variant mb-0.5">Primary VPA</label>
                  <input className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded px-2 py-1 font-mono text-[10px] text-white" placeholder="merchant@okaxis" value={upi} onChange={e => setUpi(e.target.value)} />
                </div>
              </div>
              <button onClick={createMerchant} className="w-full h-6 rounded bg-primary text-on-primary font-mono text-[10px] font-bold tracking-wide hover:brightness-110 flex items-center justify-center gap-1 transition-all">
                <span className="material-symbols-outlined text-[12px]">save</span> Provision Node
              </button>
              {err && <div className="font-mono text-[10px] text-error p-1">{err}</div>}
              {creds && (
                <div className="bg-tertiary/10 border border-tertiary/30 rounded p-2 font-mono text-[10px]">
                  <div className="text-tertiary font-semibold mb-1">⚠️ Save credentials (shown once)</div>
                  <div className="text-on-surface break-all">API: {creds.api_key}</div>
                  <div className="text-on-surface break-all">Secret: {creds.webhook_secret}</div>
                </div>
              )}
            </div>
          )}

          {/* Merchant list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-outline-variant/20">
            {merchants.map(m => (
              <div key={m.id} onClick={() => selectMerchant(m)} className={`p-2.5 cursor-pointer transition-colors ${selected?.id === m.id ? 'bg-surface-container-high/70 border-l-2 border-primary' : 'bg-surface-container-lowest hover:bg-surface-container-low'}`}>
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded bg-primary/20 text-primary border border-primary/40 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                      {m.business_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <span className="font-semibold text-white truncate block text-[11px]">{m.business_name}</span>
                      <span className="font-mono text-[10px] text-on-surface-variant">id: {m.id.slice(0, 8)}...</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-semibold bg-tertiary/10 text-tertiary border border-tertiary/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span> ACTIVE
                  </span>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-outline-variant/20 flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
                  <span>{accounts.length || 0} VPAs</span>
                </div>
              </div>
            ))}
            {merchants.length === 0 && <div className="p-4 text-center font-mono text-[11px] text-on-surface-variant">No merchants yet</div>}
          </div>
        </aside>

        {/* Center: Merchant Detail */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0a0d15] overflow-y-auto custom-scrollbar">
          {tab === 'pending' ? (
            <div className="p-4 space-y-4">
              <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/50 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-[18px]">pending_actions</span>
                    <h3 className="font-headline font-bold text-white text-xs uppercase tracking-wider">Pending Merchant Approvals</h3>
                  </div>
                  <button onClick={loadMerchants} className="px-2 py-1 rounded bg-surface-container-high text-white text-[10px] font-mono hover:bg-surface-container-highest">Refresh</button>
                </div>
                <div className="space-y-2">
                  {merchants.filter(m => m.status === 'PENDING' || m.is_active === false).map(m => (
                    <div key={m.id} className="p-3 rounded bg-surface-container-low border border-amber-500/30 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-white text-sm">{m.business_name}</div>
                        <div className="font-mono text-[10px] text-on-surface-variant">Mobile: {m.mobile || '-'} | Email: {m.email || '-'} | ID: {m.id.slice(0,8)}...</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => approveMerchant(m.id)} className="px-3 py-1 rounded bg-tertiary/20 text-tertiary border border-tertiary/40 text-[10px] font-mono font-semibold hover:bg-tertiary/30">Approve</button>
                        <button onClick={() => rejectMerchant(m.id)} className="px-3 py-1 rounded bg-error/20 text-error border border-error/40 text-[10px] font-mono font-semibold hover:bg-error/30">Reject</button>
                      </div>
                    </div>
                  ))}
                  {merchants.filter(m => m.status === 'PENDING' || m.is_active === false).length === 0 && (
                    <div className="text-center font-mono text-[11px] text-on-surface-variant py-6">No pending approvals</div>
                  )}
                </div>
              </div>
            </div>
          ) : selected ? (
            <>
              <div className="p-4 bg-surface-container-lowest/80 border-b border-outline-variant/40 sticky top-0 backdrop-blur-md z-20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-surface-container-high border border-primary/40 flex items-center justify-center text-primary font-mono font-bold text-sm shadow-inner">
                      {selected.business_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="font-headline font-bold text-base text-white tracking-tight">{selected.business_name}</h1>
                        <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-tertiary/10 text-tertiary border border-tertiary/30">ONLINE</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-on-surface-variant mt-0.5">
                        <span>UUID: <span className="text-white select-all">{selected.id}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Tabs */}
                <div className="flex items-center gap-1 mt-3 border-b border-outline-variant/40">
                  {[
                    { id: 'credentials', label: 'Credentials & VPAs', icon: 'key' },
                    { id: 'whatsapp', label: 'WhatsApp OTP', icon: 'chat' },
                    { id: 'branding', label: 'Branding', icon: 'palette' },
                    { id: 'payments', label: 'Payments', icon: 'payments' },
                    { id: 'settings', label: 'Settings', icon: 'settings' },
                  ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 font-mono text-xs flex items-center gap-1.5 border-b-2 transition-colors ${tab === t.id ? 'font-semibold text-primary border-primary' : 'text-on-surface-variant hover:text-white border-transparent'}`}>
                      <span className="material-symbols-outlined text-[14px]">{t.icon}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 space-y-4">
                {err && <div className="font-mono text-[11px] text-error bg-error-container/20 border border-error/40 rounded p-2">{err}</div>}

                {tab === 'credentials' && (
                  <>
                    <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/50 space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/30">
                        <span className="material-symbols-outlined text-primary text-[18px]">lock</span>
                        <h3 className="font-headline font-bold text-white text-xs uppercase tracking-wider">API Key Vault</h3>
                        {keyValid === true && <span className="ml-auto text-[10px] font-mono text-tertiary">✅ Verified</span>}
                        {keyValid === false && <span className="ml-auto text-[10px] font-mono text-error">❌ Invalid</span>}
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-on-surface-variant mb-1">Active API Secret Key</label>
                        <div className="flex items-center gap-2">
                          <input className="flex-1 bg-surface-container-low border border-outline-variant/60 rounded px-3 py-1.5 font-mono text-xs text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30" type="text" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} onBlur={() => loadAccounts(selected.id, apiKeyInput)} placeholder="mk_live_..." />
                          <button onClick={() => { if (apiKeyInput) navigator.clipboard.writeText(apiKeyInput); }} className="p-1.5 text-on-surface-variant hover:text-white rounded hover:bg-surface-container" title="Copy"><span className="material-symbols-outlined text-[15px]">content_copy</span></button>
                        </div>
                        <div className="font-mono text-[9px] text-outline mt-1">Press Tab after pasting to verify</div>
                      </div>
                      <div className="p-2.5 rounded bg-surface-container-low/90 border border-outline-variant/40 font-mono text-[10px]">
                        <div className="text-outline mb-1">BASH / RUNTIME PROXY INVOCATION</div>
                        <code className="text-tertiary block overflow-x-auto whitespace-pre text-[9px]">{`curl -X POST http://localhost:4100/api/v1/payments \\\n  -H "X-API-Key: {key}" \\\n  -d '{"order_id": "ORD-1", "amount": "499"}'`}</code>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/50 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary text-[18px]">account_balance</span>
                          <h3 className="font-headline font-bold text-white text-xs uppercase tracking-wider">Receiving Accounts (VPAs)</h3>
                        </div>
                        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-tertiary/10 text-tertiary border border-tertiary/30">{accounts.filter(a => a.is_active).length} ACTIVE</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-5">
                          <input className="w-full bg-surface-container border border-outline-variant/50 rounded px-2.5 py-1 font-mono text-xs text-white placeholder:text-outline/70 focus:outline-none focus:border-secondary" placeholder="vpa@bankhandle" value={vpa} onChange={e => setVpa(e.target.value)} />
                        </div>
                        <div className="sm:col-span-4">
                          <input className="w-full bg-surface-container border border-outline-variant/50 rounded px-2.5 py-1 text-xs text-white placeholder:text-outline/70 focus:outline-none focus:border-secondary" placeholder="Account name" value={acctName} onChange={e => setAcctName(e.target.value)} />
                        </div>
                        <div className="sm:col-span-3">
                          <button onClick={addAccount} className="w-full h-7 rounded bg-surface-container-high hover:bg-surface-container-highest text-secondary border border-secondary/30 font-mono text-[10px] font-semibold flex items-center justify-center gap-1 transition-all">
                            <span className="material-symbols-outlined text-[14px]">add_circle</span> Attach VPA
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {loadingAccounts ? (
                          [1, 2].map(i => <div key={i} className="h-20 rounded bg-surface-container-low animate-pulse"></div>)
                        ) : (
                          accounts.map(a => (
                            <div key={a.id} className={`p-3 rounded bg-surface-container-low border border-outline-variant/50 flex flex-col justify-between space-y-2 ${!a.is_active ? 'opacity-40' : ''}`} style={{ borderLeft: `3px solid ${a.is_active ? '#4edea3' : '#ffb4ab'}` }}>
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded bg-secondary/15 text-secondary border border-secondary/30 flex items-center justify-center font-mono font-bold text-[10px]">
                                    {a.vpa.split('@')[1]?.slice(0, 4).toUpperCase() || 'VPA'}
                                  </div>
                                  <div>
                                    <span className="font-mono font-semibold text-white text-xs block">{a.vpa}</span>
                                    <span className="text-[10px] font-mono text-on-surface-variant">{a.account_name} • {a.id.slice(0, 8)}</span>
                                  </div>
                                </div>
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono ${a.is_slot_busy ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-tertiary/10 text-tertiary border border-tertiary/20'}`}>
                                  {a.is_slot_busy ? 'BUSY' : 'FREE'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] font-mono text-outline pt-1 border-t border-outline-variant/30">
                                <span className={a.is_active ? 'text-tertiary' : 'text-error'}>{a.is_active ? '● Active' : '● Inactive'}</span>
                                <div className="flex gap-1">
                                  <button onClick={() => toggleAccount(a.id)} className={`px-2 py-0.5 rounded text-[9px] font-mono border ${a.is_active ? 'border-error/40 text-error hover:bg-error-container/20' : 'border-tertiary/40 text-tertiary hover:bg-tertiary/10'}`}>{a.is_active ? 'Deactivate' : 'Activate'}</button>
                                  <button onClick={() => setDefault(a.id)} className="px-2 py-0.5 rounded text-[9px] font-mono border border-primary/40 text-primary hover:bg-primary/10">Default</button>
                                  <button onClick={async () => {
                                    const newVpa = prompt('Edit VPA:', a.vpa);
                                    if (!newVpa || newVpa === a.vpa) return;
                                    const newName = prompt('Edit account name:', a.account_name) || a.account_name;
                                    try {
                                      await fetch(`/api/v1/payments/accounts/${a.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKeyInput }, body: JSON.stringify({ vpa: newVpa, account_name: newName }) });
                                      await loadAccounts(selected.id, apiKeyInput);
                                    } catch (e) { setErr('Edit failed'); }
                                  }} className="px-2 py-0.5 rounded text-[9px] font-mono border border-secondary/40 text-secondary hover:bg-secondary/10">Edit</button>
                                  <button onClick={async () => {
                                    if (!confirm(`Remove VPA ${a.vpa}?`)) return;
                                    try {
                                      const r = await fetch(`/api/v1/payments/accounts/${a.id}`, { method: 'DELETE', headers: { 'X-API-Key': apiKeyInput } });
                                      const j = await r.json();
                                      if (!r.ok) { setErr(j.error || 'Delete failed'); return; }
                                      await loadAccounts(selected.id, apiKeyInput);
                                    } catch (e) { setErr('Delete failed'); }
                                  }} className="px-2 py-0.5 rounded text-[9px] font-mono border border-error/40 text-error hover:bg-error-container/20">Remove</button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        {accounts.length === 0 && !loadingAccounts && <div className="col-span-2 text-center font-mono text-[11px] text-on-surface-variant py-4">No accounts yet. Paste API key and add VPA above.</div>}
                      </div>
                    </div>
                  </>
                )}

                    <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/50 space-y-3 mt-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/30">
                        <span className="material-symbols-outlined text-primary text-[18px]">qr_code_scanner</span>
                        <h3 className="font-headline font-bold text-white text-xs uppercase tracking-wider">Device Pairing QR</h3>
                      </div>
                      <PairingQR merchant={selected} apiKey={apiKeyInput} />
                    </div>

                {tab === 'branding' && (
                  <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/50 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/30">
                      <span className="material-symbols-outlined text-primary text-[18px]">palette</span>
                      <h3 className="font-headline font-bold text-white text-xs uppercase tracking-wider">Customer Checkout Sheet Styling</h3>
                    </div>
                    <BrandingEditor merchant={selected} apiKey={apiKeyInput} />
                  </div>
                )}

                {tab === 'payments' && (
                  <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/50 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/30">
                      <span className="material-symbols-outlined text-secondary text-[18px]">payments</span>
                      <h3 className="font-headline font-bold text-white text-xs uppercase tracking-wider">Payment Stream</h3>
                    </div>
                    <PaymentsView apiKey={apiKeyInput} />
                  </div>
                )}

                {tab === 'whatsapp' && (
                  <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/50 space-y-3">
                    <WhatsAppConnect />
                  </div>
                )}

                {tab === 'settings' && (
                  <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/50 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/30">
                      <span className="material-symbols-outlined text-primary text-[18px]">settings</span>
                      <h3 className="font-headline font-bold text-white text-xs uppercase tracking-wider">Merchant Settings</h3>
                    </div>
                    <SettingsView selected={selected} apiKey={apiKeyInput} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center flex-col gap-2">
              <span className="text-4xl opacity-20">🏪</span>
              <span className="font-mono text-[12px] text-on-surface-variant">Select a merchant from the registry</span>
            </div>
          )}
        </main>

        {/* Right Rail: Live Stream */}
        <aside className="w-80 shrink-0 bg-surface-container-lowest border-l border-outline-variant/50 flex flex-col h-[calc(100vh-3rem)]">
          <div className="p-3 border-b border-outline-variant/40 bg-surface-container-low/40 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse shadow-[0_0_8px_rgba(78,222,163,0.8)]"></span>
              <h2 className="font-headline font-bold text-white text-xs tracking-tight">Live Settlement Wire</h2>
            </div>
            <span className="font-mono text-[10px] text-tertiary bg-tertiary/10 px-1.5 py-0.2 rounded border border-tertiary/20">SSE CONNECTED</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-2">
            <div className="font-mono text-[9px] text-outline uppercase tracking-wider mb-1 flex justify-between">
              <span>EVENT STREAM</span>
              <span>LAST 10s</span>
            </div>
            {payments.slice(0, 8).map((p) => (
              <div key={p.id} className="p-2 rounded bg-surface-container-low border border-outline-variant/40 hover:border-tertiary/40 transition-colors">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className={`font-bold flex items-center gap-1 ${p.status === 'SUCCESS' ? 'text-tertiary' : p.status === 'FAILED' ? 'text-error' : 'text-amber-400'}`}>
                    <span className="material-symbols-outlined text-[12px]">{p.status === 'SUCCESS' ? 'check_circle' : p.status === 'FAILED' ? 'cancel' : 'pending'}</span> ₹{(p.amount_paise / 100).toFixed(2)}
                  </span>
                  <span className="text-outline">{new Date(p.created_at).toLocaleTimeString()}</span>
                </div>
                <div className="text-[10px] font-mono text-on-surface truncate mt-1">{p.order_id} • {selected?.business_name}</div>
                <div className="text-[9px] font-mono text-on-surface-variant flex justify-between mt-1">
                  <span>{p.method}</span>
                  <span className={p.utr ? 'text-tertiary' : 'text-outline'}>{p.utr || 'PENDING'}</span>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <div className="font-mono text-[10px] text-on-surface-variant text-center py-6">No payments yet. Create one to see live stream.</div>
            )}
          </div>
          <div className="border-t border-outline-variant/40 bg-surface-container-lowest p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-on-surface-variant">
              <span className="flex items-center gap-1 text-white font-semibold"><span className="material-symbols-outlined text-[13px] text-primary">terminal</span> OPS DISPATCH</span>
              <span className="text-outline">v2.4 CLI</span>
            </div>
            <div className="bg-surface-container-low rounded border border-outline-variant/60 p-2 font-mono text-[10px] space-y-1">
              <div className="text-outline flex items-center gap-1"><span className="text-tertiary">$</span> skarpay vpa --ping-all --mesh</div>
              <div className="text-tertiary text-[9px]">✔ {accounts.filter(a => a.is_active).length}/{accounts.length} VPAs active</div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
              <button onClick={() => { if (apiKeyInput) navigator.clipboard.writeText(apiKeyInput); }} className="h-6 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/50 flex items-center justify-center gap-1 transition-colors">
                <span className="material-symbols-outlined text-[12px] text-secondary">content_copy</span> Copy Key
              </button>
              <button onClick={() => loadPayments(apiKeyInput)} className="h-6 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/50 flex items-center justify-center gap-1 transition-colors">
                <span className="material-symbols-outlined text-[12px] text-tertiary">refresh</span> Refresh
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Checkout Modal */}
      {checkoutUrl && (
        <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center p-4" onClick={() => setCheckoutUrl(null)}>
          <div className="relative w-full max-w-5xl h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setCheckoutUrl(null)} className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70">✕</button>
            <iframe src={checkoutUrl} className="w-full h-full border-0" title="Checkout" />
          </div>
        </div>
      )}
    </div>
  );
}
