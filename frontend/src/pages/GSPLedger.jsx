import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import api from '../api'
import { useAuth } from '../context/AuthContext'

export default function GSPLedger() {
  const [ledger, setLedger] = useState([])
  const [archives, setArchives] = useState([])
  const [activeTab, setActiveTab] = useState('ledger')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(false)
  const { hasRole } = useAuth()

  useEffect(() => {
    if (activeTab === 'ledger') loadLedger()
    if (activeTab === 'archive') loadArchives()
  }, [activeTab, startDate, endDate])

  const loadLedger = async () => {
    try {
      let url = '/gsp/ledger'
      const params = []
      if (startDate) params.push(`start_date=${startDate}`)
      if (endDate) params.push(`end_date=${endDate}`)
      if (params.length) url += '?' + params.join('&')
      const res = await api.get(url)
      setLedger(res.data)
    } catch (e) {
      console.error('加载台账失败', e)
    }
  }

  const loadArchives = async () => {
    try {
      const res = await api.get('/gsp/archive/list')
      setArchives(res.data)
    } catch (e) {
      console.error('加载归档列表失败', e)
    }
  }

  const handleExport = async () => {
    setLoading(true)
    try {
      const res = await api.post('/gsp/ledger/export', { period })
      alert(`导出成功！共 ${res.data.record_count} 条记录\n归档文件：${res.data.archive_file}`)
      loadArchives()
    } catch (e) {
      alert(e.response?.data?.error || '导出失败')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { key: 'ledger', label: '进销存台账' },
    { key: 'archive', label: '历史归档' },
  ]

  const typeMap = {
    '入库': { tag: 'tag-green', icon: '↓' },
    '出库': { tag: 'tag-red', icon: '↑' },
    '调拨出库': { tag: 'tag-orange', icon: '→' },
    '调拨入库': { tag: 'tag-blue', icon: '←' },
    '盘点': { tag: 'tag-gray', icon: '◎' },
  }

  return (
    <Layout title="GSP 台账">
      <div className="card">
        <div className="flex-between mb-16">
          <div className="flex gap-8">
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
          {activeTab === 'archive' && hasRole('manager') && (
            <div className="flex gap-8">
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{ width: 150 }}
              />
              <button className="btn btn-success" onClick={handleExport} disabled={loading}>
                {loading ? '导出中...' : '导出月度台账'}
              </button>
            </div>
          )}
        </div>

        {activeTab === 'ledger' && (
          <div>
            <div className="flex gap-8 mb-16" style={{ alignItems: 'center' }}>
              <span className="text-muted">日期范围：</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-muted">至</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" onClick={loadLedger}>查询</button>
              <button
                className="btn btn-default btn-sm"
                onClick={() => {
                  setStartDate('')
                  setEndDate('')
                }}
              >
                重置
              </button>
            </div>

            <table>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>类型</th>
                  <th>药品名称</th>
                  <th>规格</th>
                  <th>批号</th>
                  <th>效期</th>
                  <th>数量</th>
                  <th>结存</th>
                  <th>操作员</th>
                  <th>处方号</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map(rec => (
                  <tr key={rec.id}>
                    <td>{rec.date}</td>
                    <td>
                      <span className={`tag ${typeMap[rec.type]?.tag || 'tag-gray'}`}>
                        {typeMap[rec.type]?.icon} {rec.type}
                      </span>
                    </td>
                    <td>{rec.drug_name}</td>
                    <td>{rec.specification}</td>
                    <td>{rec.batch_no || '-'}</td>
                    <td>{rec.expiry_date || '-'}</td>
                    <td className={rec.quantity > 0 ? 'text-green' : 'text-red'}>
                      {rec.quantity > 0 ? '+' : ''}{rec.quantity}
                    </td>
                    <td className="font-bold">{rec.balance}</td>
                    <td>{rec.operator}</td>
                    <td>{rec.rx_no || '-'}</td>
                    <td className="text-sm text-muted">{rec.remark || '-'}</td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-center text-muted">
                      暂无台账记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'archive' && (
          <div>
            <div className="alert-orange mb-16">
              📦 台账每月生成后自动 gzip 压缩归档，文件名按 YYYY-MM.gz 命名，存放于 disk/archive 目录。
            </div>
            <table>
              <thead>
                <tr>
                  <th>文件名</th>
                  <th>大小</th>
                  <th>修改时间</th>
                </tr>
              </thead>
              <tbody>
                {archives.map((arc, idx) => (
                  <tr key={idx}>
                    <td className="font-bold">{arc.name}</td>
                    <td>{(arc.size / 1024).toFixed(2)} KB</td>
                    <td className="text-muted text-sm">
                      {new Date(arc.modified).toLocaleString('zh-CN')}
                    </td>
                  </tr>
                ))}
                {archives.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">
                      暂无归档文件
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">GSP 认证说明</h3>
        <ul style={{ lineHeight: 2, paddingLeft: 20 }}>
          <li>台账记录包含：日期、类型、药品信息、批号、效期、数量、结存、操作员、处方号、备注</li>
          <li>台账 CSV 每月生成后自动 gzip 压缩归档到 disk/archive 子目录</li>
          <li>文件名按 YYYY-MM.gz 命名</li>
          <li>废方也会存档，存档 5 年备查</li>
          <li>冷链药品出入库带温度记录 JSON</li>
          <li>上游连锁接口对账差异记录包含：差异批次号、本店单号、上游回执单号</li>
        </ul>
      </div>
    </Layout>
  )
}
