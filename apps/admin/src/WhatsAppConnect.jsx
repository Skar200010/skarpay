import React, { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4100';

function getAdminKey() {
  return localStorage.getItem('sk_admin_key') || import.meta.env.VITE_ADMIN_KEY || '';
}

async function adminFetch(path, opts = {}) {
  const key = getAdminKey();
  const res = await fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': key, ...(opts.headers || {}) },
  });
  return res;
}

export default function WhatsAppConnect() {
  const [status, setStatus] = useState({ ready: false, hasQR: false, qr: null });
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await adminFetch('/api/v1/whatsapp/status');
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const init = async () => {
    setLoading(true);
    await adminFetch('/api/v1/whatsapp/init', { method: 'POST' });
    setTimeout(fetchStatus, 1000);
    setLoading(false);
  };

  const logout = async () => {
    if (!confirm('Logout WhatsApp? This will require scanning QR again.')) return;
    await adminFetch('/api/v1/whatsapp/logout', { method: 'POST' });
    setTimeout(fetchStatus, 1000);
  };

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <h1 style={{ color: '#e7e9ee', marginBottom: 8 }}>WhatsApp OTP Connection</h1>
      <p style={{ color: '#b9bdc9', marginBottom: 24 }}>Connect WhatsApp to send OTPs for merchant registration</p>

      <div style={{ background: '#141824', border: '1px solid #24273a', borderRadius: 12, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: status.ready ? '#22c55e' : '#f59e0b' }}></div>
          <span style={{ color: '#e7e9ee', fontWeight: 600 }}>
            {status.ready ? 'Connected' : status.hasQR ? 'Waiting for Scan' : 'Not Connected'}
          </span>
        </div>

        {status.ready && (
          <div>
            <p style={{ color: '#22c55e', marginBottom: 16 }}>✅ WhatsApp connected! OTPs will be sent from this number.</p>
            <button onClick={logout} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer' }}>
              Disconnect
            </button>
          </div>
        )}

        {!status.ready && status.hasQR && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#b9bdc9', marginBottom: 16 }}>Scan this QR code with WhatsApp</p>
            <img src={status.qr} alt="WhatsApp QR" style={{ width: 256, height: 256, border: '2px solid #24273a', borderRadius: 8 }} />
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 12 }}>Open WhatsApp → Settings → Linked Devices → Link a Device</p>
          </div>
        )}

        {!status.ready && !status.hasQR && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#b9bdc9', marginBottom: 16 }}>Click to generate QR code</p>
            <button onClick={init} disabled={loading} style={{ background: '#6366f1', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
              {loading ? 'Initializing...' : 'Connect WhatsApp'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
