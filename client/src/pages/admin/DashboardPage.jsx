import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../../api/admin';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { currency } from '../../utils/order';

const lineConfig = {
  revenue: { label: 'Doanh thu', color: '#2b67e8', className: 'financial-line-toggle--revenue' },
  profit: { label: 'Lợi nhuận', color: '#10b981', className: 'financial-line-toggle--profit' },
};
const statusLabels = { PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận', PREPARING: 'Đang chuẩn bị', SHIPPING: 'Đang giao', COMPLETED: 'Hoàn thành', CANCEL_REQUESTED: 'Yêu cầu hủy', CANCELLED: 'Đã hủy' };

function compactCurrency(value) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
}

function getNiceMax(value) {
  if (value <= 0) return 1_000_000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude / 5) * 5 * magnitude;
}

function FinancialLineChart({ data, enabledLines }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const width = 960;
  const height = 408;
  const padding = { top: 28, right: 28, bottom: 76, left: 110 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const selectedKeys = Object.keys(enabledLines).filter((key) => enabledLines[key]);
  const values = data.flatMap((item) => selectedKeys.map((key) => item[key]));
  const maxValue = getNiceMax(Math.max(...values, 0));
  const minRawValue = Math.min(...values, 0);
  const minValue = minRawValue < 0 ? -getNiceMax(Math.abs(minRawValue)) : 0;
  const valueRange = maxValue - minValue;
  const points = data.map((item, index) => ({
    ...item,
    x: padding.left + (index * plotWidth) / Math.max(1, data.length - 1),
  }));
  const yFor = (value) => padding.top + ((maxValue - value) / valueRange) * plotHeight;
  const hoveredPoint = hoveredIndex === null ? null : points[hoveredIndex];
  const activeY = hoveredPoint ? Math.min(...selectedKeys.map((key) => yFor(hoveredPoint[key]))) : 0;

  if (data.length === 0) return <div className="financial-chart__empty">Không có đơn hàng hoàn thành trong khoảng thời gian đã chọn.</div>;

  return (
    <div className="financial-chart" onMouseLeave={() => setHoveredIndex(null)}>
      {hoveredPoint && <div className="financial-chart__tooltip" style={{ left: `${Math.min(88, Math.max(12, (hoveredPoint.x / width) * 100))}%`, top: `${Math.max(10, activeY - 8)}px` }}>
        <strong>{hoveredPoint.fullLabel}</strong>
        {selectedKeys.map((key) => <span key={key}><i style={{ background: lineConfig[key].color }} />{lineConfig[key].label}<b>{compactCurrency(hoveredPoint[key])}</b></span>)}
        <em>{hoveredPoint.orderCount} đơn hoàn thành</em>
      </div>}
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Biểu đồ doanh thu và lợi nhuận" preserveAspectRatio="none">
        {[0, 1, 2, 3, 4].map((index) => {
          const value = maxValue - (valueRange * index) / 4;
          const y = padding.top + (plotHeight * index) / 4;
          return <g key={index}><line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="financial-chart__grid" /><text x={padding.left - 12} y={y + 4} className="financial-chart__axis-value">{compactCurrency(value)}</text></g>;
        })}
        {selectedKeys.map((key) => {
          const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${yFor(point[key])}`).join(' ');
          const baseline = yFor(0);
          const areaPath = `${path} L ${points.at(-1).x} ${baseline} L ${points[0].x} ${baseline} Z`;
          return <g key={key}>
            <path d={areaPath} fill={`url(#${key}Gradient)`} className="financial-chart__area" />
            <path d={path} fill="none" stroke={lineConfig[key].color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>;
        })}
        <defs>
          {selectedKeys.map((key) => <linearGradient key={key} id={`${key}Gradient`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={lineConfig[key].color} stopOpacity="0.17" /><stop offset="100%" stopColor={lineConfig[key].color} stopOpacity="0" /></linearGradient>)}
        </defs>
        {selectedKeys.flatMap((key) => points.map((point, index) => <g key={`${key}-${point.key}`} className="financial-chart__node" onMouseEnter={() => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(null)} onFocus={() => setHoveredIndex(index)} onBlur={() => setHoveredIndex(null)} tabIndex="0"><circle cx={point.x} cy={yFor(point[key])} r="10" fill={lineConfig[key].color} fillOpacity="0.18" /><circle cx={point.x} cy={yFor(point[key])} r="6.5" fill={lineConfig[key].color} stroke="#fff" strokeWidth="3" /></g>))}
        {points.map((point) => <g key={`label-${point.key}`}><text x={point.x} y={height - 38} textAnchor="middle" className="financial-chart__label">{point.label}</text><text x={point.x} y={height - 17} textAnchor="middle" className="financial-chart__count">{point.orderCount} đơn</text></g>)}
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const [overview, setOverview] = useState(null);
  const [financialData, setFinancialData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [by, setBy] = useState('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [source, setSource] = useState('');
  const [enabledLines, setEnabledLines] = useState({ revenue: true, profit: true });
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [error, setError] = useState('');
  const chartRequestRef = useRef(0);

  async function loadChart(nextBy = by, nextStart = startDate, nextEnd = endDate, nextSource = source) {
    const requestId = chartRequestRef.current + 1;
    chartRequestRef.current = requestId;
    setLoadingChart(true);
    try {
      const response = await dashboardApi.getRevenue({ 
        by: nextBy, 
        startDate: nextStart || undefined, 
        endDate: nextEnd || undefined,
        source: nextSource || undefined
      });
      if (requestId !== chartRequestRef.current) return;
      setFinancialData(response.data.data);
      setError('');
    } catch (requestError) {
      if (requestId !== chartRequestRef.current) return;
      setError(getApiError(requestError));
    } finally {
      if (requestId === chartRequestRef.current) setLoadingChart(false);
    }
  }

  useEffect(() => {
    Promise.all([dashboardApi.getOverview(), dashboardApi.getRevenue({ by: 'month' }), dashboardApi.getTopProducts(), dashboardApi.getLowStock()])
      .then(([overviewResponse, chartResponse, topResponse, stockResponse]) => {
        setOverview(overviewResponse.data.data);
        setFinancialData(chartResponse.data.data);
        setTopProducts(topResponse.data.data);
        setLowStock(stockResponse.data.data);
      })
      .catch((requestError) => setError(getApiError(requestError)))
      .finally(() => setLoading(false));
  }, []);

  function toggleLine(key) {
    if (enabledLines[key] && Object.values(enabledLines).filter(Boolean).length === 1) return;
    setEnabledLines((current) => ({ ...current, [key]: !current[key] }));
  }

  function changePeriod(nextBy) {
    setBy(nextBy);
    setStartDate('');
    setEndDate('');
    loadChart(nextBy, '', '', source);
  }

  function changeSource(nextSource) {
    setSource(nextSource);
    loadChart(by, startDate, endDate, nextSource);
  }

  function changeStartDate(nextStartDate) {
    setStartDate(nextStartDate);
    loadChart(by, nextStartDate, endDate, source);
  }

  function changeEndDate(nextEndDate) {
    setEndDate(nextEndDate);
    loadChart(by, startDate, nextEndDate, source);
  }

  const primaryKey = enabledLines.revenue ? 'revenue' : 'profit';
  const totalPrimary = financialData.reduce((total, item) => total + item[primaryKey], 0);
  const totalOrders = financialData.reduce((total, item) => total + item.orderCount, 0);
  const peak = financialData.reduce((best, item) => item[primaryKey] > (best?.[primaryKey] ?? -1) ? item : best, null);
  const rangeLabel = financialData.length ? `${financialData[0].fullLabel} – ${financialData.at(-1).fullLabel}` : 'Khoảng thời gian đã chọn';

  const totalRevenueAll = financialData.reduce((sum, item) => sum + item.revenue, 0);
  const totalProfitAll = financialData.reduce((sum, item) => sum + item.profit, 0);
  const totalCompletedOrders = financialData.reduce((sum, item) => sum + item.orderCount, 0);
  const avgProfitMarginAll = totalRevenueAll > 0 ? (totalProfitAll / totalRevenueAll) * 100 : 0;

  if (loading) return <LoadingScreen />;
  return (
    <div className="admin-page dashboard-page">
      <div className="page-heading dashboard-page__heading"><div><p className="eyebrow">PHÂN TÍCH KINH DOANH</p><h1>Tổng quan cửa hàng</h1><p>Theo dõi đơn hoàn thành, doanh thu và lợi nhuận theo từng thời điểm.</p></div></div>
      <FlashMessage type="error">{error}</FlashMessage>
      <div className="dashboard-metrics">
        <article><span>Doanh thu hoàn thành</span><strong>{currency.format(overview.totalRevenue)}</strong></article>
        <article>
          <span>Lợi nhuận ước tính</span>
          <strong>{currency.format(overview.totalProfit)}</strong>
          <small style={{ display: 'block', fontSize: '0.72rem', color: '#137333', fontWeight: 'bold', marginTop: '2px', background: '#e6f4ea', padding: '1px 5px', borderRadius: '4px', width: 'fit-content' }}>
            Tỷ suất: {(overview.totalRevenue > 0 ? (overview.totalProfit / overview.totalRevenue) * 100 : 0).toFixed(1)}%
          </small>
        </article>
        <article><span>Tổng đơn hàng</span><strong>{overview.totalOrders.toLocaleString('vi-VN')}</strong></article>
        <article><span>Khách hàng</span><strong>{overview.totalUsers.toLocaleString('vi-VN')}</strong></article>
      </div>

      {/* Tỷ trọng kênh bán hàng */}
      <div className="panel" style={{ background: '#fff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #eee', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#5f6368', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tỷ trọng kênh bán hàng</h3>
        {overview.totalRevenue > 0 ? (
          <>
            <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', background: '#e0e0e0', marginBottom: '0.75rem' }}>
              <div style={{ width: `${(overview.onlineRevenue / overview.totalRevenue) * 100}%`, background: '#2b67e8', transition: 'width 0.3s ease' }} />
              <div style={{ width: `${(overview.offlineRevenue / overview.totalRevenue) * 100}%`, background: '#e37400', transition: 'width 0.3s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 'bold', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#2b67e8' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#2b67e8', borderRadius: '50%' }} />
                Đơn hàng Online: {currency.format(overview.onlineRevenue)} ({((overview.onlineRevenue / overview.totalRevenue) * 100).toFixed(1)}%) — {overview.onlineCount} đơn
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#e37400' }}>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', background: '#e37400', borderRadius: '50%' }} />
                Tại quầy (POS): {currency.format(overview.offlineRevenue)} ({((overview.offlineRevenue / overview.totalRevenue) * 100).toFixed(1)}%) — {overview.offlineCount} đơn
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic' }}>Chưa có doanh thu hoàn thành để tính tỷ trọng.</div>
        )}
      </div>

      <section className="financial-dashboard panel">
        <div className="financial-dashboard__topline">
          <div><p className="eyebrow">BIỂU ĐỒ TÀI CHÍNH</p><h2>{compactCurrency(totalPrimary)}</h2><p>{totalOrders} đơn hoàn thành trong khoảng {rangeLabel}</p></div>
          <div className="financial-dashboard__filters" aria-label="Bộ lọc biểu đồ tài chính">
            <label><span>Nguồn đơn</span>
              <select value={source} onChange={(event) => changeSource(event.target.value)}>
                <option value="">Tất cả</option>
                <option value="online">Đơn Online</option>
                <option value="offline">Tại quầy (POS)</option>
              </select>
            </label>
            <label><span>Nhóm theo</span><select value={by} onChange={(event) => changePeriod(event.target.value)}><option value="day">Theo ngày</option><option value="month">Theo tháng</option><option value="year">Theo năm</option></select></label>
            <label><span>Từ ngày</span><input type="date" value={startDate} max={endDate || undefined} onChange={(event) => changeStartDate(event.target.value)} /></label>
            <label><span>Đến ngày</span><input type="date" value={endDate} min={startDate || undefined} onChange={(event) => changeEndDate(event.target.value)} /></label>
          </div>
        </div>

        <div className="financial-dashboard__summary">
          <article><span>SỐ KỲ</span><strong>{financialData.length}</strong></article>
          <article><span>TRUNG BÌNH</span><strong>{compactCurrency(financialData.length ? totalPrimary / financialData.length : 0)}</strong></article>
          <article><span>CAO NHẤT</span><strong>{peak ? compactCurrency(peak[primaryKey]) : '0 đ'}</strong><small>{peak?.fullLabel || 'Chưa có dữ liệu'}</small></article>
          <div className="financial-line-controls"><span>LINE HIỂN THỊ</span>{Object.keys(lineConfig).map((key) => <button type="button" key={key} className={`financial-line-toggle ${lineConfig[key].className} ${enabledLines[key] ? 'financial-line-toggle--selected' : ''}`} onClick={() => toggleLine(key)} aria-pressed={enabledLines[key]}><input type="checkbox" checked={enabledLines[key]} readOnly /><i /><b>{lineConfig[key].label}</b><small>{compactCurrency(financialData.reduce((total, item) => total + item[key], 0))}</small></button>)}</div>
        </div>
        {loadingChart ? <div className="financial-chart__loading">Đang tải dữ liệu biểu đồ...</div> : <FinancialLineChart data={financialData} enabledLines={enabledLines} />}

        {/* Bảng đối soát chi tiết */}
        <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 'bold' }}>Bảng đối soát doanh thu và lợi nhuận chi tiết</h3>
          <div className="table-scroll">
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '0.75rem' }}>Kỳ thời gian</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Số đơn hoàn thành</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Doanh thu</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Lợi nhuận</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Tỷ suất lợi nhuận (%)</th>
                </tr>
              </thead>
              <tbody>
                {financialData.map((item) => {
                  const margin = item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0;
                  return (
                    <tr key={item.key} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '0.75rem' }}>{item.fullLabel}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>{item.orderCount}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#2b67e8', fontWeight: 'bold' }}>{currency.format(item.revenue)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#10b981', fontWeight: 'bold' }}>{currency.format(item.profit)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>{margin.toFixed(1)}%</td>
                    </tr>
                  );
                })}
                {financialData.length > 0 && (
                  <tr style={{ background: '#f9f9f9', fontWeight: 'bold', borderTop: '2px solid #ccc' }}>
                    <td style={{ padding: '0.75rem' }}>Tổng cộng</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>{totalCompletedOrders}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: '#2b67e8' }}>{currency.format(totalRevenueAll)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: '#10b981' }}>{currency.format(totalProfitAll)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>{avgProfitMarginAll.toFixed(1)}%</td>
                  </tr>
                )}
                {financialData.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>Không có dữ liệu đối soát.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="dashboard-lower-grid">
        <section className="panel dashboard-table-card"><div className="dashboard-table-card__heading"><div><p className="eyebrow">SẢN PHẨM</p><h2>Bán chạy nhất</h2></div><Link to="/admin/products">Quản lý kho</Link></div>{topProducts.length ? <div className="table-scroll"><table><thead><tr><th>Sản phẩm</th><th>Đã bán</th><th>Doanh thu</th><th>Lợi nhuận</th></tr></thead><tbody>{topProducts.map((item) => <tr key={`${item._id.productId}-${item._id.variantId}`}><td><strong>{item.productName}</strong><small>{item.ram} · {item.storage} · {item.color}</small></td><td>{item.quantitySold}</td><td>{currency.format(item.totalRevenue)}</td><td className={item.totalProfit < 0 ? 'amount-negative' : 'amount-positive'}>{currency.format(item.totalProfit)}</td></tr>)}</tbody></table></div> : <p className="empty-store">Chưa có dữ liệu kinh doanh.</p>}</section>
        <section className="panel dashboard-table-card"><div className="dashboard-table-card__heading"><div><p className="eyebrow">TỒN KHO</p><h2>Cảnh báo sắp hết hàng</h2></div><Link to="/admin/products">Xem sản phẩm</Link></div>{lowStock.length ? <div className="low-stock-list">{lowStock.slice(0, 8).map((item) => <article key={item.variantId}><div><strong>{item.productName}</strong><span>{item.ram} · {item.storage} · {item.color}</span><small>SKU: {item.sku}</small></div><b className={item.stock === 0 ? 'stock-pill stock-pill--empty' : 'stock-pill'}>{item.stock === 0 ? 'Hết hàng' : `${item.stock} cái`}</b></article>)}</div> : <p className="empty-store">Tất cả biến thể đang đủ tồn kho.</p>}</section>
      </div>

      <section className="panel dashboard-status"><div><p className="eyebrow">ĐƠN HÀNG</p><h2>Trạng thái đơn</h2></div><div>{Object.entries(statusLabels).map(([status, label]) => <article key={status}><span>{label}</span><strong>{overview.statusBreakdown[status] || 0}</strong></article>)}</div></section>
    </div>
  );
}
