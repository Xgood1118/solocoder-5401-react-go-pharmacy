import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import api from '../api'
import { useAuth } from '../context/AuthContext'

export default function Staff() {
  const [staffList, setStaffList] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showPwdModal, setShowPwdModal] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    password: '123456',
    role: 'cashier',
    phone: '',
  })
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { staff: currentStaff, hasRole, changePassword } = useAuth()

  useEffect(() => {
    if (hasRole('manager')) {
      loadStaff()
    }
  }, [])

  const loadStaff = async () => {
    try {
      const res = await api.get('/staff')
      setStaffList(res.data)
    } catch (e) {
      console.error('加载员工失败', e)
    }
  }

  const handleCreate = async () => {
    setLoading(true)
    try {
      await api.post('/staff', formData)
      setShowModal(false)
      loadStaff()
      setFormData({ username: '', name: '', password: '123456', role: 'cashier', phone: '' })
    } catch (e) {
      alert(e.response?.data?.error || '创建失败')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (staffId) => {
    if (!confirm('确认重置该员工密码为默认密码？')) return
    try {
      await api.post(`/staff/${staffId}/reset-password`)
      alert('密码已重置为 123456')
      loadStaff()
    } catch (e) {
      alert(e.response?.data?.error || '重置失败')
    }
  }

  const handleLock = async (staffId, locked) => {
    if (!confirm(locked ? '确认解锁该员工？' : '确认锁定该员工？')) return
    try {
      if (locked) {
        await api.post(`/staff/${staffId}/unlock`)
      } else {
        await api.post(`/staff/${staffId}/lock`)
      }
      loadStaff()
    } catch (e) {
      alert(e.response?.data?.error || '操作失败')
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('新密码至少 6 位')
      return
    }
    setLoading(true)
    try {
      await changePassword(oldPassword, newPassword)
      alert('密码修改成功')
      setShowPwdModal(false)
      setOldPassword('')
      setNewPassword('')
    } catch (e) {
      alert(e.response?.data?.error || '修改失败')
    } finally {
      setLoading(false)
    }
  }

  const roleLabel = {
    manager: '店长',
    pharmacist: '药师',
    cashier: '收银员',
  }

  const daysUntilExpiry = (expiresAt) => {
    const days = Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <Layout title="员工管理">
      <div className="card">
        <div className="flex-between mb-16">
          <h2 className="card-title" style={{ marginBottom: 0 }}>
            {hasRole('manager') ? '员工管理' : '个人中心'}
          </h2>
          <div className="flex gap-8">
            <button className="btn btn-primary" onClick={() => setShowPwdModal(true)}>
              修改密码
            </button>
            {hasRole('manager') && (
              <button className="btn btn-success" onClick={() => setShowModal(true)}>
                + 新增员工
              </button>
            )}
          </div>
        </div>

        <div className="card" style={{ background: '#fafafa', marginBottom: 20 }}>
          <h3 className="card-title">我的信息</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <p className="text-muted text-sm mb-8">姓名</p>
              <p className="font-bold">{currentStaff?.name}</p>
            </div>
            <div>
              <p className="text-muted text-sm mb-8">用户名</p>
              <p>{currentStaff?.username}</p>
            </div>
            <div>
              <p className="text-muted text-sm mb-8">角色</p>
              <p>{roleLabel[currentStaff?.role] || currentStaff?.role}</p>
            </div>
            <div>
              <p className="text-muted text-sm mb-8">电话</p>
              <p>{currentStaff?.phone || '-'}</p>
            </div>
            <div>
              <p className="text-muted text-sm mb-8">密码到期时间</p>
              <p className={daysUntilExpiry(currentStaff?.password_expires_at) <= 7 ? 'text-orange font-bold' : ''}>
                {new Date(currentStaff?.password_expires_at).toLocaleDateString('zh-CN')}
                {daysUntilExpiry(currentStaff?.password_expires_at) <= 7 && (
                  <span className="text-orange text-sm" style={{ marginLeft: 8 }}>
                    （还有 {daysUntilExpiry(currentStaff?.password_expires_at)} 天）
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {hasRole('manager') && (
          <div>
            <h3 className="card-title">员工列表</h3>
            <table>
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>用户名</th>
                  <th>角色</th>
                  <th>电话</th>
                  <th>状态</th>
                  <th>密码到期</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(staff => (
                  <tr key={staff.id}>
                    <td className="font-bold">{staff.name}</td>
                    <td>{staff.username}</td>
                    <td>
                      <span className={`tag ${
                        staff.role === 'manager' ? 'tag-red' :
                        staff.role === 'pharmacist' ? 'tag-blue' : 'tag-green'
                      }`}>
                        {roleLabel[staff.role] || staff.role}
                      </span>
                    </td>
                    <td>{staff.phone || '-'}</td>
                    <td>
                      {staff.locked ? (
                        <span className="tag tag-red">已锁定</span>
                      ) : (
                        <span className="tag tag-green">正常</span>
                      )}
                    </td>
                    <td className={daysUntilExpiry(staff.password_expires_at) <= 7 ? 'text-orange' : ''}>
                      {new Date(staff.password_expires_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td>
                      <div className="flex gap-8">
                        <button
                          className="btn btn-default btn-sm"
                          onClick={() => handleResetPassword(staff.id)}
                        >
                          重置密码
                        </button>
                        <button
                          className={`btn btn-sm ${staff.locked ? 'btn-success' : 'btn-warning'}`}
                          onClick={() => handleLock(staff.id, staff.locked)}
                        >
                          {staff.locked ? '解锁' : '锁定'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">新增员工</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">用户名 *</label>
              <input
                type="text"
                className="form-input"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">姓名 *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">角色</label>
              <select
                className="form-input"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              >
                <option value="manager">店长</option>
                <option value="pharmacist">药师</option>
                <option value="cashier">收银员</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">初始密码</label>
              <input
                type="text"
                className="form-input"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
              <p className="text-sm text-muted mt-4">默认密码 123456</p>
            </div>
            <div className="form-group">
              <label className="form-label">电话</label>
              <input
                type="text"
                className="form-input"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
                {loading ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPwdModal && (
        <div className="modal-overlay" onClick={() => setShowPwdModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">修改密码</span>
              <button className="modal-close" onClick={() => setShowPwdModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">原密码 *</label>
              <input
                type="password"
                className="form-input"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">新密码 *</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少 6 位"
              />
            </div>
            <p className="text-sm text-muted">
              ⚠️ 密码需每月更换一次，到期前 7 天会提醒，过期未改账号将自动锁定。
            </p>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowPwdModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleChangePassword} disabled={loading}>
                {loading ? '修改中...' : '确认修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
