import React, { useState } from 'react';
import { clearAdminKey, getAdminKey, setAdminKey } from './apiFetch.js';

const buttonStyle = {
  position: 'fixed',
  right: 12,
  bottom: 12,
  zIndex: 50,
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #263047',
  background: '#0b0f19',
  color: '#8e99b5',
  fontSize: 10,
  cursor: 'pointer',
};

export default function AdminKeyGate({ children }) {
  const [key, setKey] = useState(getAdminKey());
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function unlock(event) {
    event.preventDefault();
    const candidate = input.trim();
    if (!candidate) {
      setError('Admin key required');
      return;
    }

    setChecking(true);
    setError('');
    try {
      const response = await fetch('/api/v1/merchants', {
        headers: { 'X-Admin-Key': candidate },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server rejected the key (HTTP ${response.status})`);
      }
      setAdminKey(candidate);
      setKey(candidate);
    } catch (e) {
      setError(e.message || 'Could not validate the admin key');
    } finally {
      setChecking(false);
    }
  }

  if (key) {
    return (
      <>
        {children}
        <button
          type="button"
          style={buttonStyle}
          title="Clear the saved admin key"
          onClick={() => {
            clearAdminKey();
            setKey('');
          }}
        >
          Change admin key
        </button>
      </>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#070a10',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <form
        onSubmit={unlock}
        style={{
          width: '100%',
          maxWidth: 380,
          background: '#0b0f19',
          border: '1px solid #263047',
          borderRadius: 12,
          padding: 24,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e7f5', marginBottom: 6 }}>
          SkarPay Ops Console
        </div>
        <div style={{ fontSize: 11, color: '#8e99b5', marginBottom: 16, lineHeight: 1.5 }}>
          Enter the server <code>ADMIN_API_KEY</code> to unlock merchant management.
        </div>
        <input
          autoFocus
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Admin API key"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 12px',
            background: '#070a10',
            border: '1px solid #263047',
            borderRadius: 6,
            color: '#e2e7f5',
            fontSize: 12,
            fontFamily: 'JetBrains Mono, monospace',
          }}
        />
        {error && (
          <div style={{ color: '#ffb4ab', fontSize: 11, marginTop: 10 }}>{error}</div>
        )}
        <button
          type="submit"
          disabled={checking}
          style={{
            width: '100%',
            marginTop: 14,
            padding: '10px 12px',
            borderRadius: 6,
            border: 'none',
            background: checking ? '#555a6e' : '#c0c1ff',
            color: '#070a10',
            fontWeight: 700,
            fontSize: 12,
            cursor: checking ? 'default' : 'pointer',
          }}
        >
          {checking ? 'Checking...' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
