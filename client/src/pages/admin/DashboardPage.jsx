import { useEffect, useState } from 'react';
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
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`;
  if (absolute >= 1_000) return `${Math.round(value / 1_000).toLocaleString('vi-VN')} nghìn`;
  return `${Math.round(value).toLocaleString('vi-VN')} đ`;
}

function getNiceMax(value) {
  if (value <= 0) return 1_000_000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude / 5) * 5 * magnitude;
}

function FinancialLineChart({ data, enabledLines, onHover }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const width = 960;
  const height = 408;
  const padding = { top: 28, right: 28, bottom: 76, left: 74 };
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

  useEffect(() => { onHover(hoveredPoint || null); }, [hoveredIndex]); // eslint-disable-line react-hooks/exhaustive-deps

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
        {selectedKeys.flatMap((key) => points.map((point, index) => <g key={`${key}-${point.key}`} className="financial-chart__node" onMouseEnter={() => setHoveredIndex(index)} onFocus={() => setHoveredIndex(index)} tabIndex="0"><circle cx={point.x} cy={yFor(point[key])} r="10" fill={lineConfig[key].color} fillOpacity="0.18" /><circle cx={point.x} cy={yFor(point[key])} r="6.5" fill={lineConfig[key].color} stroke="#fff" strokeWidth="3" /></g>))}
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
  const [enabledLines, setEnabledLines] = useState({ revenue: true, profit: true });
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [error, setError] = useState('');

  async function loadChart(nextBy = by, nextStart = startDate, nextEnd = endDate) {
    setLoadingChart(true);
    try {
      const response = await dashboardApi.getRevenue({ by: nextBy, startDate: nextStart || undefined, endDate: nextEnd || undefined });
      setFinancialData(response.data.data);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoadingChart(false);
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

  function submitFilter(event) {
    event.preventDefault();
    loadChart();
  }

  function changePeriod(nextBy) {
    setBy(nextBy);
    setStartDate('');
    setEndDate('');
    loadChart(nextBy, '', '');
  }

  const selectedLineKeys = Object.keys(enabledLines).filter((key) => enabledLines[key]);
  const primaryKey = enabledLines.revenue ? 'revenue' : 'profit';
  const totalPrimary = financialData.reduce((total, item) => total + item[primaryKey], 0);
  const totalOrders = financialData.reduce((total, item) => total + item.orderCount, 0);
  const peak = financialData.reduce((best, item) => item[primaryKey] > (best?.[primaryKey] ?? -1) ? item : best, null);
  const rangeLabel = financialData.length ? `${financialData[0].fullLabel} – ${financialData.at(-1).fullLabel}` : 'Khoảng thời gian đã chọn';

  if (loading) return <LoadingScreen />;
  return (
    <div className="admin-page dashboard-page">
      <div className="page-heading dashboard-page__heading"><div><p className="eyebrow">PHÂN TÍCH KINH DOANH</p><h1>Tổng quan cửa hàng</h1><p>Theo dõi đơn hoàn thành, doanh thu và lợi nhuận theo từng thời điểm.</p></div></div>
      <FlashMessage type="error">{error}</FlashMessage>
      <div className="dashboard-metrics">
        <article><span>Doanh thu hoàn thành</span><strong>{currency.format(overview.totalRevenue)}</strong></article>
        <article><span>Lợi nhuận ước tính</span><strong>{currency.format(overview.totalProfit)}</strong></article>
        <article><span>Tổng đơn hàng</span><strong>{overview.totalOrders.toLocaleString('vi-VN')}</strong></article>
        <article><span>Khách hàng</span><strong>{overview.totalUsers.toLocaleString('vi-VN')}</strong></article>
      </div>

      <section className="financial-dashboard panel">
        <div className="financial-dashboard__topline">
          <div><p className="eyebrow">BIỂU ĐỒ TÀI CHÍNH</p><h2>{compactCurrency(totalPrimary)}</h2><p>{totalOrders} đơn hoàn thành trong khoảng {rangeLabel}</p></div>
          <form className="financial-dashboard__filters" onSubmit={submitFilter}>
            <label>Nhóm theo<select value={by} onChange={(event) => changePeriod(event.target.value)}><option value="day">Theo ngày</option><option value="month">Theo tháng</option><option value="year">Theo năm</option></select></label>
            <label>Từ ngày<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label>Đến ngày<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
            <button className="button button--secondary" type="submit" disabled={loadingChart}>{loadingChart ? 'Đang tải...' : 'Áp dụng'}</button>
          </form>
        </div>

        <div className="financial-dashboard__summary">
          <article><span>SỐ KỲ</span><strong>{financialData.length}</strong></article>
          <article><span>TRUNG BÌNH</span><strong>{compactCurrency(financialData.length ? totalPrimary / financialData.length : 0)}</strong></article>
          <article><span>CAO NHẤT</span><strong>{peak ? compactCurrency(peak[primaryKey]) : '0 đ'}</strong><small>{peak?.fullLabel || 'Chưa có dữ liệu'}</small></article>
          <div className="financial-line-controls"><span>LINE HIỂN THỊ</span>{Object.keys(lineConfig).map((key) => <button type="button" key={key} className={`financial-line-toggle ${lineConfig[key].className} ${enabledLines[key] ? 'financial-line-toggle--selected' : ''}`} onClick={() => toggleLine(key)} aria-pressed={enabledLines[key]}><input type="checkbox" checked={enabledLines[key]} readOnly /><i /><b>{lineConfig[key].label}</b><small>{compactCurrency(financialData.reduce((total, item) => total + item[key], 0))}</small></button>)}</div>
        </div>
        {loadingChart ? <div className="financial-chart__loading">Đang tải dữ liệu biểu đồ...</div> : <FinancialLineChart data={financialData} enabledLines={enabledLines} onHover={setHoveredPoint} />}
        <p className="financial-dashboard__footnote">{hoveredPoint ? `Đang xem: ${hoveredPoint.fullLabel}` : `Hiển thị ${selectedLineKeys.map((key) => lineConfig[key].label.toLowerCase()).join(' và ')}. Lợi nhuận = doanh thu thực nhận − giá nhập của sản phẩm trong đơn.`}</p>
      </section>

      <div className="dashboard-lower-grid">
        <section className="panel dashboard-table-card"><div className="dashboard-table-card__heading"><div><p className="eyebrow">SẢN PHẨM</p><h2>Bán chạy nhất</h2></div><Link to="/admin/products">Quản lý kho</Link></div>{topProducts.length ? <div className="table-scroll"><table><thead><tr><th>Sản phẩm</th><th>Đã bán</th><th>Doanh thu</th><th>Lợi nhuận</th></tr></thead><tbody>{topProducts.map((item) => <tr key={`${item._id.productId}-${item._id.variantId}`}><td><strong>{item.productName}</strong><small>{item.ram} · {item.storage} · {item.color}</small></td><td>{item.quantitySold}</td><td>{currency.format(item.totalRevenue)}</td><td className={item.totalProfit < 0 ? 'amount-negative' : 'amount-positive'}>{currency.format(item.totalProfit)}</td></tr>)}</tbody></table></div> : <p className="empty-store">Chưa có dữ liệu kinh doanh.</p>}</section>
        <section className="panel dashboard-table-card"><div className="dashboard-table-card__heading"><div><p className="eyebrow">TỒN KHO</p><h2>Cảnh báo sắp hết hàng</h2></div><Link to="/admin/products">Xem sản phẩm</Link></div>{lowStock.length ? <div className="low-stock-list">{lowStock.slice(0, 8).map((item) => <article key={item.variantId}><div><strong>{item.productName}</strong><span>{item.ram} · {item.storage} · {item.color}</span><small>SKU: {item.sku}</small></div><b className={item.stock === 0 ? 'stock-pill stock-pill--empty' : 'stock-pill'}>{item.stock === 0 ? 'Hết hàng' : `${item.stock} cái`}</b></article>)}</div> : <p className="empty-store">Tất cả biến thể đang đủ tồn kho.</p>}</section>
      </div>

      <section className="panel dashboard-status"><div><p className="eyebrow">ĐƠN HÀNG</p><h2>Trạng thái đơn</h2></div><div>{Object.entries(statusLabels).map(([status, label]) => <article key={status}><span>{label}</span><strong>{overview.statusBreakdown[status] || 0}</strong></article>)}</div></section>
    </div>
  );
}
