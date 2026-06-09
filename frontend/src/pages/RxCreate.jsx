import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import api from '../api'

export default function RxCreate() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_id_card: '',
    doctor_name: '',
    hospital: '',
    qr_code: '',
  })
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedDrugs, setSelectedDrugs] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchKeyword.trim()) return
    setSearchLoading(true)
    try {
      const res = await api.get('/drugs/search?keyword=' + encodeURIComponent(searchKeyword))
      setSearchResults(res.data)
    } catch (e) {
      console.error('搜索失败', e)
    } finally {
      setSearchLoading(false)
    }
  }

  const addDrug = (drug) => {
    const existing = selectedDrugs.find(d => d.drug_id === drug.id)
    if (existing) {
      setSelectedDrugs(prev =>
        prev.map(d =>
          d.drug_id === drug.id
            ? { ...d, quantity: d.quantity + 1, amount: (d.quantity + 1) * d.unit_price }
            : d
        )
      )
    } else {
      setSelectedDrugs(prev => [
        ...prev,
        {
          drug_id: drug.id,
          drug_name: drug.product_name,
          specification: drug.specification,
          quantity: 1,
          unit_price: drug.sale_price,
          amount: drug.sale_price,
          is_prescription: drug.is_prescription,
        },
      ])
    }
    setSearchKeyword('')
    setSearchResults([])
  }

  const updateQuantity = (drugId, quantity) => {
    const qty = Math.max(1, parseInt(quantity) || 1)
    setSelectedDrugs(prev =>
      prev.map(d =>
        d.drug_id === drugId
          ? { ...d, quantity: qty, amount: qty * d.unit_price }
          : d
      )
    )
  }

  const removeDrug = (drugId) => {
    setSelectedDrugs(prev => prev.filter(d => d.drug_id !== drugId))
  }

  const totalAmount = selectedDrugs.reduce((sum, d) => sum + d.amount, 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedDrugs.length === 0) {
      alert('请至少添加一种药品')
      return
    }
    if (!formData.patient_id_card || formData.patient_id_card.length < 15) {
      alert('请填写正确的患者身份证号')
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/rx', {
        ...formData,
        items: selectedDrugs.map(d => ({ drug_id: d.drug_id, quantity: d.quantity })),
      })
      navigate(`/rx/${res.data.id}`)
    } catch (err) {
      alert(err.response?.data?.error || '创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout title="新建处方">
      <div className="card">
        <div className="flex-between mb-16">
          <h2 className="card-title" style={{ marginBottom: 0 }}>新建处方</h2>
          <button className="btn btn-default" onClick={() => navigate('/rx')}>返回</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ background: '#fafafa' }}>
            <h3 className="card-title">患者信息</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">患者姓名 *</label>
                <input
                  type="text"
                  name="patient_name"
                  className="form-input"
                  value={formData.patient_name}
                  onChange={handleFormChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">身份证号 *</label>
                <input
                  type="text"
                  name="patient_id_card"
                  className="form-input"
                  value={formData.patient_id_card}
                  onChange={handleFormChange}
                  placeholder="处方药需填写身份证号做合规留痕"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">医生姓名</label>
                <input
                  type="text"
                  name="doctor_name"
                  className="form-input"
                  value={formData.doctor_name}
                  onChange={handleFormChange}
                />
              </div>
              <div className="form-group">
                <label className="form-label">医院</label>
                <input
                  type="text"
                  name="hospital"
                  className="form-input"
                  value={formData.hospital}
                  onChange={handleFormChange}
                />
              </div>
            </div>
          </div>

          <div className="card" style={{ background: '#fafafa' }}>
            <h3 className="card-title">药品明细</h3>

            <form onSubmit={handleSearch} className="search-bar">
              <input
                type="text"
                className="search-input"
                placeholder="搜索药品（商品名/通用名/英文名）"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={searchLoading}>
                {searchLoading ? '搜索中...' : '搜索'}
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="card" style={{ margin: '12px 0', maxHeight: 200, overflowY: 'auto' }}>
                {searchResults.map(drug => (
                  <div
                    key={drug.id}
                    className="flex-between"
                    style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                    onClick={() => addDrug(drug)}
                  >
                    <div>
                      <span className="font-bold">{drug.product_name}</span>
                      <span className="text-muted text-sm" style={{ marginLeft: 8 }}>
                        {drug.specification}
                      </span>
                      {drug.is_prescription && (
                        <span className="tag tag-red" style={{ marginLeft: 8 }}>处方</span>
                      )}
                    </div>
                    <div>
                      <span className="text-orange font-bold">¥{drug.sale_price.toFixed(2)}</span>
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        style={{ marginLeft: 12 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          addDrug(drug)
                        }}
                      >
                        添加
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <table>
              <thead>
                <tr>
                  <th>药品名称</th>
                  <th>规格</th>
                  <th>数量</th>
                  <th>单价</th>
                  <th>金额</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {selectedDrugs.map(drug => (
                  <tr key={drug.drug_id}>
                    <td>
                      {drug.drug_name}
                      {drug.is_prescription && (
                        <span className="tag tag-red" style={{ marginLeft: 8 }}>处方</span>
                      )}
                    </td>
                    <td>{drug.specification}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={drug.quantity}
                        onChange={(e) => updateQuantity(drug.drug_id, e.target.value)}
                        style={{ width: 80 }}
                      />
                    </td>
                    <td>¥{drug.unit_price.toFixed(2)}</td>
                    <td>¥{drug.amount.toFixed(2)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeDrug(drug.drug_id)}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
                {selectedDrugs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted">
                      暂无药品，请搜索添加
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="font-bold text-right">合计：</td>
                  <td className="font-bold text-lg text-orange">¥{totalAmount.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex" style={{ justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="btn btn-default" onClick={() => navigate('/rx')}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || selectedDrugs.length === 0}>
              {loading ? '创建中...' : '创建处方'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
