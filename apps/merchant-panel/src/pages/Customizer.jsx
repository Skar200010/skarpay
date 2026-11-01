import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4100'

export default function Customizer() {
  const [branding, setBranding] = useState({
    logo: '',
    brandName: '',
    primaryColor: '#6366f1',
    buttonText: 'Pay Now',
    showMerchantName: true,
    showOrderId: true,
    showTimer: true
  })
  const token = localStorage.getItem('merchant_token')

  useEffect(() => {
    fetchBranding()
  }, [])

  const fetchBranding = async () => {
    try {
      const res = await fetch(`${API}/api/v1/merchant-panel/branding`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.branding) setBranding({...branding, ...data.branding})
    } catch (err) {
      console.error(err)
    }
  }

  const save = async () => {
    try {
      await fetch(`${API}/api/v1/merchant-panel/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ branding })
      })
      alert('Saved successfully!')
    } catch (err) {
      alert('Error saving')
    }
  }

  return (
    <div>
      <nav className="nav">
        <h2 style={{ flex: 1 }}>SkarPay Merchant Panel</h2>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/payments">Payments</Link>
        <Link to="/devices">Devices</Link>
        <Link to="/customizer" className="active">Customizer</Link>
      </nav>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h1 style={{ marginBottom: '32px' }}>Checkout Customizer</h1>
          <div className="card">
            <label style={{ display: 'block', marginBottom: '8px' }}>Brand Name</label>
            <input className="input" value={branding.brandName} onChange={e => setBranding({...branding, brandName: e.target.value})} />
            <label style={{ display: 'block', marginBottom: '8px' }}>Logo URL</label>
            <input className="input" value={branding.logo} onChange={e => setBranding({...branding, logo: e.target.value})} />
            <label style={{ display: 'block', marginBottom: '8px' }}>Primary Color</label>
            <input type="color" style={{ width: '100%', height: '40px', marginBottom: '16px' }} value={branding.primaryColor} onChange={e => setBranding({...branding, primaryColor: e.target.value})} />
            <label style={{ display: 'block', marginBottom: '8px' }}>Button Text</label>
            <input className="input" value={branding.buttonText} onChange={e => setBranding({...branding, buttonText: e.target.value})} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <input type="checkbox" checked={branding.showMerchantName} onChange={e => setBranding({...branding, showMerchantName: e.target.checked})} />
              Show Merchant Name
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <input type="checkbox" checked={branding.showOrderId} onChange={e => setBranding({...branding, showOrderId: e.target.checked})} />
              Show Order ID
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <input type="checkbox" checked={branding.showTimer} onChange={e => setBranding({...branding, showTimer: e.target.checked})} />
              Show Timer
            </label>
            <button className="btn" onClick={save}>Save Changes</button>
          </div>
        </div>
        <div>
          <h2 style={{ marginBottom: '32px' }}>Live Preview</h2>
          <div className="card" style={{ textAlign: 'center' }}>
            {branding.logo && <img src={branding.logo} alt="logo" style={{ maxHeight: '60px', marginBottom: '16px' }} />}
            <h3 style={{ marginBottom: '8px' }}>{branding.brandName || 'Your Business'}</h3>
            <p style={{ color: '#a1a1aa', marginBottom: '16px' }}>Pay ₹1.00</p>
            {branding.showOrderId && <p style={{ fontSize: '12px', color: '#a1a1aa', marginBottom: '16px' }}>Order: #TEST123</p>}
            <button style={{ background: branding.primaryColor, color: 'white', border: 'none', padding: '12px 32px', borderRadius: '8px', width: '100%' }}>{branding.buttonText}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
