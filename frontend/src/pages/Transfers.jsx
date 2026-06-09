import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import api from '../api'
import { useAuth } from '../context/AuthContext'

export default function Transfers() {
  const [transfers, setTransfers] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [reportPeriod, setReportPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [selectedTransfer, setSelectedTransfer] = useState(null)
  const { hasRole } = useAuth()

  useEffect(() => {
    loadTransfers()
  }, [activeTab])

  const loadTransfers = async () => {
    try {
      let url = '/transfers'
      if (activeTab !== 'all') {
        url += `?status=${activeTab}`
      }
      const res = await api.get(url)
      setTransfers(res.data)
    } catch (e) {
      console.error('加载调拨单失败', e)
    }
  }

  const loadReport = async () => {
    try {
      const res = await api.get(`/transfers/report/monthly?period=${reportPeriod}`)
      setReportData(res.data)
    } catch (e) {
      console.error('加载月报失败', e)
    }
  }

  const handleSignOut = async (id) => {
    if (!confirm('确认调出签字？')) return
    try {
      await api.post(`/transfers/${id}/sign-out`)
      loadTransfers()
    } catch (e) {
      alert(e.response?.data?.error || '操作失败')
    }
  }

  const handleSignIn = async (id) => {
    if (!confirm('确认调入签字？')) return
    try {
      await api.post(`/transfers/${id}/sign-in`)
      loadTransfers()
    } catch (e) {
      alert(e.response?.data?.error || '操作失败')
    }
  }

  const tabs = [
    { key: 'all', label: '全部' },
    { key: 'pending', label: '待调出' },
    { key: 'signed_out', label: '待调入' },
    { key: 'signed_in', label: '已完成' },
  ]

  const statusMap = {
    pending: { label: '待调出签字', tag: 'tag-orange' },
    signed_out: { label: '待调入签字', tag: 'tag-blue' },
    signed_in: { label: '已完成', tag: 'tag-green' },
    void: { label: '已作废', tag: 'tag-gray' },
  }

  return (
    <Layout title="跨店调拨">
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
          <div className="flex gap-8">
            {hasRole('manager') && (
              <button
                className="btn btn-default"
                onClick={() => {
                  setShowReport(true)
                  loadReport()
                }}
              >
                📊 月度报表
              </button>
            )}
            {hasRole('manager', 'pharmacist') && (
              <button className="btn btn-success" onClick={() => setShowModal(true)}>
                + 新建调拨
              </button>
            )}
          </div>
        </div>

        <div className="alert-orange mb-16">
          📋 跨店调拨需调出方和调入方双签确认，调拨单据在两边系统里都要留痕。
        </div>

        <table>
          <thead>
            <tr>
              <th>调拨单号</th>
              <th>调出门店</th>
              <th>调入门店</th>
              <th>药品数量</th>
              <th>状态</th>
              <th>调出签字</th>
              <th>调入签字</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map(t => (
              <tr key={t.id}>
                <td className="font-bold">{t.transfer_no}</td>
                <td>{t.from_store_name || t.from_store_id}</td>
                <td>{t.to_store_name || t.to_store_id}</td>
                <td>{t.items?.length} 种</td>
                <td>
                  <span className={`tag ${statusMap[t.status]?.tag || 'tag-gray'}`}>
                    {statusMap[t.status]?.label || t.status}
                  </span>
                </td>
                <td>
                  {t.sign_out_operator_name || '-'}
                  {t.sign_out_time && (
                    <div className="text-xs text-muted">
                      {new Date(t.sign_out_time).toLocaleDateString('zh-CN')}
                    </div>
                  )}
                </td>
                <td>
                  {t.sign_in_operator_name || '-'}
                  {t.sign_in_time && (
                    <div className="text-xs text-muted">
                      {new Date(t.sign_in_time).toLocaleDateString('zh-CN')}
                    </div>
                  )}
                </td>
                <td className="text-sm text-muted">
                  {new Date(t.created_at).toLocaleDateString('zh-CN')}
                </td>
                <td>
                  <div className="flex gap-8">
                    <button
                      className="btn btn-default btn-sm"
                      onClick={() => setSelectedTransfer(t)}
                    >
                      详情
                    </button>
                    {t.status === 'pending' && hasRole('pharmacist') && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleSignOut(t.id)}
                      >
                        调出签字
                      </button>
                    )}
                    {t.status === 'signed_out' && hasRole('pharmacist') && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleSignIn(t.id)}
                      >
                        调入签字
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {transfers.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-muted">
                  暂无调拨单
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedTransfer && (
        <div className="modal-overlay" onClick={() => setSelectedTransfer(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">调拨单详情 - {selectedTransfer.transfer_no}</span>
              <button className="modal-close" onClick={() => setSelectedTransfer(null)}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <p className="text-muted text-sm mb-8">调出门店</p>
                <p className="font-bold">{selectedTransfer.from_store_name || selectedTransfer.from_store_id}</p>
              </div>
              <div>
                <p className="text-muted text-sm mb-8">调入门店</p>
                <p className="font-bold">{selectedTransfer.to_store_name || selectedTransfer.to_store_id}</p>
              </div>
              <div>
                <p className="text-muted text-sm mb-8">状态</p>
                <p>
                  <span className={`tag ${statusMap[selectedTransfer.status]?.tag}`}>
                    {statusMap[selectedTransfer.status]?.label}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-muted text-sm mb-8">创建时间</p>
                <p>{new Date(selectedTransfer.created_at).toLocaleString('zh-CN')}</p>
              </div>
            </div>

            <h4 style={{ marginBottom: 12 }}>药品明细</h4>
            <table>
              <thead>
                <tr>
                  <th>药品名称</th>
                  <th>规格</th>
                  <th>批号</th>
                  <th>数量</th>
                </tr>
              </thead>
              <tbody>
                {selectedTransfer.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.drug_name}</td>
                    <td>{item.specification}</td>
                    <td>{item.batch_no || '-'}</td>
                    <td>{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setSelectedTransfer(null)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <CreateTransferModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            loadTransfers()
          }}
        />
      )}

      {showReport && (
        <div className="modal-overlay" onClick={() => setShowReport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ minWidth: 700 }}>
            <div className="modal-header">
              <span className="modal-title">跨店调拨月度报表</span>
              <button className="modal-close" onClick={() => setShowReport(false)}>×</button>
            </div>
            <div className="flex gap-8 mb-16" style={{ alignItems: 'center' }}>
              <span>月份：</span>
              <input
                type="month"
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" onClick={loadReport}>查询</button>
            </div>
            {reportData && (
              <div>
                <div className="card" style={{ background: '#fafafa', marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                    <div>
                      <p className="text-muted text-sm mb-8">调拨明细数</p>
                      <p className="font-bold text-lg">{reportData.transfer_count}</p>
                    </div>
                    <div>
                      <p className="text-muted text-sm mb-8">药品总数量</p>
                      <p className="font-bold text-lg text-orange">{reportData.total_quantity}</p>
                    </div>
                    <div>
                      <p className="text-muted text-sm mb-8">统计周期</p>
                      <p className="font-bold">{reportData.period}</p>
                    </div>
                  </div>
                </div>
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>调拨单号</th>
                        <th>调出</th>
                        <th>调入</th>
                        <th>药品</th>
                        <th>数量</th>
                        <th>完成时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.details?.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.transfer_no}</td>
                          <td>{item.from_store}</td>
                          <td>{item.to_store}</td>
                          <td>{item.drug_name}</td>
                          <td>{item.quantity}</td>
                          <td className="text-sm text-muted">
                            {item.sign_in_time ? new Date(item.sign_in_time).toLocaleDateString('zh-CN') : '-'}
                          </td>
                        </tr>
                      ))}
                      {reportData.details?.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center text-muted">
                            本月暂无调拨记录
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowReport(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

function CreateTransferModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    from_store_id: 'store-001',
    from_store_name: '中心店',
    to_store_id: '',
    to_store_name: '',
  })
  const [items, setItems] = useState([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchKeyword.trim()) return
    try {
      const res = await api.get('/drugs/search?keyword=' + encodeURIComponent(searchKeyword))
      setSearchResults(res.data)
    } catch (e) {
      console.error('搜索失败', e)
    }
  }

  const addItem = (drug) => {
    const batches = []
    const existing = items.find(i => i.drug_id === drug.id)
    if (existing) {
      setItems(prev =>
        prev.map(i =>
          i.drug_id === drug.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      )
    } else {
      setItems(prev => [
        ...prev,
        {
          drug_id: drug.id,
          drug_name: drug.product_name,
          specification: drug.specification,
          quantity: 1,
        },
      ])
    }
    setSearchKeyword('')
    setSearchResults([])
  }

  const updateQuantity = (drugId, qty) => {
    setItems(prev =>
      prev.map(i =>
        i.drug_id === drugId ? { ...i, quantity: Math.max(1, parseInt(qty) || 1) } : i
      )
    )
  }

  const removeItem = (drugId) => {
    setItems(prev => prev.filter(i => i.drug_id !== drugId))
  }

  const handleSubmit = async () => {
    if (items.length === 0) {
      alert('请至少添加一种药品')
      return
    }
    if (!formData.to_store_id) {
      alert('请填写调入门店')
      return
    }
    setLoading(true)
    try {
      await api.post('/transfers', {
        ...formData,
        items: items.map(i => ({ drug_id: i.drug_id, quantity: i.quantity })),
      })
      onSuccess()
    } catch (e) {
      alert(e.response?.data?.error || '创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ minWidth: 600 }}>
        <div className="modal-header">
          <span className="modal-title">新建调拨单</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div className="form-group">
            <label className="form-label">调出门店 *</label>
            <input
              type="text"
              className="form-input"
              value={formData.from_store_name}
              onChange={(e) => setFormData(prev => ({ ...prev, from_store_name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">调入门店 *</label>
            <input
              type="text"
              className="form-input"
              value={formData.to_store_name}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                to_store_name: e.target.value,
                to_store_id: e.target.value,
              }))}
              placeholder="如：二分店"
            />
          </div>
        </div>

        <h4 style={{ marginBottom: 12 }}>药品明细</h4>
        <form onSubmit={handleSearch} className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="搜索药品添加..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">搜索</button>
        </form>

        {searchResults.length > 0 && (
          <div style={{ margin: '8px 0', maxHeight: 150, overflowY: 'auto', background: '#fafafa', padding: 8, borderRadius: 4 }}>
            {searchResults.map(drug => (
              <div
                key={drug.id}
                className="flex-between"
                style={{ padding: '6px 0', cursor: 'pointer' }}
                onClick={() => addItem(drug)}
              >
                <span>{drug.product_name} - {drug.specification}</span>
                <button type="button" className="btn btn-success btn-sm" onClick={(e) => { e.stopPropagation(); addItem(drug) }}>
                  添加
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>药品名称</th>
                <th>规格</th>
                <th>数量</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.drug_id}>
                  <td>{item.drug_name}</td>
                  <td>{item.specification}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.drug_id, e.target.value)}
                      style={{ width: 80 }}
                    />
                  </td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removeItem(item.drug_id)}
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted">
                    请搜索添加药品
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="modal-footer">
          <button className="btn btn-default" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || items.length === 0}>
            {loading ? '创建中...' : '创建调拨单'}
          </button>
        </div>
      </div>
    </div>
  )
}
