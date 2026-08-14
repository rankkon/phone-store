import { useCallback, useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { managementOrderApi } from '../../api/management';
import { productApi } from '../../api/admin';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { currency, orderStatusLabels } from '../../utils/order';

export default function AdminOrdersPage() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [searchText, setSearchText] = useState(initialSearch);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  // POS Offline Sales states
  const [showPosModal, setShowPosModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [posItems, setPosItems] = useState([{ productId: '', variantId: '', quantity: 1 }]);
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posEmail, setPosEmail] = useState('');
  const [posPhone, setPosPhone] = useState('');
  const [posUserId, setPosUserId] = useState('');
  const [matchedCustomers, setMatchedCustomers] = useState([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [posPaymentMethod, setPosPaymentMethod] = useState('CASH');
  const [posDeliveryMode, setPosDeliveryMode] = useState('STORE_PICKUP');
  const [posProvince, setPosProvince] = useState('');
  const [posDistrict, setPosDistrict] = useState('');
  const [posWard, setPosWard] = useState('');
  const [posAddressDetail, setPosAddressDetail] = useState('');
  const [posSubmitting, setPosSubmitting] = useState(false);
  const [posError, setPosError] = useState('');

  const emailInputRef = useRef(null);
  const phoneInputRef = useRef(null);

  const openPosModal = () => {
    setShowPosModal(true);
    setPosError('');
    setPosItems([{ productId: '', variantId: '', quantity: 1 }]);
    setPosCustomerName('');
    setPosEmail('');
    setPosPhone('');
    setPosUserId('');
    setMatchedCustomers([]);
    setShowCustomerSuggestions(false);
    setPosPaymentMethod('CASH');
    setPosDeliveryMode('STORE_PICKUP');
    setPosProvince('');
    setPosDistrict('');
    setPosWard('');
    setPosAddressDetail('');
    
    if (products.length === 0) {
      setLoadingProducts(true);
      productApi.list()
        .then((res) => {
          setProducts(res.data.data.filter(p => p.isActive));
          setLoadingProducts(false);
        })
        .catch((err) => {
          setPosError('Không thể tải danh sách sản phẩm: ' + getApiError(err));
          setLoadingProducts(false);
        });
    }
  };

  const handleCreateOfflineOrder = (e) => {
    e.preventDefault();
    const validItems = posItems.filter(item => item.productId && item.variantId && item.quantity > 0);
    if (validItems.length === 0) {
      setPosError('Vui lòng chọn ít nhất một sản phẩm hợp lệ.');
      return;
    }

    setPosSubmitting(true);
    setPosError('');
    
    if (posDeliveryMode === 'SHIPPING' && (!posProvince.trim() || !posDistrict.trim() || !posWard.trim() || !posAddressDetail.trim())) {
      setPosError('Vui lòng điền đầy đủ thông tin địa chỉ giao hàng.');
      setPosSubmitting(false);
      return;
    }

    managementOrderApi.createOffline({
      items: validItems,
      customerName: posCustomerName.trim() || undefined,
      email: posEmail.trim() || undefined,
      phone: posPhone.trim() || undefined,
      paymentMethod: posPaymentMethod,
      deliveryMode: posDeliveryMode,
      userId: posUserId || undefined,
      shippingAddress: posDeliveryMode === 'SHIPPING' ? {
        province: posProvince.trim(),
        district: posDistrict.trim(),
        ward: posWard.trim(),
        detail: posAddressDetail.trim()
      } : undefined
    })
      .then((res) => {
        setActionSuccess(`Tạo đơn hàng tại quầy ${res.data.data.orderCode} thành công.`);
        setShowPosModal(false);
        fetchOrders();
        if (window.confirm(`Tạo đơn ${res.data.data.orderCode} thành công. Bạn có muốn xem chi tiết và in hóa đơn ngay bây giờ?`)) {
          window.open(`/admin/orders/${res.data.data._id}`, '_blank');
        }
        setPosSubmitting(false);
      })
      .catch((err) => {
        setPosError(getApiError(err));
        setPosSubmitting(false);
      });
  };

  useEffect(() => {
    const searchVal = searchParams.get('search') || '';
    setSearchText(searchVal);
    setSearchQuery(searchVal);
    setPage(1);
  }, [searchParams]);

  // Auto-lookup customer details by email or phone in POS modal
  useEffect(() => {
    if (posUserId) return; // Guard: skip lookup if already selected

    const email = posEmail.trim().toLowerCase();
    const phone = posPhone.trim();

    if (document.activeElement === emailInputRef.current && email.length > 5 && /^\S+@\S+\.\S+$/.test(email)) {
      managementOrderApi.lookupCustomer({ email })
        .then((res) => {
          const list = res.data?.data || [];
          setMatchedCustomers(list);
          if (list.length === 1) {
            setPosUserId(list[0]._id);
            if (list[0].fullName) setPosCustomerName(list[0].fullName);
            if (list[0].phone) setPosPhone(list[0].phone);
            setShowCustomerSuggestions(false);
          } else if (list.length > 1) {
            setShowCustomerSuggestions(true);
          } else {
            setPosUserId('');
            setShowCustomerSuggestions(false);
          }
        })
        .catch(() => {});
    } else if (document.activeElement === phoneInputRef.current && !email && phone.length >= 10) {
      managementOrderApi.lookupCustomer({ phone })
        .then((res) => {
          const list = res.data?.data || [];
          setMatchedCustomers(list);
          if (list.length === 1) {
            setPosUserId(list[0]._id);
            if (list[0].fullName) setPosCustomerName(list[0].fullName);
            if (list[0].email && !list[0].email.endsWith('@phonestore.offline')) {
              setPosEmail(list[0].email);
            }
            setShowCustomerSuggestions(false);
          } else if (list.length > 1) {
            setShowCustomerSuggestions(true);
          } else {
            setPosUserId('');
            setShowCustomerSuggestions(false);
          }
        })
        .catch(() => {});
    } else if (document.activeElement === emailInputRef.current || document.activeElement === phoneInputRef.current) {
      setMatchedCustomers([]);
      setShowCustomerSuggestions(false);
    }
  }, [posEmail, posPhone, posUserId]);

  useEffect(() => {
    if (posDeliveryMode === 'SHIPPING' && (posPaymentMethod === 'CARD' || posPaymentMethod === 'CASH')) {
      setPosPaymentMethod('COD');
    } else if (posDeliveryMode === 'STORE_PICKUP' && posPaymentMethod === 'COD') {
      setPosPaymentMethod('CASH');
    }
  }, [posDeliveryMode, posPaymentMethod]);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    setError('');
    managementOrderApi.list({
      status: statusFilter || undefined,
      paymentMethod: paymentMethodFilter || undefined,
      paymentStatus: paymentStatusFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: searchQuery.trim() || undefined,
      page,
      limit: 10,
    })
      .then((response) => {
        setOrders(response.data.data);
        setStats(response.data.stats);
        setMeta(response.data.meta);
        setLoading(false);
      })
      .catch((requestError) => {
        setError(getApiError(requestError));
        setLoading(false);
      });
  }, [page, searchQuery, statusFilter, paymentMethodFilter, paymentStatusFilter, startDate, endDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(searchText);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleExportCsv = () => {
    setActionError('');
    setActionSuccess('');
    managementOrderApi.exportCsv({
      status: statusFilter || undefined,
      paymentMethod: paymentMethodFilter || undefined,
      paymentStatus: paymentStatusFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: searchQuery.trim() || undefined
    })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `danh_sach_don_hang_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        setActionSuccess('Xuất danh sách đơn hàng CSV thành công.');
      })
      .catch((err) => {
        setActionError('Không thể xuất báo cáo CSV: ' + getApiError(err));
      });
  };

  if (loading && page === 1) return <LoadingScreen />;

  return (
    <div className="admin-orders" style={{ padding: '1rem' }}>
      <div className="page-heading" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="eyebrow">QUẢN TRỊ</p>
          <h1>Quản lý đơn hàng</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={openPosModal}
            className="button button--primary"
            style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', fontWeight: 'bold' }}
          >
            + Tạo đơn tại quầy
          </button>
          <button
            onClick={handleExportCsv}
            className="button button--secondary"
            style={{ padding: '0.6rem 1.2rem', borderRadius: '6px', fontWeight: 'bold' }}
          >
            Xuất CSV
          </button>
        </div>
      </div>

      {/* Thẻ đếm việc cần làm */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #fbbc05' }}>
          <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>ĐƠN CHỜ XÁC NHẬN</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#111' }}>{stats?.pendingCount || 0}</div>
        </div>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #1a73e8' }}>
          <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>ĐƠN ĐANG GIAO HÀNG</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#111' }}>{stats?.shippingCount || 0}</div>
        </div>
        <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #ea4335' }}>
          <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>ĐƠN YÊU CẦU HỦY</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginTop: '0.5rem', color: '#111' }}>{stats?.cancelRequestedCount || 0}</div>
        </div>
      </div>

      {error && <FlashMessage type="error">{error}</FlashMessage>}
      {actionError && <FlashMessage type="error">{actionError}</FlashMessage>}
      {actionSuccess && <FlashMessage type="success">{actionSuccess}</FlashMessage>}

      <form onSubmit={handleSearchSubmit} className="filters-bar" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'nowrap', overflowX: 'auto', alignItems: 'center', paddingBottom: '0.25rem' }}>
          <input
            type="text"
            placeholder="Mã đơn, tên, SĐT, email... rồi ấn Enter"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="search-input"
            style={{ flex: 1, minWidth: '180px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <button type="submit" className="button button--secondary" style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}>Tìm kiếm</button>
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            style={{ width: 'auto', minWidth: '140px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(orderStatusLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={paymentMethodFilter}
            onChange={(e) => { setPaymentMethodFilter(e.target.value); setPage(1); }}
            style={{ width: 'auto', minWidth: '130px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">Tất cả PTTT</option>
            <option value="COD">COD</option>
            <option value="VNPAY">VNPAY</option>
            <option value="CASH">Tiền mặt</option>
            <option value="BANK_TRANSFER">Chuyển khoản</option>
            <option value="CARD">Quẹt thẻ POS</option>
          </select>
          <select
            value={paymentStatusFilter}
            onChange={(e) => { setPaymentStatusFilter(e.target.value); setPage(1); }}
            style={{ width: 'auto', minWidth: '130px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">Tất cả TTTT</option>
            <option value="PAID">Đã thanh toán</option>
            <option value="PENDING">Chờ thanh toán</option>
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="FAILED">Thất bại</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Từ ngày:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid #ddd', minWidth: '150px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'bold' }}>Đến ngày:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              style={{ padding: '0.45rem', borderRadius: '4px', border: '1px solid #ddd', minWidth: '150px' }}
            />
          </div>
          
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
              className="button button--secondary button--small"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
            >
              Xóa bộ lọc ngày
            </button>
          )}
        </div>
      </form>

      {orders.length === 0 ? (
        <div className="empty-state">Không tìm thấy đơn hàng nào.</div>
      ) : (
        <>
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', textAlign: 'left', borderBottom: '2px solid #e0e0e0', color: '#5f6368', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  <th style={{ padding: '0.5rem 0.35rem', whiteSpace: 'nowrap' }}>Mã đơn</th>
                  <th style={{ padding: '0.5rem 0.35rem', whiteSpace: 'nowrap' }}>Khách hàng</th>
                  <th style={{ padding: '0.5rem 0.35rem', whiteSpace: 'nowrap' }}>Thời gian đặt</th>
                  <th style={{ padding: '0.5rem 0.35rem', whiteSpace: 'nowrap' }}>Sản phẩm</th>
                  <th style={{ padding: '0.5rem 0.35rem', whiteSpace: 'nowrap' }}>Tổng tiền</th>
                  <th style={{ padding: '0.5rem 0.35rem', whiteSpace: 'nowrap' }}>Thanh toán</th>
                  <th style={{ padding: '0.5rem 0.35rem', whiteSpace: 'nowrap' }}>Trạng thái</th>
                  <th style={{ padding: '0.5rem 0.35rem', whiteSpace: 'nowrap', textAlign: 'right' }}>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const codeParts = order.orderCode.split('-');
                  const codePrefix = codeParts.slice(0, 2).join('-');
                  const codeSuffix = codeParts[2] || '';
                  
                  const dateObj = new Date(order.createdAt);
                  const formatPad = (n) => String(n).padStart(2, '0');

                  return (
                    <tr key={order._id} style={{ borderBottom: '1px solid #eee', fontSize: '0.8rem' }}>
                      <td style={{ padding: '0.5rem 0.35rem' }}>
                        <div style={{ 
                          fontFamily: 'SFMono-Regular, Consolas, Monaco, monospace', 
                          fontSize: '0.72rem', 
                          background: '#f1f3f4', 
                          color: '#202124', 
                          padding: '0.15rem 0.35rem', 
                          borderRadius: '4px',
                          border: '1px solid #e0e0e0',
                          display: 'inline-flex',
                          flexDirection: 'column',
                          lineHeight: '1.1'
                        }}>
                          <span style={{ color: '#5f6368' }}>{codePrefix}</span>
                          <span style={{ fontWeight: 'bold' }}>-{codeSuffix}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.5rem 0.35rem' }}>
                        <div style={{ fontWeight: '600', color: '#202124', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={order.shippingAddress.recipientName}>
                          {order.shippingAddress.recipientName}
                        </div>
                        {order.shippingAddress.phone && order.shippingAddress.phone !== '0000000000' && (
                          <div style={{ fontSize: '0.75rem', color: '#5f6368', marginTop: '1px' }}>{order.shippingAddress.phone}</div>
                        )}
                      </td>
                      <td style={{ padding: '0.5rem 0.35rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                          <span style={{ fontWeight: '600', color: '#202124' }}>{formatPad(dateObj.getHours())}:{formatPad(dateObj.getMinutes())}</span>
                          <span style={{ color: '#5f6368', fontSize: '0.75rem', marginTop: '1px' }}>{formatPad(dateObj.getDate())}/{formatPad(dateObj.getMonth() + 1)}/{dateObj.getFullYear()}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.5rem 0.35rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '180px', fontSize: '0.75rem', color: '#3c4043' }}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={`${item.productName} (${item.color}) x${item.quantity}`}>
                              {item.productName} <span style={{ color: '#1a73e8', fontWeight: 'bold' }}>x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '0.5rem 0.35rem', color: '#202124', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                        {currency.format(order.pricing.total)}
                      </td>
                      <td style={{ padding: '0.5rem 0.35rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', lineHeight: '1.1' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#202124' }}>{order.payment.method}</span>
                          <span style={{
                            padding: '0.15rem 0.35rem',
                            borderRadius: '3px',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            display: 'inline-block',
                            textAlign: 'center',
                            background: order.payment.status === 'PAID' ? '#e6f4ea' : order.payment.status === 'PENDING' ? '#fef7e0' : '#fce8e6',
                            color: order.payment.status === 'PAID' ? '#137333' : order.payment.status === 'PENDING' ? '#b06000' : '#c5221f'
                          }}>
                            {order.payment.status === 'PAID' ? 'Đã trả' : order.payment.status === 'PENDING' ? 'Chờ trả' : 'Chưa trả'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.5rem 0.35rem', whiteSpace: 'nowrap' }}>
                        <span className={`status status--${order.status.toLowerCase()}`} style={{
                          padding: '0.15rem 0.35rem',
                          borderRadius: '3px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          background: order.status === 'COMPLETED' ? '#e6f4ea' : order.status === 'CANCELLED' ? '#fce8e6' : '#fef7e0',
                          color: order.status === 'COMPLETED' ? '#137333' : order.status === 'CANCELLED' ? '#c5221f' : '#b06000'
                        }}>
                          {orderStatusLabels[order.status]}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem 0.35rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Link to={`/admin/orders/${order._id}`} className="button button--secondary button--small" style={{ textDecoration: 'none', padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px' }}>
                          Chi tiết
                        </Link>
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

      {showPosModal && (
        <div className="modal" style={{ display: 'block', position: 'fixed', zIndex: 1000, left: 0, top: 0, width: '100%', height: '100%', overflow: 'auto', backgroundColor: 'rgba(0,0,0,0.4)', padding: '2rem 1rem' }}>
          <div className="modal-content" style={{ background: '#fff', margin: 'auto', padding: '2rem', borderRadius: '8px', border: '1px solid #ddd', maxWidth: '650px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>
              <h2 style={{ margin: 0 }}>Tạo đơn hàng trực tiếp tại quầy (POS)</h2>
              <button type="button" onClick={() => setShowPosModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#999' }}>&times;</button>
            </div>
            
            {posError && <FlashMessage type="error">{posError}</FlashMessage>}
            
            <form onSubmit={handleCreateOfflineOrder}>
              <div style={{ marginBottom: '1rem', position: 'relative' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Khách hàng:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input
                    ref={emailInputRef}
                    type="email"
                    placeholder="Địa chỉ Email (Nhập để tự động tra cứu & liên kết)"
                    value={posEmail}
                    onChange={(e) => {
                      setPosUserId('');
                      setPosEmail(e.target.value);
                    }}
                    style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', width: '100%' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Tên khách hàng (Mặc định: Khách vãng lai)"
                      value={posCustomerName}
                      onChange={(e) => {
                        setPosUserId('');
                        setPosCustomerName(e.target.value);
                      }}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                    <input
                      ref={phoneInputRef}
                      type="text"
                      placeholder="Số điện thoại"
                      value={posPhone}
                      onChange={(e) => {
                        setPosUserId('');
                        setPosPhone(e.target.value);
                      }}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>

                  {showCustomerSuggestions && matchedCustomers.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                      zIndex: 10,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      marginTop: '0.25rem'
                    }}>
                      <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: '#666', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
                        Phát hiện trùng số điện thoại / Email. Vui lòng chọn tài khoản:
                      </div>
                      {matchedCustomers.map((c) => (
                        <div
                          key={c._id}
                          onClick={() => {
                            setPosUserId(c._id);
                            setPosCustomerName(c.fullName || '');
                            setPosPhone(c.phone || '');
                            if (c.email && !c.email.endsWith('@phonestore.offline')) {
                              setPosEmail(c.email);
                            } else {
                              setPosEmail('');
                            }
                            setShowCustomerSuggestions(false);
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            borderBottom: '1px solid #f5f5f5',
                            backgroundColor: '#fff'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f4f9'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#fff'}
                        >
                          👤 <strong>{c.fullName}</strong> {c.email && !c.email.endsWith('@phonestore.offline') ? `(${c.email})` : '(Tài khoản offline)'} - 📞 {c.phone}
                        </div>
                      ))}
                      <div
                        onClick={() => {
                          setPosUserId('');
                          setShowCustomerSuggestions(false);
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          color: '#1a73e8',
                          fontWeight: 'bold',
                          backgroundColor: '#f8f9fa'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#e8f0fe'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                      >
                        ➕ [+] Tạo tài khoản mới (cho phép dùng chung SĐT)
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Hình thức nhận hàng:</label>
                <select
                  value={posDeliveryMode}
                  onChange={(e) => setPosDeliveryMode(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer' }}
                >
                  <option value="STORE_PICKUP">🏪 Nhận trực tiếp tại cửa hàng</option>
                  <option value="SHIPPING">🚚 Giao hàng tận nơi (Telesale / Hotline)</option>
                </select>
              </div>

              {posDeliveryMode === 'SHIPPING' && (
                <div style={{ marginBottom: '1rem', border: '1px dashed #ccc', padding: '1rem', borderRadius: '6px', background: '#fafafa' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Địa chỉ giao nhận tận nơi:</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="Tỉnh / Thành phố"
                      value={posProvince}
                      onChange={(e) => setPosProvince(e.target.value)}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                    <input
                      type="text"
                      placeholder="Quận / Huyện"
                      value={posDistrict}
                      onChange={(e) => setPosDistrict(e.target.value)}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                    <input
                      type="text"
                      placeholder="Phường / Xã"
                      value={posWard}
                      onChange={(e) => setPosWard(e.target.value)}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Địa chỉ chi tiết (Số nhà, Tên đường...)"
                    value={posAddressDetail}
                    onChange={(e) => setPosAddressDetail(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Phương thức thanh toán:</label>
                <select
                  value={posPaymentMethod}
                  onChange={(e) => setPosPaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', cursor: 'pointer' }}
                >
                  {posDeliveryMode === 'SHIPPING' ? (
                    <>
                      <option value="COD">💵 Thanh toán khi nhận hàng (COD)</option>
                      <option value="BANK_TRANSFER">🏦 Chuyển khoản trước khi giao</option>
                    </>
                  ) : (
                    <>
                      <option value="CASH">💵 Tiền mặt tại quầy</option>
                      <option value="BANK_TRANSFER">🏦 Chuyển khoản QR / Ngân hàng</option>
                      <option value="CARD">💳 Quẹt thẻ ATM / Tín dụng</option>
                    </>
                  )}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>Sản phẩm chọn mua:</label>
                  <button
                    type="button"
                    onClick={() => setPosItems([...posItems, { productId: '', variantId: '', quantity: 1 }])}
                    className="button button--secondary button--small"
                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                  >
                    + Thêm sản phẩm
                  </button>
                </div>

                {loadingProducts ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>Đang tải danh sách sản phẩm...</div>
                ) : (
                  posItems.map((item, index) => {
                    const selectedProd = products.find(p => p._id === item.productId);
                    const variants = selectedProd ? selectedProd.variants : [];
                    
                    return (
                      <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                        <select
                          value={item.productId}
                          onChange={(e) => {
                            const newItems = [...posItems];
                            newItems[index].productId = e.target.value;
                            newItems[index].variantId = '';
                            setPosItems(newItems);
                          }}
                          style={{ flex: 2, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem' }}
                        >
                          <option value="">-- Chọn sản phẩm --</option>
                          {products.map(p => (
                            <option key={p._id} value={p._id}>{p.name}</option>
                          ))}
                        </select>

                        <select
                          value={item.variantId}
                          onChange={(e) => {
                            const newItems = [...posItems];
                            newItems[index].variantId = e.target.value;
                            setPosItems(newItems);
                          }}
                          disabled={!item.productId}
                          style={{ flex: 2, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem' }}
                        >
                          <option value="">-- Phân loại & Giá --</option>
                          {variants.map(v => (
                            <option key={v._id} value={v._id}>
                              {v.ram} - {v.storage} - {v.color} ({currency.format(v.salePrice)}) [Kho: {v.stock}]
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const newItems = [...posItems];
                            newItems[index].quantity = Math.max(1, parseInt(e.target.value) || 1);
                            setPosItems(newItems);
                          }}
                          disabled={!item.variantId}
                          style={{ width: '60px', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', textAlign: 'center' }}
                        />

                        {posItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setPosItems(posItems.filter((_, i) => i !== index))}
                            style={{ background: 'none', border: 'none', color: '#c5221f', fontSize: '1.5rem', cursor: 'pointer', padding: '0 0.25rem' }}
                          >
                            &times;
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                <button type="button" className="button button--secondary" onClick={() => setShowPosModal(false)} disabled={posSubmitting}>Hủy bỏ</button>
                <button type="submit" className="button button--primary" disabled={posSubmitting}>
                  {posSubmitting ? 'Đang tạo đơn...' : 'Hoàn tất đơn hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
