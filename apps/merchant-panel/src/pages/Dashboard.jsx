import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4100'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const navigate = useNavigate()
  const merchant = JSON.parse(localStorage.getItem('merchant') || '{}')
  const token = localStorage.getItem('merchant_token')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/api/v1/merchant-panel/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setStats(data.stats)
    } catch (err) {
      console.error(err)
    }
  }

  const logout = () => {
    localStorage.removeItem('merchant_token')
    localStorage.removeItem('merchant')
    navigate('/login')
  }

  return (
    <div>
      <nav className="nav">
        <h2 style={{ flex: 1 }}>SkarPay Merchant Panel</h2>
        <Link to="/dashboard" className="active">Dashboard</Link>
        <Link to="/payments">Payments</Link>
        <Link to="/devices">Devices</Link>
        <Link to="/customizer">Customizer</Link>
        <button className="btn" onClick={logout}>Logout</button>
      </nav>
      <div className="container">
        <h1 style={{ marginBottom: '8px' }}>Welcome, {merchant.business_name}</h1>
        <p style={{ color: '#a1a1aa', marginBottom: '32px' }}>Overview of your payments</p>
        <div className="grid">
          <div className="card stat">
            <div className="stat-value">₹{((stats?.total_amount || 0) / 100).toFixed(2)}</div>
            <div style={{ color: '#a1a1aa' }}>Total Collection</div>
          </div>
          <div className="card stat">
            <div className="stat-value">{stats?.successful || 0}</div>
            <div style={{ color: '#a1a1aa' }}>Successful Payments</div>
          </div>
          <div className="card stat">
            <div className="stat-value">{stats?.pending || 0}</div>
            <div style={{ color: '#a1a1aa' }}>Pending</div>
          </div>
          <div className="card stat">
            <div className="stat-value">₹{((stats?.today_amount || 0) / 100).toFixed(2)}</div>
            <div style={{ color: '#a1a1aa' }}>Today</div>
          </div>
        </div>
      </div>
    </div>
  )
}
