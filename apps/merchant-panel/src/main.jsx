import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Payments from './pages/Payments.jsx'
import Devices from './pages/Devices.jsx'
import Customizer from './pages/Customizer.jsx'
import './index.css'

function App() {
  const token = localStorage.getItem('merchant_token')
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/payments" element={token ? <Payments /> : <Navigate to="/login" />} />
        <Route path="/devices" element={token ? <Devices /> : <Navigate to="/login" />} />
        <Route path="/customizer" element={token ? <Customizer /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
