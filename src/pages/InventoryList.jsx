import { useEffect, useState } from "react";
import { fetchInventory, exportExcel } from "../api";

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
      <h1 className="page-title">📦 库存管理</h1>

      {/* 统计卡片 */}
      <div className="card fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{filteredList.length}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>商品种类</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{totalStock}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>总库存</div>
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>¥{totalValue.toLocaleString()}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>总价值</div>
          </div>
        </div>
      </div>

      {/* 搜索和导出 */}
      <div className="card fade-in">
        <div className="form-group" style={{ marginBottom: 12 }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 搜索产品名称或条形码..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={() => exportExcel(filteredList)}
          disabled={filteredList.length === 0}
        >
          📥 导出 Excel
        </button>
      </div>

      {/* 商品列表 */}
      <div className="card fade-in">
        <div className="card-header">
          <span>📋</span> 商品列表
        </div>

        {isLoading ? (
          <div className="loading">
            <span className="loading-spinner"></span>
            <span>加载中...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="alert alert-info">
            {list.length === 0 ? "📭 暂无库存数据" : "🔍 没有找到匹配的商品"}
          </div>
        ) : (
          <div>
            {filteredList.map((item) => (
              <div key={item.id || item.barcode} className="inventory-item">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="inventory-item-image" />
                ) : (
                  <div className="inventory-item-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                    📦
                  </div>
                )}
                <div className="inventory-item-info">
                  <div className="inventory-item-name">{item.name}</div>
                  <div className="inventory-item-barcode">{item.barcode}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="inventory-item-price">¥{item.discountPrice}</div>
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