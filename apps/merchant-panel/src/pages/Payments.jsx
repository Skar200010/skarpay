import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4100'

export default function Payments() {
  const [payments, setPayments] = useState([])
  const token = localStorage.getItem('merchant_token')

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const res = await fetch(`${API}/api/v1/merchant-panel/payments?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setPayments(data.payments || [])
    } catch (err) {
      console.error(err)
    }
  }

  const getStatusClass = (status) => {
    if (status === 'SUCCESS') return 'status-success'
    if (status === 'FAILED' || status === 'EXPIRED') return 'status-failed'
    return 'status-pending'
  }

  return (
    <div>
      <nav className="nav">
        <h2 style={{ flex: 1 }}>SkarPay Merchant Panel</h2>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/payments" className="active">Payments</Link>
        <Link to="/devices">Devices</Link>
        <Link to="/customizer">Customizer</Link>
      </nav>
      <div className="container">
        <h1 style={{ marginBottom: '32px' }}>Payments</h1>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Amount</th>
                <th>Status</th>
                <th>UTR</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id}>
                  <td>{p.order_id}</td>
                  <td>₹{(p.amount_paise / 100).toFixed(2)}</td>
                  <td className={getStatusClass(p.status)}>{p.status}</td>
                  <td>{p.utr || '-'}</td>
                  <td>{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
