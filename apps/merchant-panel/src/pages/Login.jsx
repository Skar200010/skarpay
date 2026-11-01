import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4100'

export default function Login() {
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch(`${API}/api/v1/merchant-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      localStorage.setItem('merchant_token', data.token)
      localStorage.setItem('merchant', JSON.stringify(data.merchant))
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ width: '400px' }}>
        <h1 style={{ marginBottom: '8px' }}>SkarPay Merchant</h1>
        <p style={{ color: '#a1a1aa', marginBottom: '32px' }}>Login to your merchant panel</p>
        {error && <div style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</div>}
        <form onSubmit={handleLogin}>
          <input className="input" placeholder="Mobile Number" value={mobile} onChange={e => setMobile(e.target.value)} />
          <input className="input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="btn" style={{ width: '100%' }}>Login</button>
        </form>
        <p style={{ marginTop: '16px', textAlign: 'center', color: '#a1a1aa' }}>
          Don't have account? <Link to="/register" style={{ color: '#6366f1' }}>Register</Link>
        </p>
      </div>
    </div>
  )
}
