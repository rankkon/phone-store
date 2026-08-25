import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { userApi } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import UserAvatar from '../../components/UserAvatar';
import { isValidPersonName, isValidPhone, onlyDigits, onlyPersonName } from '../../utils/input';
import { formatDate } from '../../utils/order';
import { useFeedback } from '../../context/FeedbackContext';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { confirm, notify } = useFeedback();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  
  // Search and Filters state
  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ fullName: '', email: '', password: '', role: 'STAFF' });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  const [selectedUserLtv, setSelectedUserLtv] = useState(null);
  const [loadingLtv, setLoadingLtv] = useState(false);

  // Edit Profile modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUserId, setEditUserId] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const openEditModal = (targetUser) => {
    setEditUserId(targetUser._id);
    setEditFullName(targetUser.fullName);
    setEditEmail(targetUser.email || '');
    setEditPhone(targetUser.phone || '');
    setEditError('');
    setShowEditModal(true);
  };

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    if (!isValidPersonName(editFullName)) {
      setEditError('Họ tên chỉ gồm chữ cái, dài từ 2 đến 100 ký tự.');
      return;
    }
    if (!isValidPhone(editPhone)) {
      setEditError('Số điện thoại chỉ gồm 9–15 chữ số.');
      return;
    }
    setEditSubmitting(true);
    setEditError('');
    userApi.updateProfile(editUserId, {
      fullName: editFullName.trim(),
      email: editEmail.trim() || undefined,
      phone: editPhone.trim()
    })
      .then(() => {
        setActionSuccess('Đã cập nhật hồ sơ khách hàng thành công.');
        setShowEditModal(false);
        fetchUsers();
      })
      .catch((err) => {
        setEditError(getApiError(err));
      })
      .finally(() => {
        setEditSubmitting(false);
      });
  };

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError('');
    userApi.list({
      role: roleFilter || undefined,
      status: statusFilter || undefined,
      isEmailVerified: verificationFilter || undefined,
      sortBy: sortBy || undefined,
      search: searchQuery.trim() || undefined,
      page,
      limit: 10
    })
      .then((response) => {
        setUsers(response.data.data);
        setStats(response.data.stats);
        setMeta(response.data.meta);
        setLoading(false);
      })
      .catch((err) => {
        setError(getApiError(err));
        setLoading(false);
      });
  }, [page, roleFilter, statusFilter, verificationFilter, sortBy, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(searchText);
    setPage(1);
  };

  const handleToggleStatus = async (targetUser) => {
    const nextStatus = targetUser.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    const actionText = nextStatus === 'BLOCKED' ? 'khóa' : 'mở khóa';

    let reason = '';
    if (nextStatus === 'BLOCKED') {
      reason = await confirm({
        title: `Khóa tài khoản ${targetUser.fullName}?`,
        message: 'Tài khoản sẽ không thể đăng nhập hay tiếp tục sử dụng hệ thống cho đến khi được mở khóa.',
        confirmLabel: 'Khóa tài khoản',
        tone: 'danger',
        input: { label: 'Lý do khóa', defaultValue: 'Vi phạm điều khoản hệ thống', required: true, minLength: 3 },
      });
      if (!reason) return;
    } else {
      const confirmed = await confirm({ title: `Mở khóa tài khoản ${targetUser.fullName}?`, message: 'Người dùng sẽ có thể đăng nhập và sử dụng lại tài khoản.', confirmLabel: 'Mở khóa', tone: 'info' });
      if (!confirmed) return;
    }

    setActionError('');
    setActionSuccess('');

    userApi.updateStatus(targetUser._id, nextStatus, reason)
      .then(() => {
        setActionSuccess(`Đã ${actionText} thành công tài khoản: ${targetUser.email}`);
        notify(`Đã ${actionText} tài khoản ${targetUser.email}.`);
        fetchUsers();
      })
      .catch((err) => {
        const message = getApiError(err);
        setActionError(message);
        notify(message, { type: 'error' });
      });
  };

  const handleChangeRole = async (targetUser, nextRole) => {
    const confirmed = await confirm({ title: 'Thay đổi vai trò tài khoản?', message: `Quyền của ${targetUser.fullName} sẽ được đổi thành ${nextRole}.`, confirmLabel: 'Đổi vai trò', tone: 'danger' });
    if (!confirmed) return;

    setActionError('');
    setActionSuccess('');

    userApi.updateRole(targetUser._id, nextRole)
      .then(() => {
        setActionSuccess(`Đã chuyển vai trò thành công cho ${targetUser.email} sang: ${nextRole}`);
        notify(`Đã đổi vai trò của ${targetUser.email} sang ${nextRole}.`);
        fetchUsers();
      })
      .catch((err) => {
        const message = getApiError(err);
        setActionError(message);
        notify(message, { type: 'error' });
      });
  };

  const handleOpenLtvModal = (userId) => {
    setLoadingLtv(true);
    userApi.getLtv(userId)
      .then((res) => {
        setSelectedUserLtv(res.data);
        setLoadingLtv(false);
      })
      .catch((err) => {
        setActionError('Không thể tải chi tiết LTV: ' + getApiError(err));
        setLoadingLtv(false);
      });
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!isValidPersonName(createForm.fullName)) {
      setCreateError('Họ tên chỉ gồm chữ cái, dài từ 2 đến 100 ký tự.');
      return;
    }
    if (createForm.password.length < 8) {
      setCreateError('Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    setCreateSubmitting(true);
    setCreateError('');
    userApi.create(createForm)
      .then(() => {
        setActionSuccess(`Đã tạo tài khoản ${createForm.role} thành công: ${createForm.email}`);
        setShowCreateModal(false);
        setCreateForm({ fullName: '', email: '', password: '', role: 'STAFF' });
        setCreateSubmitting(false);
        fetchUsers();
      })
      .catch((err) => {
        setCreateError(getApiError(err));
        setCreateSubmitting(false);
      });
  };

  const handleExportCsv = () => {
    setActionError('');
    setActionSuccess('');
    userApi.exportCsv({
      role: roleFilter || undefined,
      status: statusFilter || undefined,
      isEmailVerified: verificationFilter || undefined,
      search: searchQuery.trim() || undefined
    })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `danh_sach_nguoi_dung_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        setActionSuccess('Xuất báo cáo CSV thành công.');
      })
      .catch((err) => {
        setActionError('Không thể xuất báo cáo CSV: ' + getApiError(err));
      });
  };

  const formatVnd = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  if (loading && page === 1 && !loadingLtv) return <LoadingScreen />;

  return (
    <div className="admin-users" style={{ padding: '1rem' }}>
      <div className="page-heading" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="eyebrow">QUẢN TRỊ</p>
          <h1>Quản lý người dùng</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleExportCsv}
            className="button button--secondary"
            style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', fontWeight: 'bold' }}
          >
            Xuất CSV
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="button button--primary"
            style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', fontWeight: 'bold' }}
          >
            + Tạo tài khoản
          </button>
        </div>
      </div>

      {/* Thẻ thống kê đầu trang */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #1a73e8' }}>
          <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>TỔNG THÀNH VIÊN</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#111' }}>{stats?.totalMembers || 0}</div>
        </div>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #34a853' }}>
          <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>KHÁCH HÀNG</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#111' }}>{stats?.customersCount || 0}</div>
        </div>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #fbbc05' }}>
          <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>NHÂN VIÊN/ADMIN</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#111' }}>{stats?.staffAdminCount || 0}</div>
        </div>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #ea4335' }}>
          <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>TÀI KHOẢN BỊ KHÓA</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#111' }}>{stats?.blockedCount || 0}</div>
        </div>
      </div>

      {error && <FlashMessage type="error">{error}</FlashMessage>}
      {actionError && <FlashMessage type="error">{actionError}</FlashMessage>}
      {actionSuccess && <FlashMessage type="success">{actionSuccess}</FlashMessage>}

      <form onSubmit={handleSearchSubmit} className="filters-bar" style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'nowrap', overflowX: 'auto', alignItems: 'center', paddingBottom: '0.5rem' }}>
        <input
          type="text"
          placeholder="Tìm theo họ tên, email... rồi ấn Enter"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="search-input"
          style={{ flex: 1, minWidth: '180px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
        />
        <button type="submit" className="button button--secondary" style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}>Tìm kiếm</button>
        
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          style={{ width: 'auto', minWidth: '130px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value="">Tất cả vai trò</option>
          <option value="CUSTOMER">Khách hàng</option>
          <option value="STAFF">Nhân viên</option>
          <option value="ADMIN">Quản trị viên</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ width: 'auto', minWidth: '130px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="BLOCKED">Đã khóa</option>
        </select>

        <select
          value={verificationFilter}
          onChange={(e) => { setVerificationFilter(e.target.value); setPage(1); }}
          style={{ width: 'auto', minWidth: '140px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value="">Trạng thái xác minh</option>
          <option value="true">Đã xác minh</option>
          <option value="false">Chưa xác minh</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          style={{ width: 'auto', minWidth: '140px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value="createdAt_desc">Mới nhất</option>
          <option value="createdAt_asc">Cũ nhất</option>
          <option value="ltv_desc">Chi tiêu (LTV) giảm dần</option>
          <option value="ltv_asc">Chi tiêu (LTV) tăng dần</option>
        </select>
      </form>

      {users.length === 0 ? (
        <div className="empty-state">Không tìm thấy người dùng nào.</div>
      ) : (
        <>
          <div className="table-responsive" style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #e0e0e0', color: '#5f6368', fontSize: '0.78rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Người dùng</th>
                  <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Chi tiêu (LTV)</th>
                  <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Vai trò</th>
                  <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Trạng thái</th>
                  <th style={{ padding: '0.75rem', fontWeight: 'bold' }}>Ngày tạo</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map((targetUser) => {
                  const isSelf = currentUser?._id === targetUser._id;
                  const isWalkIn = targetUser.email === 'walkin@phonestore.com';
                  const roleCanBeChanged = !isSelf && targetUser.role !== 'ADMIN' && !isWalkIn;
                  return (
                    <tr key={targetUser._id} style={{ borderBottom: '1px solid #eee', verticalAlign: 'middle' }}>
                      <td style={{ padding: '0.6rem 0.75rem', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <UserAvatar user={targetUser} size="sm" />
                          <span
                            onClick={() => handleOpenLtvModal(targetUser._id)}
                            style={{ cursor: 'pointer', color: '#1a73e8', fontWeight: '700', textDecoration: 'none', hover: { textDecoration: 'underline' } }}
                            title="Xem chi tiết tài chính / LTV"
                          >
                            {targetUser.fullName}
                          </span>
                          {isSelf && <span style={{ fontSize: '0.7rem', color: '#1a73e8', background: '#e8f0fe', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>Tôi</span>}
                          {isWalkIn && <span style={{ fontSize: '0.7rem', color: '#b06000', background: '#fef7e0', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>Hệ thống POS</span>}
                        </div>
                        <div style={{ marginTop: '2px' }}>
                          <small style={{
                            color: targetUser.email ? '#5f6368' : '#e37400',
                            fontFamily: targetUser.email ? "'DM Mono', monospace" : 'Manrope, Arial, sans-serif',
                            fontStyle: 'normal',
                            fontWeight: targetUser.email ? '400' : '600',
                            fontSize: '0.75rem',
                            lineHeight: '1.45',
                          }}>
                            {targetUser.email || 'Chưa đăng ký tài khoản (Mua tại quầy)'}
                          </small>
                        </div>
                        {targetUser.status === 'BLOCKED' && targetUser.blockReason && (
                          <div style={{ fontSize: '0.72rem', color: '#c5221f', marginTop: '2px', background: '#fce8e6', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                            Lý do khóa: <em>{targetUser.blockReason}</em>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: '700', color: '#202124', verticalAlign: 'middle' }}>
                        {formatVnd(targetUser.ltv || 0)}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', verticalAlign: 'middle' }}>
                        {roleCanBeChanged ? (
                          <select
                            value={targetUser.role}
                            onChange={(e) => handleChangeRole(targetUser, e.target.value)}
                            style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #dadce0', background: '#fff', fontSize: '0.8rem', cursor: 'pointer', outline: 'none' }}
                          >
                            <option value="CUSTOMER">CUSTOMER</option>
                            <option value="STAFF">STAFF</option>
                          </select>
                        ) : (
                          <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#3c4043' }}>{targetUser.role}</span>
                        )}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', verticalAlign: 'middle' }}>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 'bold',
                          display: 'inline-block',
                          background: targetUser.status === 'ACTIVE' ? '#e6f4ea' : '#fce8e6',
                          color: targetUser.status === 'ACTIVE' ? '#137333' : '#c5221f'
                        }}>
                          {targetUser.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#5f6368', fontSize: '0.8rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {formatDate(targetUser.createdAt)}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                        {targetUser.role === 'CUSTOMER' && (
                          <Link
                            to={`/admin/orders?search=${encodeURIComponent(targetUser.email || '')}`}
                            className="button button--secondary button--small"
                            style={{ textDecoration: 'none', marginRight: '0.5rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px', fontWeight: 'bold' }}
                          >
                            Xem đơn
                          </Link>
                        )}
                        <button
                          disabled={isSelf || isWalkIn}
                          onClick={() => openEditModal(targetUser)}
                          className="button button--secondary button--small"
                          style={{ marginRight: '0.5rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px', fontWeight: 'bold' }}
                        >
                          Sửa
                        </button>
                        <button
                          disabled={isSelf || isWalkIn}
                          onClick={() => handleToggleStatus(targetUser)}
                          className={`button ${targetUser.status === 'ACTIVE' ? 'button--danger' : 'button--secondary'} button--small`}
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px', fontWeight: 'bold' }}
                        >
                          {targetUser.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta.totalPages > 1 && (
            <div className="pagination" style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'center' }}>
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="button button--secondary"
                style={{ padding: '0.25rem 0.5rem' }}
              >
                Trước
              </button>
              <span style={{ alignSelf: 'center' }}>Trang {page} / {meta.totalPages}</span>
              <button
                disabled={page === meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="button button--secondary"
                style={{ padding: '0.25rem 0.5rem' }}
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal Tạo Tài Khoản */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '500px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h2>Tạo tài khoản nội bộ</h2>
            {createError && <FlashMessage type="error">{createError}</FlashMessage>}
            <form onSubmit={handleCreateUser} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Họ tên</label>
                <input
                  type="text"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: onlyPersonName(e.target.value) })}
                  minLength="2"
                  maxLength="100"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Email</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Mật khẩu</label>
                <input
                  type="password"
                  required
                  minLength="8"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Vai trò</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="STAFF">Nhân viên (STAFF)</option>
                  <option value="ADMIN">Quản trị viên (ADMIN)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="button button--secondary">Hủy</button>
                <button type="submit" disabled={createSubmitting} className="button button--primary">
                  {createSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal LTV & Chi tiết tài chính */}
      {selectedUserLtv && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '500px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Hồ sơ tài chính chi tiết</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <strong>Khách hàng:</strong> {selectedUserLtv.user.fullName}
              </div>
              <div>
                <strong>Email:</strong> {selectedUserLtv.user.email || 'Chưa đăng ký tài khoản'}
              </div>
              <div>
                <strong>Số điện thoại:</strong> {selectedUserLtv.user.phone || 'Không có'}
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #eee' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: '#f9f9f9', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>Tổng đơn đã đặt</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedUserLtv.totalOrders} đơn</div>
                </div>
                <div style={{ background: '#f9f9f9', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>Đơn hoàn thành / hủy</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                    <span style={{ color: '#137333' }}>{selectedUserLtv.completedOrders}</span> / <span style={{ color: '#c5221f' }}>{selectedUserLtv.cancelledOrders}</span>
                  </div>
                </div>
                <div style={{ background: '#f9f9f9', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>Tỷ lệ hủy đơn</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: selectedUserLtv.cancellationRate > 30 ? '#c5221f' : '#333' }}>
                    {selectedUserLtv.cancellationRate.toFixed(1)}%
                  </div>
                </div>
                <div style={{ background: '#f9f9f9', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>Tổng chi tiêu (LTV)</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1a73e8' }}>
                    {formatVnd(selectedUserLtv.ltv)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setSelectedUserLtv(null)} className="button button--primary">Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa hồ sơ khách hàng */}
      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '450px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Chỉnh sửa thông tin khách hàng</h2>
            
            {editError && <FlashMessage type="error">{editError}</FlashMessage>}
            
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Họ và tên</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(onlyPersonName(e.target.value))}
                  minLength="2"
                  maxLength="100"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Địa chỉ Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>Số điện thoại</label>
                <input
                  inputMode="numeric"
                  pattern="[0-9]{9,15}"
                  maxLength="15"
                  value={editPhone}
                  onChange={(e) => setEditPhone(onlyDigits(e.target.value))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="button button--secondary">Hủy</button>
                <button type="submit" disabled={editSubmitting} className="button button--primary">
                  {editSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
