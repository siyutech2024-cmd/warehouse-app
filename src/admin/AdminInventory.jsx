import { useEffect, useState, useRef, useCallback } from "react";
import { fetchInventory, fetchInventoryWithImages, getProductImage, exportExcel, updateProductStock, deleteProducts, updateProductPrice } from "../api";
import i18n from "../i18n";

// 懒加载图片组件
function LazyImage({ productId, alt }) {
    const [src, setSrc] = useState(null);
    const [loading, setLoading] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        if (!productId) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !src && !loading) {
                    setLoading(true);
                    getProductImage(productId).then(image => {
                        setSrc(image);
                        setLoading(false);
                    });
                    observer.disconnect();
                }
            },
            { rootMargin: '100px' }
        );
        if (imgRef.current) observer.observe(imgRef.current);
        return () => observer.disconnect();
    }, [productId, src, loading]);

    return (
        <div ref={imgRef} className="table-image-wrapper">
            {src ? (
                <img src={src} alt={alt} className="table-image" loading="lazy" />
            ) : loading ? (
                <div className="table-image-placeholder">⏳</div>
            ) : (
                <div className="table-image-placeholder">📦</div>
            )}
        </div>
    );
}

const t = i18n.adminInventory;

export default function AdminInventory() {
    const [list, setList] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [sortBy, setSortBy] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc");
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState([]);
    const [editingStock, setEditingStock] = useState(null);
    const [editingPrice, setEditingPrice] = useState(null);

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
            if (sortBy === 'discountPrice' || sortBy === 'stock' || sortBy === 'originalPrice') {
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
        if (!confirm(`¿Eliminar ${selectedItems.length} productos?`)) return;

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
        setEditingStock(null);
    };

    const updatePrice = async (id, originalPrice, discountPrice) => {
        await updateProductPrice(id, parseFloat(originalPrice) || 0, parseFloat(discountPrice) || 0);
        loadInventory();
        setEditingPrice(null);
    };

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1 className="admin-title">📦 {t.title}</h1>
                <p className="admin-subtitle">{t.subtitle}</p>
            </div>

            <div className="stats-row">
                <div className="stat-mini">
                    <span className="stat-mini-value">{filteredList.length}</span>
                    <span className="stat-mini-label">{t.productTypes}</span>
                </div>
                <div className="stat-mini">
                    <span className="stat-mini-value">{totalStock.toLocaleString()}</span>
                    <span className="stat-mini-label">{t.totalStock}</span>
                </div>
                <div className="stat-mini">
                    <span className="stat-mini-value">MXN ${totalValue.toLocaleString()}</span>
                    <span className="stat-mini-label">{t.totalValue}</span>
                </div>
            </div>

            <div className="admin-toolbar">
                <div className="toolbar-left">
                    <input
                        type="text"
                        className="form-input toolbar-search"
                        placeholder={`🔍 ${t.searchPlaceholder}`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <select
                        className="form-input toolbar-select"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="">{t.allCategories}</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div className="toolbar-right">
                    {selectedItems.length > 0 && (
                        <button className="btn btn-danger btn-sm" onClick={deleteSelected}>
                            🗑️ {t.delete} ({selectedItems.length})
                        </button>
                    )}
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={async () => {
                            const dataWithImages = await fetchInventoryWithImages();
                            await exportExcel(dataWithImages);
                        }}
                        disabled={filteredList.length === 0}
                    >
                        📥 {t.exportExcel}
                    </button>
                </div>
            </div>

            <div className="admin-card">
                <div className="admin-table-container">
                    {isLoading ? (
                        <div className="loading">
                            <span className="loading-spinner"></span>
                            <span>{t.loading}</span>
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="empty-state">📭 {t.noData}</div>
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
                                    <th>{t.image}</th>
                                    <th className="sortable" onClick={() => handleSort('name')}>
                                        {t.productName} {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>{t.barcode}</th>
                                    <th className="sortable" onClick={() => handleSort('discountPrice')}>
                                        {t.price} {sortBy === 'discountPrice' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('stock')}>
                                        {t.stock} {sortBy === 'stock' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>{t.createdBy}</th>
                                    <th className="sortable" onClick={() => handleSort('createdAt')}>
                                        {t.createdAt} {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th>{t.actions}</th>
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
                                            <LazyImage productId={item.id} alt={item.name} />
                                        </td>
                                        <td>
                                            <div className="table-product-name">{item.name}</div>
                                            <div className="table-product-category">{item.category}</div>
                                        </td>
                                        <td><code>{item.barcode}</code></td>
                                        <td>
                                            {editingPrice === item.id ? (
                                                <div className="price-edit-group">
                                                    <input
                                                        type="number"
                                                        className="price-input"
                                                        defaultValue={item.originalPrice}
                                                        placeholder="Original"
                                                        id={`orig-${item.id}`}
                                                    />
                                                    <input
                                                        type="number"
                                                        className="price-input"
                                                        defaultValue={item.discountPrice}
                                                        placeholder="Descuento"
                                                        id={`disc-${item.id}`}
                                                    />
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => {
                                                            const orig = document.getElementById(`orig-${item.id}`).value;
                                                            const disc = document.getElementById(`disc-${item.id}`).value;
                                                            updatePrice(item.id, orig, disc);
                                                        }}
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => setEditingPrice(null)}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <div
                                                    className="price-display clickable"
                                                    onClick={() => setEditingPrice(item.id)}
                                                    title={t.clickToEdit}
                                                >
                                                    <span className="price-original-sm">MXN ${item.originalPrice}</span>
                                                    <span className="price-discount-sm">MXN ${item.discountPrice}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {editingStock === item.id ? (
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
                                                    className="stock-value clickable"
                                                    onClick={() => setEditingStock(item.id)}
                                                    title={t.clickToEdit}
                                                >
                                                    {item.stock}
                                                </span>
                                            )}
                                        </td>
                                        <td>{item.createdBy || '-'}</td>
                                        <td>{item.createdAt ? new Date(item.createdAt).toLocaleString('es-MX') : '-'}</td>
                                        <td>
                                            <button
                                                className="btn-icon"
                                                onClick={() => setEditingPrice(item.id)}
                                                title={t.editPrice}
                                            >
                                                💰
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => setEditingStock(item.id)}
                                                title={t.editStock}
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
