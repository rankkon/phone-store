import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api/admin';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { currency } from '../../utils/order';

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // States bộ lọc doanh thu nâng cao
  const [by, setBy] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filtering, setFiltering] = useState(false);

  const loadRevenue = (groupUnit = by, start = startDate, end = endDate) => {
    setFiltering(true);
    dashboardApi.getRevenue({
      by: groupUnit,
      startDate: start || undefined,
      endDate: end || undefined
    })
      .then((res) => {
        setRevenueData(res.data.data);
        setFiltering(false);
      })
      .catch((err) => {
        setError(getApiError(err));
        setFiltering(false);
      });
  };

  useEffect(() => {
    Promise.all([
      dashboardApi.getOverview(),
      dashboardApi.getTopProducts(),
      dashboardApi.getLowStock()
    ])
      .then(([overviewRes, topRes, lowRes]) => {
        setOverview(overviewRes.data.data);
        setTopProducts(topRes.data.data);
        setLowStock(lowRes.data.data);
        return dashboardApi.getRevenue({ by });
      })
      .then((res) => {
        setRevenueData(res.data.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(getApiError(err));
        setLoading(false);
      });
  }, []);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadRevenue(by, startDate, endDate);
  };

  if (loading) return <LoadingScreen />;

  // Tính toán tọa độ vẽ biểu đồ SVG
  const renderRevenueChart = () => {
    if (filtering) {
      return (
        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
          Đang tải dữ liệu biểu đồ...
        </div>
      );
    }

    if (revenueData.length === 0) {
      return (
        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontStyle: 'italic', background: '#fafafa', borderRadius: '8px' }}>
          Không có dữ liệu doanh thu trong khoảng thời gian và đơn vị gom nhóm đã chọn.
        </div>
      );
    }

    const width = 600;
    const height = 220;
    const padding = 40;

    const maxRevenue = Math.max(...revenueData.map((d) => d.revenue), 1000000);
    const points = revenueData.map((d, i) => {
      const x = padding + (i * (width - 2 * padding)) / Math.max(1, revenueData.length - 1);
      const y = height - padding - (d.revenue * (height - 2 * padding)) / maxRevenue;
      
      let label = '';
      if (d._id.day) {
        label = `${d._id.day}/${d._id.month}`;
      } else if (d._id.quarter) {
        label = `Q${d._id.quarter}/${d._id.year}`;
      } else if (d._id.month) {
        label = `T${d._id.month}/${d._id.year}`;
      } else {
        label = `${d._id.year}`;
      }
      return { x, y, label, val: d.revenue };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : '';

    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a73e8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#1a73e8" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
            const y = padding + r * (height - 2 * padding);
            const val = maxRevenue * (1 - r);
            return (
              <g key={idx}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f0f0f0" strokeDasharray="4 4" />
                <text x={padding - 8} y={y + 4} fill="#888" fontSize="10" textAnchor="end">{currency.format(val).replace(' ₫', '')}</text>
              </g>
            );
          })}

          {/* Area under curve */}
          {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}

          {/* Core trend line */}
          <path d={linePath} fill="none" stroke="#1a73e8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Markers and X labels */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="5" fill="#1a73e8" stroke="#fff" strokeWidth="2" />
              <text x={p.x} y={height - 12} fill="#666" fontSize="10" textAnchor="middle">{p.label}</text>
              <text x={p.x} y={p.y - 10} fill="#1a73e8" fontSize="9" fontWeight="bold" textAnchor="middle">
                {currency.format(p.val).replace(' ₫', '')}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  const renderStatusBreakdown = () => {
    if (!overview || !overview.statusBreakdown) return null;
    
    const statuses = [
      { key: 'COMPLETED', label: 'Đã hoàn thành', color: '#137333', bg: '#e6f4ea' },
      { key: 'PENDING', label: 'Chờ xác nhận', color: '#b06000', bg: '#fef7e0' },
      { key: 'CONFIRMED', label: 'Đã xác nhận', color: '#1a73e8', bg: '#e8f0fe' },
      { key: 'SHIPPING', label: 'Đang giao hàng', color: '#8d11ac', bg: '#fbf0ff' },
      { key: 'CANCELLED', label: 'Đã hủy đơn', color: '#c5221f', bg: '#fce8e6' }
    ];

    const total = Object.values(overview.statusBreakdown).reduce((a, b) => a + b, 0) || 1;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
        {statuses.map((st) => {
          const count = overview.statusBreakdown[st.key] || 0;
          const percent = Math.round((count / total) * 100);
          return (
            <div key={st.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                <span>{st.label} ({count})</span>
                <strong>{percent}%</strong>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${percent}%`, height: '100%', background: st.color, borderRadius: '4px', transition: 'width 0.5s' }}></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="admin-dashboard" style={{ padding: '1rem', background: '#fcfcfd', minHeight: '100vh' }}>
      <div className="page-heading" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="eyebrow">QUẢN TRỊ</p>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0.2rem 0' }}>Tổng quan hệ thống</h1>
          <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>Theo dõi kết quả kinh doanh và quản trị hoạt động cửa hàng</p>
        </div>
      </div>

      {error && <FlashMessage type="error">{error}</FlashMessage>}

      {overview && (
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
          <div className="card" style={{
            background: '#fff',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #eef0f2',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'; }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#eaf2fd', color: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            </div>
            <div>
              <span style={{ color: '#8c98a5', fontSize: '0.85rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tổng doanh thu</span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.2rem 0', color: '#1a73e8' }}>{currency.format(overview.totalRevenue)}</h2>
              <small style={{ color: '#a0aec0' }}>Đơn hàng hoàn tất</small>
            </div>
          </div>

          <div className="card" style={{
            background: '#fff',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #eef0f2',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'; }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#e6f4ea', color: '#137333', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" /></svg>
            </div>
            <div>
              <span style={{ color: '#8c98a5', fontSize: '0.85rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Đơn đã nhận</span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.2rem 0' }}>{overview.totalOrders} đơn</h2>
              <small style={{ color: '#a0aec0' }}>Đã lưu hệ thống</small>
            </div>
          </div>

          <div className="card" style={{
            background: '#fff',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #eef0f2',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'; }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#fff7e0', color: '#b06000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
            </div>
            <div>
              <span style={{ color: '#8c98a5', fontSize: '0.85rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sản phẩm mẫu</span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.2rem 0' }}>{overview.totalProducts} dòng</h2>
              <small style={{ color: '#a0aec0' }}>Điện thoại đang bán</small>
            </div>
          </div>

          <div className="card" style={{
            background: '#fff',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid #eef0f2',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.02)'; }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#fbf0ff', color: '#8d11ac', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            </div>
            <div>
              <span style={{ color: '#8c98a5', fontSize: '0.85rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thành viên</span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0.2rem 0' }}>{overview.totalUsers} TK</h2>
              <small style={{ color: '#a0aec0' }}>Khách & nhân viên</small>
            </div>
          </div>
        </div>
      )}

      {/* Bộ lọc doanh thu nâng cao */}
      <section className="panel" style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #eef0f2', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', marginBottom: '1.5rem' }}>
        <form onSubmit={handleFilterSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="group-by" style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#666' }}>Xem theo từng</label>
            <select
              id="group-by"
              value={by}
              onChange={(e) => setBy(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd', minWidth: '120px' }}
            >
              <option value="day">Từng Ngày</option>
              <option value="month">Từng Tháng</option>
              <option value="quarter">Từng Quý</option>
              <option value="year">Từng Năm</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="start-date" style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#666' }}>Từ ngày</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="end-date" style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#666' }}>Đến ngày</label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd' }}
            />
          </div>

          <button
            type="submit"
            className="button"
            style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', height: '38px', background: '#1a73e8', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
            disabled={filtering}
          >
            {filtering ? 'Đang lọc...' : 'Lọc dữ liệu'}
          </button>
        </form>
      </section>

      {/* Phần biểu đồ và phân tích trạng thái */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <section className="panel" style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #eef0f2', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#1a73e8' }}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            Biểu đồ xu hướng doanh thu
          </h2>
          {renderRevenueChart()}
        </section>

        <section className="panel" style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #eef0f2', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#b06000' }}><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
            Cấu trúc trạng thái đơn hàng
          </h2>
          {renderStatusBreakdown()}
        </section>
      </div>

      {/* Grid danh sách chi tiết */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        <section className="panel" style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #eef0f2', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f6f8fa', paddingBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#137333' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
              Sản phẩm bán chạy nhất
            </h2>
          </div>
          {topProducts.length === 0 ? (
            <p style={{ color: '#888', fontStyle: 'italic', padding: '1rem 0' }}>Chưa có số liệu kinh doanh.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #eef0f2', color: '#718096', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Sản phẩm</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Đã bán</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Doanh số</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f8f9fa' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{ fontWeight: '600', color: '#2d3748' }}>{item.productName}</span>
                        <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '0.15rem' }}>{item.ram} · {item.storage} · {item.color}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold', color: '#137333' }}>
                        {item.quantitySold}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 'bold' }}>
                        {currency.format(item.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel" style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #eef0f2', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f6f8fa', paddingBottom: '0.5rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#c5221f' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              Biến thể sắp hết hàng (Tồn kho &lt; 10)
            </h2>
            <Link to="/admin/products" style={{ fontSize: '0.85rem', color: '#1a73e8', textDecoration: 'none' }}>Quản lý kho</Link>
          </div>
          {lowStock.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#137333', background: '#e6f4ea', borderRadius: '8px', fontWeight: 'bold' }}>
              ✓ Tất cả biến thể đều có đủ tồn kho!
            </div>
          ) : (
            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #eef0f2', color: '#718096', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Điện thoại</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Hàng tồn</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.slice(0, 10).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f8f9fa' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{ fontWeight: '600', color: '#2d3748' }}>{item.productName}</span>
                        <div style={{ fontSize: '0.8rem', color: '#718096', marginTop: '0.15rem' }}>{item.ram} · {item.storage} · {item.color}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          background: item.stock === 0 ? '#fce8e6' : '#fef7e0',
                          color: item.stock === 0 ? '#c5221f' : '#b06000'
                        }}>
                          {item.stock === 0 ? 'Hết hàng' : `${item.stock} cái`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {lowStock.length > 10 && (
                <div style={{ textAlign: 'center', padding: '0.75rem 0 0 0', fontSize: '0.85rem', color: '#718096', borderTop: '1px solid #eef0f2' }}>
                  Còn {lowStock.length - 10} biến thể khác đang ở mức cảnh báo tồn kho.
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
