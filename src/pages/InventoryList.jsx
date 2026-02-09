import { useEffect, useState } from "react";
import { fetchInventory, fetchInventoryWithImages, exportExcel } from "../api";
import i18n from "../i18n";

const t = i18n.inventory;

export default function InventoryList() {
  const [list, setList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const data = await fetchInventory();
      setList(data);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredList = list.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStock = filteredList.reduce((sum, item) => sum + (item.stock || 0), 0);
  const totalValue = filteredList.reduce((sum, item) => sum + ((item.discountPrice || 0) * (item.stock || 0)), 0);

  return (
    <div className="page">
      <h1 className="page-title">{t.title}</h1>

      {/* 统计卡片 */}
      <div className="card fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{filteredList.length}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{t.items}</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{totalStock}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{t.totalStock}</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>${totalValue.toLocaleString()}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>Valor</div>
          </div>
        </div>
      </div>

      {/* 搜索和导出 */}
      <div className="card fade-in">
        <div className="form-group" style={{ marginBottom: 12 }}>
          <input
            type="text"
            className="form-input"
            placeholder={`🔍 ${t.searchPlaceholder}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={async () => {
            const dataWithImages = await fetchInventoryWithImages();
            await exportExcel(dataWithImages);
          }}
          disabled={filteredList.length === 0}
        >
          {t.exportExcel}
        </button>
      </div>

      {/* 商品列表 */}
      <div className="card fade-in">
        <div className="card-header">
          <span>📋</span> Lista de Productos
        </div>

        {isLoading ? (
          <div className="loading">
            <span className="loading-spinner"></span>
            <span>{i18n.app.loading}</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="alert alert-info">
            {list.length === 0 ? "📭 No hay productos en el inventario" : "🔍 No se encontraron coincidencias"}
          </div>
        ) : (
          <div>
            {filteredList.map((item) => (
              <div key={item.id || item.barcode} className="inventory-item">
                <div className="inventory-item-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                  📦
                </div>
                <div className="inventory-item-info">
                  <div className="inventory-item-name">{item.name}</div>
                  <div className="inventory-item-barcode">{item.barcode}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="inventory-item-price">${item.discountPrice}</div>
                  <div className="inventory-item-stock">× {item.stock}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}