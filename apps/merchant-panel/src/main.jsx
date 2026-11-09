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

// Guard reads localStorage when the protected route mounts. Reading it once in App
// would freeze the value from the first render, so a successful login would still
// redirect back to /login.
function RequireAuth({ children }) {
  const token = localStorage.getItem('merchant_token')
  return token ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/payments" element={<RequireAuth><Payments /></RequireAuth>} />
        <Route path="/devices" element={<RequireAuth><Devices /></RequireAuth>} />
        <Route path="/customizer" element={<RequireAuth><Customizer /></RequireAuth>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
