import React, { useState } from 'react';
import QRCode from 'qrcode';

export default function PairingQR({ merchant, apiKey }) {
  const [qrUrl, setQrUrl] = useState(null);
  const [token, setToken] = useState('');

  async function generate() {
    if (!merchant) return;
    const enrollmentToken = token || 'enroll-' + merchant.id.slice(0, 8);
    const pairingData = JSON.stringify({
      baseUrl: window.location.origin.replace('5173', '4100'),
      token: enrollmentToken,
      merchantId: merchant.id,
    });
    try {
      const url = await QRCode.toDataURL(pairingData, { width: 256, margin: 2 });
      setQrUrl(url);
    } catch (e) {
      console.error('QR gen failed:', e);
    }
  }

  return (
    <div style={{ background: '#0b0f19', border: '1px solid #263047', borderRadius: 8, padding: 16, marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#e2e7f5', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Device Pairing QR</div>
      <div style={{ fontSize: 10, color: '#8e99b5', marginBottom: 12 }}>Generate a QR code for the Android observer app to scan and auto-pair.</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          style={{ flex: 1, padding: '8px 10px', background: '#070a10', border: '1px solid #263047', borderRadius: 4, color: '#e2e7f5', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
          placeholder="Enrollment token (optional)"
          value={token}
          onChange={e => setToken(e.target.value)}
        />
        <button onClick={generate} style={{ padding: '8px 16px', borderRadius: 4, background: '#c0c1ff', color: '#070a10', fontWeight: 700, fontSize: 10, border: 'none', cursor: 'pointer' }}>
          Generate QR
        </button>
      </div>
      {qrUrl && (
        <div style={{ textAlign: 'center' }}>
          <img src={qrUrl} alt="Pairing QR" style={{ borderRadius: 8, border: '1px solid #263047' }} />
          <div style={{ fontSize: 10, color: '#8e99b5', marginTop: 8, fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>
            Base URL: {window.location.origin.replace('5173', '4100')}<br />
            Token: {token || 'enroll-' + merchant.id.slice(0, 8)}<br />
            Merchant: {merchant.id}
          </div>
        </div>
      )}
    </div>
  );
}
