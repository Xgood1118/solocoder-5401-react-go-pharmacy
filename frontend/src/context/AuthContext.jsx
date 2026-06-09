import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [staff, setStaff] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedStaff = localStorage.getItem('staff')
    if (savedToken && savedStaff) {
      setToken(savedToken)
      setStaff(JSON.parse(savedStaff))
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    const { token: t, staff: s } = res.data
    setToken(t)
    setStaff(s)
    localStorage.setItem('token', t)
    localStorage.setItem('staff', JSON.stringify(s))
    return s
  }

  const logout = () => {
    setToken(null)
    setStaff(null)
    localStorage.removeItem('token')
    localStorage.removeItem('staff')
  }

  const changePassword = async (oldPassword, newPassword) => {
    await api.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword })
  }

  const fetchProfile = async () => {
    const res = await api.get('/staff/profile')
    setStaff(res.data.staff)
    localStorage.setItem('staff', JSON.stringify(res.data.staff))
    return res.data
  }

  const hasRole = (...roles) => {
    if (!staff) return false
    return roles.includes(staff.role)
  }

  return (
    <AuthContext.Provider value={{
      staff,
      token,
      loading,
      login,
      logout,
      changePassword,
      fetchProfile,
      hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
