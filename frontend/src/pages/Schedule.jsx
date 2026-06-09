import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import api from '../api'
import { useAuth } from '../context/AuthContext'

export default function Schedule() {
  const [shifts, setShifts] = useState([])
  const [swaps, setSwaps] = useState([])
  const [swapHistory, setSwapHistory] = useState([])
  const [activeTab, setActiveTab] = useState('schedule')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [staffList, setStaffList] = useState([])
  const [shiftForm, setShiftForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    shift_type: 'morning',
    staff_id: '',
  })
  const [swapForm, setSwapForm] = useState({
    shift_id: '',
    target_staff_id: '',
    reason: '',
  })
  const [loading, setLoading] = useState(false)
  const { staff: currentStaff, hasRole } = useAuth()

  useEffect(() => {
    if (activeTab === 'schedule') loadShifts()
    if (activeTab === 'swaps') loadSwaps()
    if (activeTab === 'history') loadSwapHistory()
    loadStaff()
  }, [activeTab, selectedDate])

  const loadShifts = async () => {
    try {
      const res = await api.get(`/schedule?date=${selectedDate}`)
      setShifts(res.data)
    } catch (e) {
      console.error('加载排班失败', e)
    }
  }

  const loadSwaps = async () => {
    try {
      const res = await api.get('/schedule/swaps?my_only=true')
      setSwaps(res.data)
    } catch (e) {
      console.error('加载换班申请失败', e)
    }
  }

  const loadSwapHistory = async () => {
    try {
      const res = await api.get('/schedule/swaps/history')
      setSwapHistory(res.data)
    } catch (e) {
      console.error('加载换班历史失败', e)
    }
  }

  const loadStaff = async () => {
    try {
      const res = await api.get('/staff')
      setStaffList(res.data)
    } catch (e) {
      if (e.response?.status !== 403) {
        console.error('加载员工列表失败', e)
      }
    }
  }

  const handleCreateShift = async () => {
    setLoading(true)
    try {
      await api.post('/schedule', shiftForm)
      setShowShiftModal(false)
      loadShifts()
    } catch (e) {
      alert(e.response?.data?.error || '创建失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestSwap = async () => {
    setLoading(true)
    try {
      await api.post('/schedule/swaps', swapForm)
      setShowSwapModal(false)
      loadSwaps()
    } catch (e) {
      alert(e.response?.data?.error || '申请失败')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmSwap = async (swapId) => {
    if (!confirm('确认接受换班？')) return
    try {
      await api.post(`/schedule/swaps/${swapId}/confirm`)
      loadSwaps()
    } catch (e) {
      alert(e.response?.data?.error || '确认失败')
    }
  }

  const handleApproveSwap = async (swapId) => {
    try {
      await api.post(`/schedule/swaps/${swapId}/approve`)
      loadSwaps()
    } catch (e) {
      alert(e.response?.data?.error || '审批失败')
    }
  }

  const handleRejectSwap = async (swapId) => {
    const reason = prompt('请填写拒绝原因：')
    if (!reason) return
    try {
      await api.post(`/schedule/swaps/${swapId}/reject`, { reason })
      loadSwaps()
    } catch (e) {
      alert(e.response?.data?.error || '拒绝失败')
    }
  }

  const shiftTypeMap = {
    morning: { label: '早班', color: 'tag-blue', time: '08:00-14:00' },
    noon: { label: '中班', color: 'tag-orange', time: '12:00-18:00' },
    evening: { label: '晚班', color: 'tag-purple', time: '16:00-22:00' },
  }

  const swapStatusMap = {
    pending: { label: '待对方确认', tag: 'tag-orange' },
    confirmed: { label: '待店长审批', tag: 'tag-blue' },
    approved: { label: '已通过', tag: 'tag-green' },
    rejected: { label: '已拒绝', tag: 'tag-red' },
    expired: { label: '已过期', tag: 'tag-gray' },
    cancelled: { label: '已取消', tag: 'tag-gray' },
  }

  const tabs = [
    { key: 'schedule', label: '排班表' },
    { key: 'swaps', label: '换班申请' },
    { key: 'history', label: '历史记录' },
  ]

  const getWeekDates = () => {
    const dates = []
    const base = new Date(selectedDate)
    const day = base.getDay()
    const monday = new Date(base)
    monday.setDate(base.getDate() - day + (day === 0 ? -6 : 1))
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      dates.push(d.toISOString().slice(0, 10))
    }
    return dates
  }

  const weekDates = getWeekDates()
  const weekdayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  const getShiftsByDateAndType = (date, type) => {
    return shifts.filter(s => s.date === date && s.shift_type === type)
  }

  return (
    <Layout title="排班管理">
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
                {tab.key === 'swaps' && swaps.filter(s => s.status === 'pending' || s.status === 'confirmed').length > 0 && (
                  <span className="badge" style={{ marginLeft: 4 }}>
                    <span className="badge-count">
                      {swaps.filter(s => s.status === 'pending' || s.status === 'confirmed').length}
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
          {activeTab === 'schedule' && hasRole('manager') && (
            <button className="btn btn-success" onClick={() => setShowShiftModal(true)}>
              + 添加排班
            </button>
          )}
          {activeTab === 'swaps' && (
            <button className="btn btn-primary" onClick={() => setShowSwapModal(true)}>
              申请换班
            </button>
          )}
        </div>

        {activeTab === 'schedule' && (
          <div>
            <div className="flex gap-8 mb-16" style={{ alignItems: 'center' }}>
              <button
                className="btn btn-default btn-sm"
                onClick={() => {
                  const d = new Date(selectedDate)
                  d.setDate(d.getDate() - 7)
                  setSelectedDate(d.toISOString().slice(0, 10))
                }}
              >
                ← 上周
              </button>
              <span className="font-bold">{weekDates[0]} ~ {weekDates[6]}</span>
              <button
                className="btn btn-default btn-sm"
                onClick={() => {
                  const d = new Date(selectedDate)
                  d.setDate(d.getDate() + 7)
                  setSelectedDate(d.toISOString().slice(0, 10))
                }}
              >
                下周 →
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
              >
                今天
              </button>
            </div>

            <div className="schedule-grid">
              {weekDates.map((date, idx) => {
                const isToday = date === new Date().toISOString().slice(0, 10)
                return (
                  <div key={date} className="schedule-day" style={isToday ? { border: '2px solid #1890ff' } : {}}>
                    <div className="schedule-day-title">
                      {weekdayNames[idx]}
                      <div className="text-sm text-muted">{date.slice(5)}</div>
                    </div>
                    {['morning', 'noon', 'evening'].map(type => {
                      const dayShifts = getShiftsByDateAndType(date, type)
                      return (
                        <div key={type} style={{ marginBottom: 8 }}>
                          <div className={`tag ${shiftTypeMap[type]?.color || 'tag-gray'}`} style={{ marginBottom: 4 }}>
                            {shiftTypeMap[type]?.label}
                          </div>
                          {dayShifts.map(shift => (
                            <div key={shift.id} className="schedule-shift">
                              {shift.staff_name}
                            </div>
                          ))}
                          {dayShifts.length === 0 && (
                            <div className="text-sm text-muted" style={{ padding: '4px 8px' }}>-</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'swaps' && (
          <table>
            <thead>
              <tr>
                <th>班次日期</th>
                <th>班次类型</th>
                <th>申请人</th>
                <th>换班对象</th>
                <th>状态</th>
                <th>申请时间</th>
                <th>过期时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {swaps.map(swap => (
                <tr key={swap.id}>
                  <td>{swap.shift_date}</td>
                  <td>{shiftTypeMap[swap.shift_type]?.label || swap.shift_type}</td>
                  <td>{swap.requester_name}</td>
                  <td>{swap.target_staff_name}</td>
                  <td>
                    <span className={`tag ${swapStatusMap[swap.status]?.tag || 'tag-gray'}`}>
                      {swapStatusMap[swap.status]?.label || swap.status}
                    </span>
                  </td>
                  <td className="text-sm text-muted">
                    {new Date(swap.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="text-sm text-muted">
                    {new Date(swap.expires_at).toLocaleString('zh-CN')}
                  </td>
                  <td>
                    {swap.status === 'pending' && swap.target_staff_id === currentStaff?.id && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleConfirmSwap(swap.id)}
                      >
                        确认换班
                      </button>
                    )}
                    {swap.status === 'confirmed' && hasRole('manager') && (
                      <div className="flex gap-8">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleApproveSwap(swap.id)}
                        >
                          同意
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleRejectSwap(swap.id)}
                        >
                          拒绝
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {swaps.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-muted">
                    暂无换班申请
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'history' && (
          <table>
            <thead>
              <tr>
                <th>班次日期</th>
                <th>班次类型</th>
                <th>申请人</th>
                <th>换班对象</th>
                <th>状态</th>
                <th>拒绝原因</th>
                <th>申请时间</th>
              </tr>
            </thead>
            <tbody>
              {swapHistory.map(swap => (
                <tr key={swap.id}>
                  <td>{swap.shift_date}</td>
                  <td>{shiftTypeMap[swap.shift_type]?.label || swap.shift_type}</td>
                  <td>{swap.requester_name}</td>
                  <td>{swap.target_staff_name}</td>
                  <td>
                    <span className={`tag ${swapStatusMap[swap.status]?.tag || 'tag-gray'}`}>
                      {swapStatusMap[swap.status]?.label || swap.status}
                    </span>
                  </td>
                  <td>{swap.reject_reason || '-'}</td>
                  <td className="text-sm text-muted">
                    {new Date(swap.created_at).toLocaleString('zh-CN')}
                  </td>
                </tr>
              ))}
              {swapHistory.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted">
                    暂无历史记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showShiftModal && (
        <div className="modal-overlay" onClick={() => setShowShiftModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">添加排班</span>
              <button className="modal-close" onClick={() => setShowShiftModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">日期</label>
              <input
                type="date"
                className="form-input"
                value={shiftForm.date}
                onChange={(e) => setShiftForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">班次类型</label>
              <select
                className="form-input"
                value={shiftForm.shift_type}
                onChange={(e) => setShiftForm(prev => ({ ...prev, shift_type: e.target.value }))}
              >
                <option value="morning">早班</option>
                <option value="noon">中班</option>
                <option value="evening">晚班</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">员工</label>
              <select
                className="form-input"
                value={shiftForm.staff_id}
                onChange={(e) => setShiftForm(prev => ({ ...prev, staff_id: e.target.value }))}
              >
                <option value="">请选择</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowShiftModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateShift} disabled={loading}>
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSwapModal && (
        <div className="modal-overlay" onClick={() => setShowSwapModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">申请换班</span>
              <button className="modal-close" onClick={() => setShowSwapModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">选择班次</label>
              <select
                className="form-input"
                value={swapForm.shift_id}
                onChange={(e) => setSwapForm(prev => ({ ...prev, shift_id: e.target.value }))}
              >
                <option value="">请选择要换的班次</option>
                {shifts
                  .filter(s => s.staff_id === currentStaff?.id)
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.date} {shiftTypeMap[s.shift_type]?.label}
                    </option>
                  ))
                }
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">换班对象</label>
              <select
                className="form-input"
                value={swapForm.target_staff_id}
                onChange={(e) => setSwapForm(prev => ({ ...prev, target_staff_id: e.target.value }))}
              >
                <option value="">请选择</option>
                {staffList
                  .filter(s => s.id !== currentStaff?.id)
                  .map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))
                }
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">换班原因</label>
              <textarea
                className="form-input"
                rows={3}
                value={swapForm.reason}
                onChange={(e) => setSwapForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="请简要说明换班原因"
              />
            </div>
            <p className="text-sm text-muted">
              ⚠️ 换班申请需对方确认后，店长审批才能生效。<br />
              申请提交后 24 小时内未完成审批将自动过期。
            </p>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowSwapModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleRequestSwap} disabled={loading}>
                {loading ? '提交中...' : '提交申请'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
