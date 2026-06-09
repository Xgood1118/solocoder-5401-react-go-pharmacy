import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import api from '../api'

export default function Alerts() {
  const [alerts, setAlerts] = useState({ red_alerts: [], orange_alerts: [] })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    try {
      const res = await api.get('/drugs/alerts/list')
      setAlerts(res.data)
    } catch (e) {
      console.error('加载预警失败', e)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { key: 'all', label: '全部预警' },
    { key: 'expiry', label: '效期预警（红色）' },
    { key: 'stock', label: '库存预警（橙色）' },
  ]

  const getDisplayedAlerts = () => {
    if (activeTab === 'expiry') return alerts.red_alerts
    if (activeTab === 'stock') return alerts.orange_alerts
    return [...alerts.red_alerts, ...alerts.orange_alerts]
  }

  const getAlertType = (drug) => {
    if (alerts.red_alerts.some(d => d.id === drug.id)) return 'expiry'
    if (alerts.orange_alerts.some(d => d.id === drug.id)) return 'stock'
    return 'normal'
  }

  return (
    <Layout title="预警中心">
      <div className="card">
        <div className="flex-between mb-16">
          <h2 className="card-title" style={{ marginBottom: 0 }}>预警中心</h2>
          <button className="btn btn-default" onClick={loadAlerts}>刷新</button>
        </div>

        <div className="alert-red mb-16">
          🔴 效期预警：{alerts.red_alerts.length} 个药品效期不足 30 天
        </div>
        <div className="alert-orange mb-16">
          🟠 库存预警：{alerts.orange_alerts.length} 个药品库存低于下限
        </div>

        <div className="flex gap-8 mb-16">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`btn ${activeTab === tab.key ? 'btn-primary' : 'btn-default'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center" style={{ padding: 40 }}>加载中...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>预警类型</th>
                <th>药品名称</th>
                <th>通用名</th>
                <th>规格</th>
                <th>当前库存</th>
                <th>库存下限</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {getDisplayedAlerts().map(drug => {
                const type = getAlertType(drug)
                return (
                  <tr key={drug.id}>
                    <td>
                      {type === 'expiry' ? (
                        <span className="tag tag-red">效期预警</span>
                      ) : (
                        <span className="tag tag-orange">库存预警</span>
                      )}
                    </td>
                    <td className="font-bold">{drug.product_name}</td>
                    <td>{drug.generic_name}</td>
                    <td>{drug.specification}</td>
                    <td className={type === 'stock' ? 'text-orange font-bold' : ''}>
                      {drug.total_stock}
                    </td>
                    <td>{drug.stock_min}</td>
                    <td>
                      <Link to={`/drugs/${drug.id}`} className="text-sm">查看详情</Link>
                    </td>
                  </tr>
                )
              })}
              {getDisplayedAlerts().length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted">
                    ✅ 当前无预警
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">预警规则说明</h3>
        <ul style={{ lineHeight: 2, paddingLeft: 20 }}>
          <li>
            <span className="tag tag-red">红色预警</span>：药品有效期不足 30 天
          </li>
          <li>
            <span className="tag tag-orange">橙色预警</span>：药品库存低于库存下限（按通用名去重）
          </li>
          <li>预警信息在收银台小屏幕和店长手机端均可查看</li>
          <li>同通用名不同规格的药品库存预警会合并展示，避免预警轰炸</li>
        </ul>
      </div>
    </Layout>
  )
}
