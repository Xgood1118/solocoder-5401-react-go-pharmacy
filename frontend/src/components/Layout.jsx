import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children, title }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { staff, logout } = useAuth()

  const menuItems = [
    { path: '/', label: '首页', icon: '🏠' },
    { path: '/drugs', label: '药品管理', icon: '💊' },
    { path: '/rx', label: '处方管理', icon: '📋' },
    { path: '/insurance', label: '医保结算', icon: '🏥' },
    { path: '/schedule', label: '排班管理', icon: '📅' },
    { path: '/alerts', label: '预警中心', icon: '🔔' },
    { path: '/transfers', label: '跨店调拨', icon: '🚚' },
    { path: '/gsp', label: 'GSP台账', icon: '📊' },
  ]

  if (staff?.role === 'manager') {
    menuItems.push({ path: '/staff', label: '员工管理', icon: '👥' })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const roleLabel = {
    manager: '店长',
    pharmacist: '药师',
    cashier: '收银员',
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">💊 药店管理系统</div>
        <ul className="sidebar-menu">
          {menuItems.map(item => (
            <li key={item.path}>
              <Link to={item.path} className={location.pathname === item.path ? 'active' : ''}>
                {item.icon} {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
      <div className="main-content">
        <header className="header">
          <div className="text-lg font-bold">{title || '社区药店管理系统'}</div>
          <div className="header-user">
            <span className="text-muted">
              {staff?.name}（{roleLabel[staff?.role] || staff?.role}）
            </span>
            <button className="btn btn-default btn-sm" onClick={handleLogout}>退出</button>
          </div>
        </header>
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  )
}
