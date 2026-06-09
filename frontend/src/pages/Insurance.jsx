import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import api from '../api'
import { useAuth } from '../context/AuthContext'

export default function Insurance() {
  const [settlements, setSettlements] = useState([])
  const [discrepancies, setDiscrepancies] = useState([])
  const [catalog, setCatalog] = useState([])
  const [activeTab, setActiveTab] = useState('settlements')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showReconcileModal, setShowReconcileModal] = useState(false)
  const [selectedSettlement, setSelectedSettlement] = useState(null)
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [receivedAmount, setReceivedAmount] = useState(0)
  const [loading, setLoading] = useState(false)
  const { hasRole } = useAuth()

  useEffect(() => {
    if (activeTab === 'settlements') loadSettlements()
    if (activeTab === 'discrepancies') loadDiscrepancies()
    if (activeTab === 'catalog') loadCatalog()
  }, [activeTab])

  const loadSettlements = async () => {
    try {
      const res = await api.get('/insurance/settlements')
      setSettlements(res.data)
    } catch (e) {
      console.error('加载结算单失败', e)
    }
  }

  const loadDiscrepancies = async () => {
    try {
      const res = await api.get('/insurance/discrepancies')
      setDiscrepancies(res.data)
    } catch (e) {
      console.error('加载差异记录失败', e)
    }
  }

  const loadCatalog = async () => {
    try {
      const res = await api.get('/insurance/catalog')
      setCatalog(res.data)
    } catch (e) {
      console.error('加载医保目录失败', e)
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    try {
      await api.post('/insurance/settlements/monthly', { period })
      setShowGenerateModal(false)
      loadSettlements()
    } catch (e) {
      alert(e.response?.data?.error || '生成失败')
    } finally {
      setLoading(false)
    }
  }

  const handleReconcile = async () => {
    setLoading(true)
    try {
      await api.post('/insurance/reconcile', {
        settlement_id: selectedSettlement.id,
        received_amount: receivedAmount,
      })
      setShowReconcileModal(false)
      loadSettlements()
      loadDiscrepancies()
    } catch (e) {
      alert(e.response?.data?.error || '对账失败')
    } finally {
      setLoading(false)
    }
  }

  const statusMap = {
    pending: { label: '待对账', tag: 'tag-orange' },
    matched: { label: '已对账', tag: 'tag-green' },
    discrepancy: { label: '有差异', tag: 'tag-red' },
  }

  const tabs = [
    { key: 'settlements', label: '结算单' },
    { key: 'discrepancies', label: '差异记录' },
    { key: 'catalog', label: '医保目录' },
  ]

  return (
    <Layout title="医保结算">
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
          {activeTab === 'settlements' && hasRole('manager', 'cashier') && (
            <button className="btn btn-success" onClick={() => setShowGenerateModal(true)}>
              生成月度结算
            </button>
          )}
        </div>

        {activeTab === 'settlements' && (
          <table>
            <thead>
              <tr>
                <th>周期</th>
                <th>处方数</th>
                <th>总金额</th>
                <th>医保支付</th>
                <th>自付</th>
                <th>回款金额</th>
                <th>差额</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {settlements.map(s => (
                <tr key={s.id}>
                  <td className="font-bold">{s.period}</td>
                  <td>{s.rx_count}</td>
                  <td>¥{s.total_amount?.toFixed(2)}</td>
                  <td>¥{s.insurance_amount?.toFixed(2)}</td>
                  <td>¥{s.self_pay_amount?.toFixed(2)}</td>
                  <td>
                    {s.received_amount > 0
                      ? `¥${s.received_amount?.toFixed(2)}`
                      : '-'}
                  </td>
                  <td className={s.diff_amount !== 0 ? 'text-red font-bold' : ''}>
                    {s.diff_amount !== 0 ? `¥${s.diff_amount?.toFixed(2)}` : '-'}
                  </td>
                  <td>
                    <span className={`tag ${statusMap[s.status]?.tag || 'tag-gray'}`}>
                      {statusMap[s.status]?.label || s.status}
                    </span>
                  </td>
                  <td>
                    {hasRole('manager') && s.status === 'pending' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          setSelectedSettlement(s)
                          setReceivedAmount(s.insurance_amount)
                          setShowReconcileModal(true)
                        }}
                      >
                        对账
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {settlements.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-muted">
                    暂无结算单
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'discrepancies' && (
          <div>
            {discrepancies.length > 0 && discrepancies.some(d => d.diff_amount < 0) && (
              <div className="alert-red mb-16">
                ⚠️ 存在 {discrepancies.filter(d => d.diff_amount < 0).length} 条负向差异记录，请注意核查
              </div>
            )}
            <table>
              <thead>
                <tr>
                  <th>处方号</th>
                  <th>本店单号</th>
                  <th>上游回执号</th>
                  <th>批次号</th>
                  <th>期望金额</th>
                  <th>实际金额</th>
                  <th>差额</th>
                  <th>原因</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {discrepancies.map(d => (
                  <tr key={d.id}>
                    <td>{d.rx_no}</td>
                    <td>{d.store_order_no}</td>
                    <td>{d.upstream_receipt_no}</td>
                    <td>{d.batch_no || '-'}</td>
                    <td>¥{d.expected_amount?.toFixed(2)}</td>
                    <td>¥{d.actual_amount?.toFixed(2)}</td>
                    <td className={d.diff_amount < 0 ? 'text-red font-bold' : 'text-orange'}>
                      ¥{d.diff_amount?.toFixed(2)}
                    </td>
                    <td>{d.reason || '-'}</td>
                    <td className="text-sm text-muted">
                      {new Date(d.created_at).toLocaleDateString('zh-CN')}
                    </td>
                  </tr>
                ))}
                {discrepancies.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center text-muted">
                      暂无差异记录
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'catalog' && (
          <table>
            <thead>
              <tr>
                <th>药品名称</th>
                <th>通用名</th>
                <th>分类</th>
                <th>自付比例</th>
                <th>最高限价</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map(item => (
                <tr key={item.id}>
                  <td>{item.drug_name}</td>
                  <td>{item.generic_name}</td>
                  <td>
                    <span className={`tag ${
                      item.category === '甲类' ? 'tag-green' :
                      item.category === '乙类' ? 'tag-blue' : 'tag-gray'
                    }`}>
                      {item.category}
                    </span>
                  </td>
                  <td>{(item.self_pay_ratio * 100).toFixed(0)}%</td>
                  <td>¥{item.max_price?.toFixed(2)}</td>
                </tr>
              ))}
              {catalog.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted">
                    暂无医保目录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showGenerateModal && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">生成月度结算单</span>
              <button className="modal-close" onClick={() => setShowGenerateModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">结算周期</label>
              <input
                type="month"
                className="form-input"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted">
              将生成指定月份的医保结算单，包含该月所有已上传医保的处方。
            </p>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowGenerateModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? '生成中...' : '确认生成'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReconcileModal && selectedSettlement && (
        <div className="modal-overlay" onClick={() => setShowReconcileModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">医保对账</span>
              <button className="modal-close" onClick={() => setShowReconcileModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">结算周期</label>
              <p className="font-bold">{selectedSettlement.period}</p>
            </div>
            <div className="form-group">
              <label className="form-label">医保应结金额</label>
              <p className="font-bold text-green">¥{selectedSettlement.insurance_amount?.toFixed(2)}</p>
            </div>
            <div className="form-group">
              <label className="form-label">实际回款金额 *</label>
              <input
                type="number"
                step="0.01"
                className="form-input"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">差额</label>
              <p className={receivedAmount - selectedSettlement.insurance_amount !== 0 ? 'text-red font-bold' : 'text-green'}>
                ¥{(receivedAmount - selectedSettlement.insurance_amount).toFixed(2)}
              </p>
            </div>
            <p className="text-sm text-muted">
              ⚠️ 如实际回款与应结金额不一致，系统将自动生成差异记录。
            </p>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowReconcileModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleReconcile} disabled={loading}>
                {loading ? '对账中...' : '确认对账'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
