import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import api from '../api'
import { useAuth } from '../context/AuthContext'

export default function RxList() {
  const [rxes, setRxes] = useState([])
  const [status, setStatus] = useState('')
  const [myOnly, setMyOnly] = useState(false)
  const [pendingHandovers, setPendingHandovers] = useState([])
  const navigate = useNavigate()
  const { hasRole } = useAuth()

  useEffect(() => {
    loadRx()
    loadPendingHandovers()
  }, [status, myOnly])

  const loadRx = async () => {
    try {
      let url = '/rx'
      const params = []
      if (status) params.push(`status=${status}`)
      if (myOnly) params.push('my_only=true')
      if (params.length) url += '?' + params.join('&')
      const res = await api.get(url)
      setRxes(res.data)
    } catch (e) {
      console.error('加载处方失败', e)
    }
  }

  const loadPendingHandovers = async () => {
    try {
      const res = await api.get('/rx/handover/pending')
      setPendingHandovers(res.data)
    } catch (e) {
      console.error('加载待交接处方失败', e)
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

  const statusTabs = [
    { value: '', label: '全部' },
    { value: 'created', label: '待核方' },
    { value: 'verified', label: '待发药' },
    { value: 'dispensed', label: '待医保' },
    { value: 'completed', label: '已完成' },
    { value: 'void', label: '已作废' },
  ]

  return (
    <Layout title="处方管理">
      {pendingHandovers.length > 0 && (
        <div className="alert-orange mb-16">
          🔔 您有 {pendingHandovers.length} 个待接收的处方交接，请及时处理。
          <button
            className="btn btn-warning btn-sm"
            style={{ marginLeft: 12 }}
            onClick={() => {
              if (pendingHandovers.length > 0) {
                navigate(`/rx/${pendingHandovers[0].id}`)
              }
            }}
          >
            去接收
          </button>
        </div>
      )}

      <div className="card">
        <div className="flex-between mb-16">
          <h2 className="card-title" style={{ marginBottom: 0 }}>处方列表</h2>
          <div className="flex gap-12">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={myOnly}
                onChange={(e) => setMyOnly(e.target.checked)}
              />
              只看我的
            </label>
            {hasRole('pharmacist') && (
              <button className="btn btn-success" onClick={() => navigate('/rx/new')}>
                + 新建处方
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-8 mb-16">
          {statusTabs.map(tab => (
            <button
              key={tab.value}
              className={`btn ${status === tab.value ? 'btn-primary' : 'btn-default'} btn-sm`}
              onClick={() => setStatus(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <table>
          <thead>
            <tr>
              <th>处方号</th>
              <th>患者姓名</th>
              <th>总金额</th>
              <th>医保支付</th>
              <th>自付</th>
              <th>状态</th>
              <th>当前持方人</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {rxes.map(rx => (
              <tr key={rx.id}>
                <td><Link to={`/rx/${rx.id}`}>{rx.rx_no}</Link></td>
                <td>{rx.patient_name}</td>
                <td>¥{rx.total_amount?.toFixed(2)}</td>
                <td>¥{rx.insurance_amount?.toFixed(2)}</td>
                <td>¥{rx.self_pay_amount?.toFixed(2)}</td>
                <td>
                  <span className={`tag ${statusMap[rx.status]?.tag || 'tag-gray'}`}>
                    {statusMap[rx.status]?.label || rx.status}
                  </span>
                  {rx.handover_pending && (
                    <span className="tag tag-orange" style={{ marginLeft: 4 }}>交接中</span>
                  )}
                </td>
                <td>{rx.current_holder_name}</td>
                <td className="text-sm text-muted">
                  {new Date(rx.created_at).toLocaleString('zh-CN')}
                </td>
                <td>
                  <Link to={`/rx/${rx.id}`} className="text-sm">查看</Link>
                </td>
              </tr>
            ))}
            {rxes.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-muted">
                  暂无处方
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
