import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4100'

export default function Register() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ business_name: '', mobile: '', email: '', password: '', otp: '', address: '', gst: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const sendOtp = async () => {
    setError('')
    try {
      const res = await fetch(`${API}/api/v1/merchant-auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: form.mobile })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStep(2)
    } catch (err) {
      setError(err.message)
    }
  }

  const register = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch(`${API}/api/v1/merchant-auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess(data.message)
      setStep(3)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="card" style={{ width: '500px' }}>
        <h1 style={{ marginBottom: '8px' }}>Merchant Registration</h1>
        <p style={{ color: '#a1a1aa', marginBottom: '32px' }}>Step {step} of 3</p>
        {error && <div style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</div>}
        {success && <div style={{ color: '#10b981', marginBottom: '16px' }}>{success}</div>}
        
        {step === 1 && (
          <div>
            <input className="input" placeholder="Business Name" value={form.business_name} onChange={e => setForm({...form, business_name: e.target.value})} />
            <input className="input" placeholder="Mobile Number" value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} />
            <input className="input" placeholder="Email (optional)" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <input className="input" placeholder="Address (optional)" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            <input className="input" type="password" placeholder="Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            <button className="btn" style={{ width: '100%' }} onClick={sendOtp}>Send OTP</button>
          </div>
        )}
        
        {step === 2 && (
          <form onSubmit={register}>
            <input className="input" placeholder="Enter OTP" value={form.otp} onChange={e => setForm({...form, otp: e.target.value})} />
            <button className="btn" style={{ width: '100%' }}>Submit Registration</button>
          </form>
        )}
        
        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <p>Registration submitted successfully!</p>
            <p style={{ color: '#a1a1aa', marginTop: '8px' }}>Your account is pending admin approval.</p>
            <Link to="/login" style={{ color: '#6366f1', display: 'block', marginTop: '16px' }}>Back to Login</Link>
          </div>
        )}
      </div>
    </div>
  )
}
