import { useEffect, useMemo, useState } from 'react';
import { inventoryApi, productApi } from '../../api/admin';
import { getApiError } from '../../api/http';
import FlashMessage from '../../components/FlashMessage';
import LoadingScreen from '../../components/LoadingScreen';
import { formatDate } from '../../utils/order';

const adjustmentLabels = { INITIAL: 'Tồn kho ban đầu', IMPORT: 'Nhập thêm', ADJUSTMENT: 'Điều chỉnh' };

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('IMPORT');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadProducts() {
    setLoading(true);
    try {
      const response = await productApi.list();
      setProducts(response.data.data || []);
    } catch (requestError) { setError(getApiError(requestError)); } finally { setLoading(false); }
  }

  useEffect(() => { loadProducts(); }, []);

  const inventoryRows = useMemo(() => products.flatMap((product) => product.variants.map((variant) => ({ product, variant }))).filter(({ product, variant }) => {
    const query = search.trim().toLowerCase();
    return !query || [product.name, product.modelCode, variant.sku, variant.ram, variant.storage, variant.color].some((value) => String(value || '').toLowerCase().includes(query));
  }), [products, search]);

  async function openAdjustment(product, variant) {
    setSelected({ product, variant });
    setMode('IMPORT'); setQuantity('1'); setReason(''); setHistory([]); setError('');
    setHistoryLoading(true);
    try {
      const response = await inventoryApi.history(product._id, variant._id, { page: 1, limit: 20 });
      setHistory(response.data.data || []);
    } catch (requestError) { setError(getApiError(requestError)); } finally { setHistoryLoading(false); }
  }

  async function submitAdjustment(event) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await inventoryApi.adjust(selected.product._id, selected.variant._id, { mode, quantity: Number(quantity), reason });
      const { product, adjustment } = response.data.data;
      setProducts((current) => current.map((item) => item._id === product._id ? { ...item, variants: product.variants } : item));
      const nextVariant = product.variants.find((variant) => variant._id === selected.variant._id);
      setSelected((current) => current ? { product: { ...current.product, variants: product.variants }, variant: nextVariant } : current);
      setHistory((current) => [adjustment, ...current]);
      setQuantity(mode === 'IMPORT' ? '1' : String(nextVariant.stock));
      setReason('');
      setMessage(response.data.message);
    } catch (requestError) { setError(getApiError(requestError)); } finally { setSaving(false); }
  }

  if (loading) return <LoadingScreen />;
  return <section className="admin-page inventory-page"><div className="page-heading"><div><p className="eyebrow">VẬN HÀNH</p><h1>Quản lý tồn kho</h1><p>Nhập thêm hoặc đặt lại số lượng từng biến thể; mọi thay đổi đều cần nguyên nhân và được lưu vào lịch sử.</p></div><span className="role-chip">{inventoryRows.length} biến thể</span></div>
    <FlashMessage type="success">{message}</FlashMessage><FlashMessage type="error">{error}</FlashMessage>
    <div className="inventory-toolbar panel"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm sản phẩm, mã, SKU hoặc cấu hình" /></div>
    <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>Sản phẩm</th><th>SKU</th><th>Biến thể</th><th>Tồn kho</th><th>Trạng thái</th><th /></tr></thead><tbody>{inventoryRows.map(({ product, variant }) => <tr key={`${product._id}-${variant._id}`}><td><strong>{product.name}</strong><small>{product.modelCode}</small></td><td>{variant.sku}</td><td>{variant.ram} · {variant.storage} · {variant.color}</td><td><strong className={variant.stock === 0 ? 'inventory-stock inventory-stock--empty' : 'inventory-stock'}>{variant.stock}</strong></td><td><span className={variant.isActive ? 'status status--active' : 'status'}>{variant.isActive ? 'Đang bán' : 'Đã ẩn'}</span></td><td className="table-actions"><button onClick={() => openAdjustment(product, variant)}>Điều chỉnh</button></td></tr>)}{inventoryRows.length === 0 && <tr><td colSpan="6" className="empty-cell">Không tìm thấy biến thể phù hợp.</td></tr>}</tbody></table></div></section>
    {selected && <div className="modal" role="presentation"><div className="modal-content inventory-modal"><div className="profile-editor__heading"><div><p className="eyebrow">ĐIỀU CHỈNH TỒN KHO</p><h2>{selected.product.name}</h2><p>{selected.variant.sku} · {selected.variant.ram} · {selected.variant.storage} · {selected.variant.color}</p></div><button type="button" className="text-button" onClick={() => setSelected(null)} disabled={saving}>Đóng</button></div><div className="inventory-modal__current"><span>Tồn kho hiện tại</span><strong>{selected.variant.stock}</strong></div><form className="form-stack" onSubmit={submitAdjustment}><label>Hình thức<select value={mode} onChange={(event) => { setMode(event.target.value); setQuantity(event.target.value === 'IMPORT' ? '1' : String(selected.variant.stock)); }} disabled={saving}><option value="IMPORT">Nhập thêm vào kho</option><option value="SET">Đặt số lượng tồn kho</option></select></label><label>{mode === 'IMPORT' ? 'Số lượng nhập thêm' : 'Số lượng tồn kho mới'}<input type="number" min={mode === 'IMPORT' ? '1' : '0'} max="1000000" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required disabled={saving} /></label><label>Nguyên nhân điều chỉnh<textarea rows="3" minLength="3" maxLength="1000" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ví dụ: Nhập hàng từ nhà cung cấp, kiểm kê thực tế..." required disabled={saving} /></label><div className="button-row"><button className="button" disabled={saving}>{saving ? 'Đang lưu...' : mode === 'IMPORT' ? 'Ghi nhận nhập kho' : 'Cập nhật tồn kho'}</button><button type="button" className="button button--ghost" onClick={() => setSelected(null)} disabled={saving}>Hủy</button></div></form><section className="inventory-history"><h3>Lịch sử điều chỉnh</h3>{historyLoading ? <p>Đang tải lịch sử...</p> : history.length === 0 ? <p>Chưa có lịch sử điều chỉnh.</p> : <ol>{history.map((entry) => <li key={entry._id}><div><strong>{adjustmentLabels[entry.type] || entry.type} <span className={entry.change > 0 ? 'stock-change stock-change--up' : 'stock-change stock-change--down'}>{entry.change > 0 ? '+' : ''}{entry.change}</span></strong><span>{formatDate(entry.createdAt)}{entry.changedBy?.fullName ? ` · ${entry.changedBy.fullName}` : ''}</span></div><p>{entry.previousStock} → {entry.resultingStock} · {entry.reason}</p></li>)}</ol>}</section></div></div>}
  </section>;
}
