import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import api from '../api'
import { useAuth } from '../context/AuthContext'

export default function DrugList() {
  const [drugs, setDrugs] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [showModal, setShowModal] = useState(false)

  const { hasRole } = useAuth()

  useEffect(() => {
    loadDrugs()
  }, [])

  const loadDrugs = async () => {
    try {
      const res = keyword
        ? await api.get('/drugs/search?keyword=' + encodeURIComponent(keyword))
        : await api.get('/drugs')
      setDrugs(res.data)
    } catch (e) {
      console.error('加载药品失败', e)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    loadDrugs()
  }

  return (
    <Layout title="药品管理">
      <div className="card">
        <div className="flex-between mb-16">
          <h2 className="card-title" style={{ marginBottom: 0 }}>药品列表</h2>
          <div className="flex gap-12">
            <form onSubmit={handleSearch} className="search-bar" style={{ marginBottom: 0 }}>
              <input
                type="text"
                placeholder="搜索商品名/通用名/英文名..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                style={{ width: 300 }}
              />
              <button type="submit" className="btn btn-primary">搜索</button>
            </form>
            {hasRole('manager', 'pharmacist') && (
              <button className="btn btn-success" onClick={() => setShowModal(true)}>
                + 新增药品
              </button>
            )}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>药品名称</th>
              <th>通用名</th>
              <th>规格</th>
              <th>生产厂家</th>
              <th>库存</th>
              <th>售价</th>
              {hasRole('manager') && <th>成本价</th>}
              <th>分类</th>
              <th>处方药</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {drugs.map(drug => (
              <tr key={drug.id}>
                <td>
                  <Link to={`/drugs/${drug.id}`}>{drug.product_name}</Link>
                </td>
                <td>{drug.generic_name}</td>
                <td>{drug.specification}</td>
                <td>{drug.manufacturer}</td>
                <td>
                  {drug.total_stock < drug.stock_min ? (
                    <span className="text-orange font-bold">{drug.total_stock}</span>
                  ) : (
                    drug.total_stock
                  )}
                </td>
                <td>¥{drug.sale_price?.toFixed(2)}</td>
                {hasRole('manager') && <td>¥{drug.cost_price?.toFixed(2)}</td>}
                <td>
                  <span className={`tag ${drug.category === 'cold_chain' ? 'tag-blue' : 'tag-gray'}`}>
                    {drug.category === 'cold_chain' ? '冷链' : '普通'}
                  </span>
                </td>
                <td>
                  {drug.is_prescription ? (
                    <span className="tag tag-red">处方药</span>
                  ) : (
                    <span className="tag tag-green">非处方</span>
                  )}
                </td>
                <td>
                  <Link to={`/drugs/${drug.id}`} className="text-sm">详情</Link>
                </td>
              </tr>
            ))}
            {drugs.length === 0 && (
              <tr>
                <td colSpan={hasRole('manager') ? 10 : 9} className="text-center text-muted">
                  暂无药品
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <CreateDrugModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            loadDrugs()
          }}
        />
      )}
    </Layout>
  )
}

function CreateDrugModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    product_name: '',
    generic_name: '',
    generic_name_en: '',
    specification: '',
    manufacturer: '',
    is_prescription: false,
    category: 'normal',
    stock_min: 10,
    stock_max: 100,
    cost_price: 0,
    sale_price: 0,
    insurance_type: '丙类',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/drugs', formData)
      onSuccess()
    } catch (err) {
      alert(err.response?.data?.error || '创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">新增药品</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">商品名 *</label>
            <input
              type="text"
              name="product_name"
              className="form-input"
              value={formData.product_name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">通用名 *</label>
            <input
              type="text"
              name="generic_name"
              className="form-input"
              value={formData.generic_name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">英文名</label>
            <input
              type="text"
              name="generic_name_en"
              className="form-input"
              value={formData.generic_name_en}
              onChange={handleChange}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">规格 *</label>
              <input
                type="text"
                name="specification"
                className="form-input"
                value={formData.specification}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">生产厂家</label>
              <input
                type="text"
                name="manufacturer"
                className="form-input"
                value={formData.manufacturer}
                onChange={handleChange}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">售价 *</label>
              <input
                type="number"
                name="sale_price"
                className="form-input"
                value={formData.sale_price}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">分类</label>
              <select
                name="category"
                className="form-input"
                value={formData.category}
                onChange={handleChange}
              >
                <option value="normal">普通药品</option>
                <option value="cold_chain">冷链药品</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">库存下限</label>
              <input
                type="number"
                name="stock_min"
                className="form-input"
                value={formData.stock_min}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">库存上限</label>
              <input
                type="number"
                name="stock_max"
                className="form-input"
                value={formData.stock_max}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                name="is_prescription"
                checked={formData.is_prescription}
                onChange={handleChange}
              />
              处方药
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-default" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
