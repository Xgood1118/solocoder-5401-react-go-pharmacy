import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import api from '../api'
import { useAuth } from '../context/AuthContext'

export default function DrugDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [drug, setDrug] = useState(null)
  const [batches, setBatches] = useState([])
  const [tempRecords, setTempRecords] = useState([])
  const [showStockInModal, setShowStockInModal] = useState(false)
  const [showTempModal, setShowTempModal] = useState(false)
  const { hasRole } = useAuth()

  useEffect(() => {
    loadDrug()
    loadBatches()
    loadTempRecords()
  }, [id])

  const loadDrug = async () => {
    try {
      const res = await api.get(`/drugs/${id}`)
      setDrug(res.data)
    } catch (e) {
      console.error('加载药品失败', e)
    }
  }

  const loadBatches = async () => {
    try {
      const res = await api.get(`/drugs/${id}/batches`)
      setBatches(res.data)
    } catch (e) {
      console.error('加载批次失败', e)
    }
  }

  const loadTempRecords = async () => {
    try {
      const res = await api.get(`/drugs/${id}/temperature`)
      setTempRecords(res.data)
    } catch (e) {
      console.error('加载温度记录失败', e)
    }
  }

  if (!drug) {
    return (
      <Layout title="药品详情">
        <div className="text-center" style={{ padding: 100 }}>加载中...</div>
      </Layout>
    )
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('zh-CN')
  }

  const isExpiringSoon = (expiryDate) => {
    const days = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
    return days <= 30
  }

  return (
    <Layout title="药品详情">
      <div className="card">
        <div className="flex-between mb-16">
          <h2 className="card-title" style={{ marginBottom: 0 }}>{drug.product_name}</h2>
          <div className="flex gap-8">
            <button className="btn btn-default" onClick={() => navigate('/drugs')}>返回列表</button>
            {hasRole('manager', 'pharmacist') && (
              <button className="btn btn-primary" onClick={() => setShowStockInModal(true)}>
                入库
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
          <div>
            <p className="text-muted text-sm mb-8">通用名</p>
            <p className="font-bold">{drug.generic_name}</p>
          </div>
          <div>
            <p className="text-muted text-sm mb-8">英文名</p>
            <p>{drug.generic_name_en || '-'}</p>
          </div>
          <div>
            <p className="text-muted text-sm mb-8">规格</p>
            <p>{drug.specification}</p>
          </div>
          <div>
            <p className="text-muted text-sm mb-8">生产厂家</p>
            <p>{drug.manufacturer || '-'}</p>
          </div>
          <div>
            <p className="text-muted text-sm mb-8">总库存</p>
            <p className={drug.total_stock < drug.stock_min ? 'text-orange font-bold' : 'font-bold'}>
              {drug.total_stock}
            </p>
          </div>
          <div>
            <p className="text-muted text-sm mb-8">售价</p>
            <p className="font-bold">¥{drug.sale_price?.toFixed(2)}</p>
          </div>
          {hasRole('manager') && (
            <div>
              <p className="text-muted text-sm mb-8">成本价</p>
              <p>¥{drug.cost_price?.toFixed(2)}</p>
            </div>
          )}
          <div>
            <p className="text-muted text-sm mb-8">分类</p>
            <p>
              <span className={`tag ${drug.category === 'cold_chain' ? 'tag-blue' : 'tag-gray'}`}>
                {drug.category === 'cold_chain' ? '冷链药品' : '普通药品'}
              </span>
            </p>
          </div>
          <div>
            <p className="text-muted text-sm mb-8">处方药</p>
            <p>
              {drug.is_prescription ? (
                <span className="tag tag-red">处方药</span>
              ) : (
                <span className="tag tag-green">非处方药</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-muted text-sm mb-8">医保类型</p>
            <p>{drug.insurance_type || '-'}</p>
          </div>
          <div>
            <p className="text-muted text-sm mb-8">库存下限/上限</p>
            <p>{drug.stock_min} / {drug.stock_max}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">批次信息（先入先出）</h3>
        <table>
          <thead>
            <tr>
              <th>批号</th>
              <th>入库时间</th>
              <th>有效期</th>
              <th>库存</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {batches.map(batch => (
              <tr key={batch.id}>
                <td>{batch.batch_no}</td>
                <td>{formatDate(batch.in_date)}</td>
                <td className={isExpiringSoon(batch.expiry_date) ? 'text-red font-bold' : ''}>
                  {formatDate(batch.expiry_date)}
                  {isExpiringSoon(batch.expiry_date) && <span className="text-red text-sm"> （临期）</span>}
                </td>
                <td>{batch.stock}</td>
                <td>
                  {batch.locked ? (
                    <span className="tag tag-red" title={batch.locked_reason}>已锁定</span>
                  ) : (
                    <span className="tag tag-green">正常</span>
                  )}
                </td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr><td colSpan={5} className="text-center text-muted">暂无批次</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {drug.category === 'cold_chain' && (
        <div className="card">
          <div className="flex-between mb-12">
            <h3 className="card-title" style={{ marginBottom: 0 }}>温度记录</h3>
            {hasRole('pharmacist') && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowTempModal(true)}>
                记录温度
              </button>
            )}
          </div>
          <div style={{ height: 200, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>时间</th>
                  <th>温度 (°C)</th>
                  <th>传感器</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {tempRecords.map(rec => (
                  <tr key={rec.id}>
                    <td>{new Date(rec.record_time).toLocaleString('zh-CN')}</td>
                    <td className={rec.temp < 2 || rec.temp > 8 ? 'text-red font-bold' : ''}>
                      {rec.temp.toFixed(1)}
                    </td>
                    <td>{rec.sensor_id || '-'}</td>
                    <td>
                      {rec.temp < 2 || rec.temp > 8 ? (
                        <span className="tag tag-red">异常</span>
                      ) : (
                        <span className="tag tag-green">正常</span>
                      )}
                    </td>
                  </tr>
                ))}
                {tempRecords.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-muted">暂无温度记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted mt-8">
            冷链药品储存温度要求：2°C ~ 8°C
          </p>
        </div>
      )}

      {showStockInModal && (
        <StockInModal
          drugId={id}
          onClose={() => setShowStockInModal(false)}
          onSuccess={() => {
            setShowStockInModal(false)
            loadDrug()
            loadBatches()
          }}
        />
      )}

      {showTempModal && (
        <TempRecordModal
          drugId={id}
          onClose={() => setShowTempModal(false)}
          onSuccess={() => {
            setShowTempModal(false)
            loadTempRecords()
            loadDrug()
            loadBatches()
          }}
        />
      )}
    </Layout>
  )
}

function StockInModal({ drugId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    batch_no: '',
    expiry_date: '',
    quantity: 10,
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post(`/drugs/${drugId}/stock-in`, formData)
      onSuccess()
    } catch (err) {
      alert(err.response?.data?.error || '入库失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">药品入库</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">批号 *</label>
            <input
              type="text"
              name="batch_no"
              className="form-input"
              value={formData.batch_no}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">有效期 *</label>
            <input
              type="date"
              name="expiry_date"
              className="form-input"
              value={formData.expiry_date}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">入库数量 *</label>
            <input
              type="number"
              name="quantity"
              className="form-input"
              min="1"
              value={formData.quantity}
              onChange={handleChange}
              required
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-default" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '入库中...' : '确认入库'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TempRecordModal({ drugId, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    temp: 5.0,
    sensor_id: 'sensor-001',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'temp' ? parseFloat(value) : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/drugs/temperature/record', {
        drug_id: drugId,
        ...formData,
      })
      onSuccess()
    } catch (err) {
      alert(err.response?.data?.error || '记录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">记录温度</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">温度 (°C) *</label>
            <input
              type="number"
              step="0.1"
              name="temp"
              className="form-input"
              value={formData.temp}
              onChange={handleChange}
              required
            />
            <p className="text-sm text-muted mt-8">
              正常范围：2°C ~ 8°C</p>
          </div>
          <div className="form-group">
            <label className="form-label">传感器编号</label>
            <input
              type="text"
              name="sensor_id"
              className="form-input"
              value={formData.sensor_id}
              onChange={handleChange}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-default" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '记录中...' : '确认记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
