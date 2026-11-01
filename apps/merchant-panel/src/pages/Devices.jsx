import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4100'

export default function Devices() {
  const [devices, setDevices] = useState([])
  const token = localStorage.getItem('merchant_token')

  useEffect(() => {
    fetchDevices()
  }, [])

  const fetchDevices = async () => {
    try {
      const res = await fetch(`${API}/api/v1/merchant-panel/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setDevices(data.devices || [])
    } catch (err) {
      console.error(err)
    }
  }

  const revoke = async (id) => {
    if (!confirm('Revoke this device?')) return
    try {
      await fetch(`${API}/api/v1/merchant-panel/devices/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      fetchDevices()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <nav className="nav">
        <h2 style={{ flex: 1 }}>SkarPay Merchant Panel</h2>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/payments">Payments</Link>
        <Link to="/devices" className="active">Devices</Link>
        <Link to="/customizer">Customizer</Link>
      </nav>
      <div className="container">
        <h1 style={{ marginBottom: '32px' }}>Paired Devices</h1>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Device Name</th>
                <th>Model</th>
                <th>Platform</th>
                <th>Last Seen</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id}>
                  <td>{d.device_name}</td>
                  <td>{d.device_model}</td>
                  <td>{d.platform}</td>
                  <td>{d.last_seen_at ? new Date(d.last_seen_at).toLocaleString() : '-'}</td>
                  <td><button className="btn" style={{ padding: '6px 12px', background: '#ef4444' }} onClick={() => revoke(d.id)}>Revoke</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
