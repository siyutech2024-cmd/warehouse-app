import { useEffect, useState } from "react";
import { fetchInventory, exportExcel, updateProductStock, deleteProducts } from "../api";

export default function AdminInventory() {
    const [list, setList] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc");
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState([]);
    const [editingItem, setEditingItem] = useState(null);

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

    // 过滤和排序
    const filteredList = list
        .filter(item => {
            const matchSearch =
                item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.createdBy?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchCategory = !categoryFilter || item.category === categoryFilter;
            return matchSearch && matchCategory;
        })
        .sort((a, b) => {
            let aVal = a[sortBy] || '';
            let bVal = b[sortBy] || '';
            if (sortBy === 'discountPrice' || sortBy === 'stock') {
                aVal = Number(aVal) || 0;
                bVal = Number(bVal) || 0;
            }
            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            return aVal < bVal ? 1 : -1;
        });

    const categories = [...new Set(list.map(item => item.category).filter(Boolean))];

    const totalStock = filteredList.reduce((sum, item) => sum + (item.stock || 0), 0);
    const totalValue = filteredList.reduce((sum, item) => sum + ((item.discountPrice || 0) * (item.stock || 0)), 0);

    const toggleSelect = (id) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedItems.length === filteredList.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(filteredList.map(item => item.id));
        }
    };

    const deleteSelected = async () => {
        if (selectedItems.length === 0) return;
        if (!confirm(`确定删除 ${selectedItems.length} 件商品？`)) return;

        await deleteProducts(selectedItems);
        setSelectedItems([]);
        loadInventory();
    };

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const updateStock = async (id, newStock) => {
        await updateProductStock(id, parseInt(newStock) || 0);
        loadInventory();
        setEditingItem(null);
    };

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1 className="admin-title">📦 库存管理</h1>
                <p className="admin-subtitle">管理所有入库商品</p>
            </div>

            {/* 统计 */}
            <div className="stats-row">
                <div className="stat-mini">
                    <span className="stat-mini-value">{filteredList.length}</span>
                    <span className="stat-mini-label">商品种类</span>
                </div>
                <div className="stat-mini">
                    <span className="stat-mini-value">{totalStock.toLocaleString()}</span>
                    <span className="stat-mini-label">总库存</span>
                </div>
                <div className="stat-mini">
                    <span className="stat-mini-value">MXN ${totalValue.toLocaleString()}</span>
                    <span className="stat-mini-label">Valor Total</span>
                </div>
            </div>

            {/* 工具栏 */}
            <div className="admin-toolbar">
                <div className="toolbar-left">
                    <input
                        type="text"
                        className="form-input toolbar-search"
                        placeholder="🔍 搜索产品/条形码/录入人..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="form-input toolbar-select"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="">所有分类</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div className="toolbar-right">
                    {selectedItems.length > 0 && (
                        <button className="btn btn-danger btn-sm" onClick={deleteSelected}>
                            🗑️ 删除 ({selectedItems.length})
                        </button>
                    )}
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => exportExcel(filteredList)}
                        disabled={filteredList.length === 0}
                    >
                        📥 导出 Excel
                    </button>
                </div>
            </div>

            {/* 表格 */}
            <div className="admin-card">
                <div className="admin-table-container">
                    {isLoading ? (
                        <div className="loading">
                            <span className="loading-spinner"></span>
                            <span>加载中...</span>
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="empty-state">📭 暂无数据</div>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.length === filteredList.length && filteredList.length > 0}
                                            onChange={selectAll}
                                        />
                                    </th>
                                    <th>图片</th>
                                    <th className="sortable" onClick={() => handleSort('name')}>
                                        产品名称 {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>条形码</th>
                                    <th className="sortable" onClick={() => handleSort('discountPrice')}>
                                        价格 {sortBy === 'discountPrice' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('stock')}>
                                        库存 {sortBy === 'stock' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>录入人</th>
                                    <th className="sortable" onClick={() => handleSort('createdAt')}>
                                        入库时间 {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredList.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.includes(item.id)}
                                                onChange={() => toggleSelect(item.id)}
                                            />
                                        </td>
                                        <td>
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="table-image" />
                                            ) : (
                                                <div className="table-image-placeholder">📦</div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="table-product-name">{item.name}</div>
                                            <div className="table-product-category">{item.category}</div>
                                        </td>
                                        <td><code>{item.barcode}</code></td>
                                        <td>
                                            <span className="price-original-sm">MXN ${item.originalPrice}</span>
                                            <span className="price-discount-sm">MXN ${item.discountPrice}</span>
                                        </td>
                                        <td>
                                            {editingItem === item.id ? (
                                                <input
                                                    type="number"
                                                    className="stock-input"
                                                    defaultValue={item.stock}
                                                    onBlur={(e) => updateStock(item.id, e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && updateStock(item.id, e.target.value)}
                                                    autoFocus
                                                />
                                            ) : (
                                                <span
                                                    className="stock-value"
                                                    onClick={() => setEditingItem(item.id)}
                                                    title="点击编辑"
                                                >
                                                    {item.stock}
                                                </span>
                                            )}
                                        </td>
                                        <td>{item.createdBy || '-'}</td>
                                        <td>{item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '-'}</td>
                                        <td>
                                            <button
                                                className="btn-icon"
                                                onClick={() => setEditingItem(item.id)}
                                                title="编辑库存"
                                            >
                                                ✏️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
