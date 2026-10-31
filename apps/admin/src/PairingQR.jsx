import React, { useState } from 'react';
import QRCode from 'qrcode';

function defaultServerUrl() {
  const configured = import.meta.env.VITE_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/+$/, '');

  const host = typeof window !== 'undefined' ? window.location.hostname : '';

  // On Vercel/HTTPS use the Render API by default
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return 'https://skarpay.onrender.com';
  }

  // When the admin panel is opened over LAN, its hostname already is the
  // machine's LAN IP.
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:4100`;
  }
  return 'http://localhost:4100';
}

export default function PairingQR({ merchant }) {
  const [qrUrl, setQrUrl] = useState(null);
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState(defaultServerUrl);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!merchant) return;

    const baseUrl = serverUrl.trim().replace(/\/+$/, '');
    if (!baseUrl) {
      setError('Server URL required (e.g. https://skarpay.onrender.com)');
      return;
    }

    setError('');
    setLoading(true);
    try {
      let enrollmentToken = token.trim();
      if (!enrollmentToken) {
        const res = await fetch(
          `/api/v1/pollers/enrollment-token?merchantId=${encodeURIComponent(merchant.id)}`,
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Token request failed (HTTP ${res.status})`);
        }
        const data = await res.json();
        enrollmentToken = data.token;
        setToken(enrollmentToken);
      }

      const pairingData = JSON.stringify({
        baseUrl,
        token: enrollmentToken,
        merchantId: merchant.id,
      });
      const url = await QRCode.toDataURL(pairingData, { width: 256, margin: 2 });
      setQrUrl(url);
    } catch (e) {
      console.error('QR gen failed:', e);
      setError(e.message || 'Could not generate pairing QR');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: '#0b0f19', border: '1px solid #263047', borderRadius: 8, padding: 16, marginTop: 12 }}>
      <div style={{ fontSize: 10, color: '#8e99b5', marginBottom: 12 }}>
        Generate a QR code for the Android observer app to scan and auto-pair.
        Tokens expire after 10 minutes.
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 10, color: '#8e99b5', display: 'block', marginBottom: 4 }}>
          Server URL (public API base)
        </label>
        <input
          style={{ width: '100%', padding: '8px 10px', background: '#070a10', border: '1px solid #263047', borderRadius: 4, color: '#e2e7f5', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
          placeholder="https://skarpay.onrender.com"
          value={serverUrl}
          onChange={e => setServerUrl(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          style={{ flex: 1, padding: '8px 10px', background: '#070a10', border: '1px solid #263047', borderRadius: 4, color: '#e2e7f5', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
          placeholder="Enrollment token (auto-generated if blank)"
          value={token}
          onChange={e => setToken(e.target.value)}
        />
        <button
          onClick={generate}
          disabled={loading}
          style={{ padding: '8px 16px', borderRadius: 4, background: loading ? '#555a6e' : '#c0c1ff', color: '#070a10', fontWeight: 700, fontSize: 10, border: 'none', cursor: loading ? 'default' : 'pointer' }}
        >
          {loading ? 'Generating...' : 'Generate QR'}
        </button>
      </div>
      {error && (
        <div style={{ color: '#ffb4ab', fontSize: 10, marginBottom: 10 }}>{error}</div>
      )}
      {qrUrl && (
        <div style={{ textAlign: 'center' }}>
          <img src={qrUrl} alt="Pairing QR" style={{ borderRadius: 8, border: '1px solid #263047', background: '#fff', padding: 8 }} />
          <div style={{ fontSize: 10, color: '#8e99b5', marginTop: 10 }}>
            Scan this QR with the SkarPay Observer app
          </div>
        </div>
      )}
    </div>
  );
}
