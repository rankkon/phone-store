import { useCallback, useEffect, useState } from 'react';
import { userApi } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { formatDate } from '../../utils/order';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError('');
    userApi.list({
      role: roleFilter || undefined,
      search: searchQuery.trim() || undefined,
      page,
      limit: 10
    })
      .then((response) => {
        setUsers(response.data.data);
        setMeta(response.data.meta);
        setLoading(false);
      })
      .catch((err) => {
        setError(getApiError(err));
        setLoading(false);
      });
  }, [page, roleFilter, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = (targetUser) => {
    const nextStatus = targetUser.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    const actionText = nextStatus === 'BLOCKED' ? 'khóa' : 'mở khóa';

    if (!window.confirm(`Bạn có chắc muốn ${actionText} tài khoản của ${targetUser.fullName}?`)) return;

    setActionError('');
    setActionSuccess('');

    userApi.updateStatus(targetUser._id, nextStatus)
      .then(() => {
        setActionSuccess(`Đã ${actionText} thành công tài khoản: ${targetUser.email}`);
        fetchUsers();
      })
      .catch((err) => {
        setActionError(getApiError(err));
      });
  };

  const handleChangeRole = (targetUser, nextRole) => {
    if (!window.confirm(`Bạn có chắc muốn đổi vai trò của ${targetUser.fullName} thành ${nextRole}?`)) return;

    setActionError('');
    setActionSuccess('');

    userApi.updateRole(targetUser._id, nextRole)
      .then(() => {
        setActionSuccess(`Đã chuyển vai trò thành công cho ${targetUser.email} sang: ${nextRole}`);
        fetchUsers();
      })
      .catch((err) => {
        setActionError(getApiError(err));
      });
  };

  if (loading && page === 1) return <LoadingScreen />;

  return (
    <div className="admin-users" style={{ padding: '1rem' }}>
      <div className="page-heading" style={{ marginBottom: '1.5rem' }}>
        <div>
          <p className="eyebrow">QUẢN TRỊ</p>
          <h1>Quản lý người dùng</h1>
        </div>
      </div>

      {error && <FlashMessage type="error">{error}</FlashMessage>}
      {actionError && <FlashMessage type="error">{actionError}</FlashMessage>}
      {actionSuccess && <FlashMessage type="success">{actionSuccess}</FlashMessage>}

      <div className="filters-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Tìm theo họ tên, email..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          className="search-input"
          style={{ flex: 1, minWidth: '200px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
        >
          <option value="">Tất cả vai trò</option>
          <option value="CUSTOMER">Khách hàng (CUSTOMER)</option>
          <option value="STAFF">Nhân viên (STAFF)</option>
          <option value="ADMIN">Quản trị viên (ADMIN)</option>
        </select>
      </div>

      {users.length === 0 ? (
        <div className="empty-state">Không tìm thấy người dùng nào.</div>
      ) : (
        <>
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '0.75rem' }}>Người dùng</th>
                  <th style={{ padding: '0.75rem' }}>Vai trò</th>
                  <th style={{ padding: '0.75rem' }}>Trạng thái</th>
                  <th style={{ padding: '0.75rem' }}>Ngày tạo</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map((targetUser) => {
                  const isSelf = currentUser?._id === targetUser._id;
                  const roleCanBeChanged = !isSelf && targetUser.role !== 'ADMIN';
                  return (
                    <tr key={targetUser._id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <strong>{targetUser.fullName}</strong>
                        {isSelf && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#1a73e8', background: '#e8f0fe', padding: '2px 6px', borderRadius: '4px' }}>Tôi</span>}
                        <br />
                        <small style={{ color: '#666' }}>{targetUser.email}</small>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {roleCanBeChanged ? (
                          <select
                            value={targetUser.role}
                            onChange={(e) => handleChangeRole(targetUser, e.target.value)}
                            style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid #ccc' }}
                          >
                            <option value="CUSTOMER">CUSTOMER</option>
                            <option value="STAFF">STAFF</option>
                          </select>
                        ) : (
                          <span style={{ fontWeight: 'bold' }}>{targetUser.role}</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          background: targetUser.status === 'ACTIVE' ? '#e6f4ea' : '#fce8e6',
                          color: targetUser.status === 'ACTIVE' ? '#137333' : '#c5221f'
                        }}>
                          {targetUser.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{formatDate(targetUser.createdAt)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <button
                          disabled={isSelf}
                          onClick={() => handleToggleStatus(targetUser)}
                          className={`button ${targetUser.status === 'ACTIVE' ? 'button--danger' : 'button--secondary'} button--small`}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
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
    </div>
  );
}
