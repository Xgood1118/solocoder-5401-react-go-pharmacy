import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import api from '../api'
import { useAuth } from '../context/AuthContext'

export default function RxDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [rx, setRx] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showVoidModal, setShowVoidModal] = useState(false)
  const [showHandoverModal, setShowHandoverModal] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [staffList, setStaffList] = useState([])
  const [selectedStaff, setSelectedStaff] = useState('')
  const { staff: currentStaff, hasRole } = useAuth()

  useEffect(() => {
    loadRx()
    loadStaffList()
  }, [id])

  const loadRx = async () => {
    try {
      const res = await api.get(`/rx/${id}`)
      setRx(res.data)
    } catch (e) {
      console.error('加载处方失败', e)
    }
  }

  const loadStaffList = async () => {
    if (hasRole('manager')) {
      try {
        const res = await api.get('/staff')
        setStaffList(res.data.filter(s => s.role === 'pharmacist'))
      } catch (e) {
        console.error('加载员工列表失败', e)
      }
    }
  }

  const handleVerify = async () => {
    setLoading(true)
    try {
      await api.post(`/rx/${id}/verify`)
      loadRx()
    } catch (e) {
      alert(e.response?.data?.error || '核方失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDispense = async () => {
    if (!confirm('确认发药？发药后库存将自动扣减。')) return
    setLoading(true)
    try {
      await api.post(`/rx/${id}/dispense`)
      loadRx()
    } catch (e) {
      alert(e.response?.data?.error || '发药失败')
    } finally {
      setLoading(false)
    }
  }

  const handleInsurance = async () => {
    setLoading(true)
    try {
      await api.post(`/rx/${id}/insurance`)
      loadRx()
    } catch (e) {
      alert(e.response?.data?.error || '医保上传失败')
    } finally {
      setLoading(false)
    }
  }

  const handleVoid = async () => {
    if (!voidReason.trim()) {
      alert('请填写作废原因')
      return
    }
    setLoading(true)
    try {
      await api.post(`/rx/${id}/void`, { reason: voidReason })
      setShowVoidModal(false)
      loadRx()
    } catch (e) {
      alert(e.response?.data?.error || '作废失败')
    } finally {
      setLoading(false)
    }
  }

  const handleInitiateHandover = async () => {
    if (!selectedStaff) {
      alert('请选择交接对象')
      return
    }
    setLoading(true)
    try {
      await api.post(`/rx/${id}/handover/initiate`, { to_staff_id: selectedStaff })
      setShowHandoverModal(false)
      loadRx()
    } catch (e) {
      alert(e.response?.data?.error || '发起交接失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptHandover = async () => {
    setLoading(true)
    try {
      await api.post(`/rx/${id}/handover/accept`)
      loadRx()
    } catch (e) {
      alert(e.response?.data?.error || '接收失败')
    } finally {
      setLoading(false)
    }
  }

  if (!rx) {
    return (
      <Layout title="处方详情">
        <div className="text-center" style={{ padding: 100 }}>加载中...</div>
      </Layout>
    )
  }

  const statusMap = {
    created: { label: '待核方', tag: 'tag-blue' },
    verified: { label: '已核方', tag: 'tag-orange' },
    dispensed: { label: '已发药', tag: 'tag-green' },
    insurance_submitted: { label: '医保已上传', tag: 'tag-blue' },
    completed: { label: '已完成', tag: 'tag-green' },
    void: { label: '已作废', tag: 'tag-gray' },
  }

  const canOperate = rx.current_holder_id === currentStaff?.id && !rx.handover_pending && !rx.is_void
  const isReceiver = rx.handover_pending && rx.handover_to_id === currentStaff?.id

  return (
    <Layout title="处方详情">
      <div className="card">
        <div className="flex-between mb-16">
          <div>
            <h2 className="card-title" style={{ marginBottom: 0, display: 'inline-block' }}>
              {rx.rx_no}
            </h2>
            <span className={`tag ${statusMap[rx.status]?.tag} ml-8`} style={{ marginLeft: 12 }}>
              {statusMap[rx.status]?.label}
            </span>
            {rx.handover_pending && (
              <span className="tag tag-orange" style={{ marginLeft: 8 }}>
                交接中 → {rx.handover_to_id === currentStaff?.id ? '待我接收' : '等待对方接收'}
              </span>
            )}
            {rx.is_void && (
              <span className="tag tag-gray" style={{ marginLeft: 8 }}>已作废</span>
            )}
          </div>
          <div className="flex gap-8">
            <button className="btn btn-default" onClick={() => navigate('/rx')}>返回列表</button>
            {isReceiver && (
              <button className="btn btn-success" onClick={handleAcceptHandover} disabled={loading}>
                接收交接
              </button>
            )}
            {canOperate && rx.status === 'created' && hasRole('pharmacist') && (
              <button className="btn btn-primary" onClick={handleVerify} disabled={loading}>
                核方通过
              </button>
            )}
            {canOperate && rx.status === 'verified' && hasRole('pharmacist') && (
              <button className="btn btn-success" onClick={handleDispense} disabled={loading}>
                发药
              </button>
            )}
            {canOperate && rx.status === 'dispensed' && (
              <button className="btn btn-primary" onClick={handleInsurance} disabled={loading}>
                医保上传
              </button>
            )}
            {hasRole('pharmacist') && !rx.is_void && (
              <button className="btn btn-danger" onClick={() => setShowVoidModal(true)}>
                作废处方
              </button>
            )}
            {canOperate && !rx.is_void && rx.status !== 'completed' && rx.status !== 'void' && (
              <button className="btn btn-warning" onClick={() => setShowHandoverModal(true)}>
                发起交接
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 24 }}>
          <div>
            <p className="text-muted text-sm mb-8">患者姓名</p>
            <p className="font-bold">{rx.patient_name}</p>
          </div>
          <div>
            <p className="text-muted text-sm mb-8">身份证号</p>
            <p>{rx.patient_id_card}</p>
          </div>
          <div>
            <p className="text-muted text-sm mb-8">医生/医院</p>
            <p>{rx.doctor_name || '-'} / {rx.hospital || '-'}</p>
          </div>
          <div>
            <p className="text-muted text-sm mb-8">当前持方人</p>
            <p>{rx.current_holder_name}</p>
          </div>
          <div>
            <p className="text-muted text-sm mb-8">创建人</p>
            <p>{rx.operator_name}</p>
          </div>
          <div>
            <p className="text-muted text-sm mb-8">医保单据号</p>
            <p>{rx.insurance_claim_no || '-'}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">处方明细</h3>
        <table>
          <thead>
            <tr>
              <th>药品名称</th>
              <th>规格</th>
              <th>数量</th>
              <th>单价</th>
              <th>金额</th>
              <th>医保类型</th>
            </tr>
          </thead>
          <tbody>
            {rx.items?.map((item, idx) => (
              <tr key={idx}>
                <td>{item.drug_name}</td>
                <td>{item.specification}</td>
                <td>{item.quantity}</td>
                <td>¥{item.unit_price?.toFixed(2)}</td>
                <td>¥{item.amount?.toFixed(2)}</td>
                <td>-</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}></td>
              <td className="font-bold">总金额</td>
              <td className="font-bold">¥{rx.total_amount?.toFixed(2)}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={3}></td>
              <td className="text-muted">医保支付</td>
              <td className="text-green">¥{rx.insurance_amount?.toFixed(2)}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={3}></td>
              <td className="text-muted">自付金额</td>
              <td className="text-orange">¥{rx.self_pay_amount?.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="card">
        <h3 className="card-title">操作记录</h3>
        <div className="timeline">
          {rx.actions?.map((action, idx) => (
            <div key={idx} className="timeline-item">
              <div className="font-bold">{action.action}</div>
              <div className="text-sm text-muted">
                {action.operator_name} · {new Date(action.timestamp).toLocaleString('zh-CN')}
              </div>
              {action.remark && (
                <div className="text-sm mt-4">{action.remark}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {rx.is_void && rx.void_reason && (
        <div className="alert-red">
          <strong>作废原因：</strong>{rx.void_reason}
        </div>
      )}

      {showVoidModal && (
        <div className="modal-overlay" onClick={() => setShowVoidModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">作废处方</span>
              <button className="modal-close" onClick={() => setShowVoidModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">作废原因 *</label>
              <textarea
                className="form-input"
                rows={4}
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="请填写作废原因"
              />
            </div>
            <p className="text-sm text-muted">
              ⚠️ 处方作废后无法恢复，废方将存档 5 年备查。
            </p>
            <div className="modal-footer">
              <button type="button" className="btn btn-default" onClick={() => setShowVoidModal(false)}>
                取消
              </button>
              <button className="btn btn-danger" onClick={handleVoid} disabled={loading}>
                {loading ? '作废中...' : '确认作废'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showHandoverModal && (
        <div className="modal-overlay" onClick={() => setShowHandoverModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">发起处方交接</span>
              <button className="modal-close" onClick={() => setShowHandoverModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">交接给 *</label>
              <select
                className="form-input"
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
              >
                <option value="">请选择</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <p className="text-sm text-muted">
              ⚠️ 对方接收前，您仍可操作本处方；对方接收后，处方操作权将转移给对方。
            </p>
            <div className="modal-footer">
              <button type="button" className="btn btn-default" onClick={() => setShowHandoverModal(false)}>
                取消
              </button>
              <button className="btn btn-warning" onClick={handleInitiateHandover} disabled={loading}>
                {loading ? '发起中...' : '确认发起'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
