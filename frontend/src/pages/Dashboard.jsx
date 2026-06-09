import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import api from '../api'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalDrugs: 0,
    todayRx: 0,
    lowStockAlerts: 0,
    expiryAlerts: 0,
  })
  const [recentRx, setRecentRx] = useState([])
  const [alerts, setAlerts] = useState({ red_alerts: [], orange_alerts: [] })
  const { staff, fetchProfile } = useAuth()
  const [passwordWarning, setPasswordWarning] = useState(false)
  const [passwordExpiresIn, setPasswordExpiresIn] = useState(0)

  useEffect(() => {
    loadData()
    checkPassword()
  }, [])

  const checkPassword = async () => {
    try {
      const res = await fetchProfile()
      setPasswordWarning(res.password_warning)
      setPasswordExpiresIn(res.password_expires_in)
    } catch (e) {
      console.error(e)
    }
  }

  const loadData = async () => {
    try {
      const [drugsRes, rxRes, alertsRes] = await Promise.all([
        api.get('/drugs'),
        api.get('/rx'),
        api.get('/drugs/alerts/list'),
      ])
      setStats({
        totalDrugs: drugsRes.data.length,
        todayRx: rxRes.data.length,
        lowStockAlerts: alertsRes.data.orange_alerts.length,
        expiryAlerts: alertsRes.data.red_alerts.length,
      })
      setRecentRx(rxRes.data.slice(0, 5))
      setAlerts(alertsRes.data)
    } catch (e) {
      console.error('加载数据失败', e)
    }
  }

  const statusMap = {
    created: { label: '待核方', tag: 'tag-blue' },
    verified: { label: '已核方', tag: 'tag-orange' },
    dispensed: { label: '已发药', tag: 'tag-green' },
    insurance_submitted: { label: '医保已上传', tag: 'tag-blue' },
    completed: { label: '已完成', tag: 'tag-green' },
    void: { label: '已作废', tag: 'tag-gray' },
  }

  return (
    <Layout title="首页">
      {passwordWarning && (
        <div className="alert-orange">
          ⚠️ 您的密码将在 {passwordExpiresIn} 天后过期，请及时修改密码以保证账号安全。
          <Link to="/staff" style={{ marginLeft: 12 }}>去修改 →</Link>
        </div>
      )}

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#1890ff' }}>{stats.totalDrugs}</div>
          <div className="stat-label">药品种类</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#52c41a' }}>{stats.todayRx}</div>
          <div className="stat-label">处方总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#fa8c16' }}>{stats.lowStockAlerts}</div>
          <div className="stat-label">库存预警</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#ff4d4f' }}>{stats.expiryAlerts}</div>
          <div className="stat-label">效期预警</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-title flex-between">
            <span>最近处方</span>
            <Link to="/rx" className="text-sm">查看全部 →</Link>
          </div>
          <table>
            <thead>
              <tr>
                <th>处方号</th>
                <th>患者</th>
                <th>金额</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {recentRx.map(rx => (
                <tr key={rx.id}>
                  <td><Link to={`/rx/${rx.id}`}>{rx.rx_no}</Link></td>
                  <td>{rx.patient_name}</td>
                  <td>¥{rx.total_amount?.toFixed(2)}</td>
                  <td>
                    <span className={`tag ${statusMap[rx.status]?.tag || 'tag-gray'}`}>
                      {statusMap[rx.status]?.label || rx.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentRx.length === 0 && (
                <tr><td colSpan={4} className="text-center text-muted">暂无处方</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-title flex-between">
            <span>预警提醒</span>
            <Link to="/alerts" className="text-sm">查看全部 →</Link>
          </div>
          {alerts.red_alerts.length > 0 && (
            <div className="alert-red" style={{ marginBottom: 8 }}>
              🔴 {alerts.red_alerts.length} 个药品效期不足 30 天
            </div>
          )}
          {alerts.orange_alerts.length > 0 && (
            <div className="alert-orange" style={{ marginBottom: 8 }}>
              🟠 {alerts.orange_alerts.length} 个药品库存低于下限
            </div>
          )}
          {alerts.red_alerts.length === 0 && alerts.orange_alerts.length === 0 && (
            <div className="text-center text-muted" style={{ padding: 20 }}>
              ✅ 当前无预警
            </div>
          )}
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {alerts.red_alerts.slice(0, 3).map(drug => (
              <div key={drug.id} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span className="text-red">🔴 {drug.product_name}</span>
                <span className="text-sm text-muted">效期临近</span>
              </div>
            ))}
            {alerts.orange_alerts.slice(0, 3).map(drug => (
              <div key={drug.id} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span className="text-orange">🟠 {drug.product_name}</span>
                <span className="text-sm text-muted">库存 {drug.total_stock}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
