import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card card" style={{ width: 400, padding: 40, background: 'white', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
        <h1 className="login-title" style={{ textAlign: 'center', fontSize: 24, marginBottom: 32 }}>💊 社区药店管理系统</h1>
        {error && <div className="alert-red">{error}</div>}
        <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
          <div className="form-group">
            <label className="form-label">用户名</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: 12, fontSize: 16 }}
            disabled={loading}
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>
        <div className="text-center text-sm text-muted">
          <p>测试账号：</p>
          <p>店长：manager / 123456</p>
          <p>药师：pharmacist / 123456</p>
          <p>收银：cashier / 123456</p>
        </div>
      </div>
    </div>
  )
}
