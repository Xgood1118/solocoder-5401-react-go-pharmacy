import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DrugList from './pages/DrugList.jsx'
import DrugDetail from './pages/DrugDetail.jsx'
import RxList from './pages/RxList.jsx'
import RxDetail from './pages/RxDetail.jsx'
import RxCreate from './pages/RxCreate.jsx'
import Insurance from './pages/Insurance.jsx'
import Schedule from './pages/Schedule.jsx'
import Staff from './pages/Staff.jsx'
import Alerts from './pages/Alerts.jsx'
import GSPLedger from './pages/GSPLedger.jsx'
import Transfers from './pages/Transfers.jsx'

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

function AppRoutes() {
  const { token, loading } = useAuth()

  if (loading) {
    return <div className="text-center" style={{ padding: 100 }}>加载中...</div>
  }

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={token ? <Dashboard /> : <Navigate to="/login" replace />} />
      <Route path="/drugs" element={token ? <DrugList /> : <Navigate to="/login" replace />} />
      <Route path="/drugs/:id" element={token ? <DrugDetail /> : <Navigate to="/login" replace />} />
      <Route path="/rx" element={token ? <RxList /> : <Navigate to="/login" replace />} />
      <Route path="/rx/new" element={token ? <RxCreate /> : <Navigate to="/login" replace />} />
      <Route path="/rx/:id" element={token ? <RxDetail /> : <Navigate to="/login" replace />} />
      <Route path="/insurance" element={token ? <Insurance /> : <Navigate to="/login" replace />} />
      <Route path="/schedule" element={token ? <Schedule /> : <Navigate to="/login" replace />} />
      <Route path="/staff" element={token ? <Staff /> : <Navigate to="/login" replace />} />
      <Route path="/alerts" element={token ? <Alerts /> : <Navigate to="/login" replace />} />
      <Route path="/gsp" element={token ? <GSPLedger /> : <Navigate to="/login" replace />} />
      <Route path="/transfers" element={token ? <Transfers /> : <Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
