import { useEffect, useState } from "react";
import { fetchInventory, fetchInventoryWithImages, exportExcel } from "../api";

export default function AdminReports() {
    const [inventory, setInventory] = useState([]);
    const [dateRange, setDateRange] = useState('week');
    const [isLoading, setIsLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await fetchInventory();
            setInventory(data);
        } finally {
            setIsLoading(false);
        }
    };

    // 按日期分组统计
    const getDateStats = () => {
        const now = new Date();
        const stats = {};

        let daysToShow = 7;
        if (dateRange === 'month') daysToShow = 30;
        if (dateRange === 'year') daysToShow = 365;

        for (let i = daysToShow - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const key = date.toLocaleDateString('zh-CN');
            stats[key] = { date: key, count: 0, value: 0 };
        }

        inventory.forEach(item => {
            if (!item.createdAt) return;
            const date = new Date(item.createdAt).toLocaleDateString('zh-CN');
            if (stats[date]) {
                stats[date].count += item.stock || 0;
                stats[date].value += (item.discountPrice || 0) * (item.stock || 0);
            }
        });

        return Object.values(stats);
    };

    // 员工绩效统计
    const getEmployeeStats = () => {
        const empMap = {};
        inventory.forEach(item => {
            const emp = item.createdBy || 'unknown';
            if (!empMap[emp]) {
                empMap[emp] = { name: emp, count: 0, value: 0, records: 0 };
            }
            empMap[emp].records++;
            empMap[emp].count += item.stock || 0;
            empMap[emp].value += (item.discountPrice || 0) * (item.stock || 0);
        });
        return Object.values(empMap).sort((a, b) => b.count - a.count);
    };

    // 分类统计
    const getCategoryStats = () => {
        const catMap = {};
        inventory.forEach(item => {
            const cat = item.category || '未分类';
            if (!catMap[cat]) {
                catMap[cat] = { name: cat, count: 0, value: 0 };
            }
            catMap[cat].count += item.stock || 0;
            catMap[cat].value += (item.discountPrice || 0) * (item.stock || 0);
        });
        return Object.values(catMap).sort((a, b) => b.count - a.count);
    };

    const dateStats = getDateStats();
    const employeeStats = getEmployeeStats();
    const categoryStats = getCategoryStats();

    const maxCount = Math.max(...dateStats.map(d => d.count), 1);

    if (isLoading) {
        return (
            <div className="admin-page">
                <div className="loading">
                    <span className="loading-spinner"></span>
                    <span>加载中...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1 className="admin-title">📈 统计报表</h1>
                <p className="admin-subtitle">数据分析与报表</p>
            </div>

            {/* 日期范围选择 */}
            <div className="admin-toolbar">
                <div className="toolbar-left">
                    <div className="btn-group">
                        <button
                            className={`btn btn-sm ${dateRange === 'week' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setDateRange('week')}
                        >
                            近7天
                        </button>
                        <button
                            className={`btn btn-sm ${dateRange === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setDateRange('month')}
                        >
                            近30天
                        </button>
                    </div>
                </div>
                <div className="toolbar-right">
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => !exporting && setShowExportMenu(prev => !prev)}
                            disabled={exporting}
                        >
                            {exporting ? '⏳ Exportando...' : '📥 导出报表'}
                        </button>
                        {showExportMenu && !exporting && (
                            <div style={{
                                position: 'absolute', right: 0, top: '100%', marginTop: 4,
                                background: 'var(--card-bg, #fff)', borderRadius: 8,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 100,
                                minWidth: 220, overflow: 'hidden', border: '1px solid var(--border, #e0e0e0)'
                            }}>
                                <button
                                    style={{ display: 'block', width: '100%', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.9rem', borderBottom: '1px solid var(--border, #e0e0e0)' }}
                                    onMouseEnter={e => e.target.style.background = 'var(--hover-bg, #f5f5f5)'}
                                    onMouseLeave={e => e.target.style.background = 'none'}
                                    onClick={async () => {
                                        setShowExportMenu(false);
                                        setExporting(true);
                                        try { await exportExcel(inventory); } catch (err) { alert('Error: ' + err.message); } finally { setExporting(false); }
                                    }}
                                >
                                    <div style={{ fontWeight: 600 }}>⚡ 快速导出</div>
                                    <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 2 }}>不含图片 · 即时</div>
                                </button>
                                <button
                                    style={{ display: 'block', width: '100%', padding: '12px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.9rem' }}
                                    onMouseEnter={e => e.target.style.background = 'var(--hover-bg, #f5f5f5)'}
                                    onMouseLeave={e => e.target.style.background = 'none'}
                                    onClick={async () => {
                                        setShowExportMenu(false);
                                        setExporting(true);
                                        try {
                                            let data;
                                            try { data = await fetchInventoryWithImages(); } catch { data = inventory; }
                                            await exportExcel(data || inventory);
                                        } catch (err) { alert('Error: ' + err.message); } finally { setExporting(false); }
                                    }}
                                >
                                    <div style={{ fontWeight: 600 }}>🖼️ 含图片导出</div>
                                    <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 2 }}>包含产品图片 · 约1分钟</div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 入库趋势 */}
            <div className="admin-card">
                <div className="admin-card-header">
                    <h2>📊 入库趋势</h2>
                </div>
                <div className="admin-card-body">
                    <div className="chart-container">
                        {dateStats.slice(-7).map((stat, i) => (
                            <div key={i} className="chart-bar-wrapper">
                                <div
                                    className="chart-bar"
                                    style={{ height: `${(stat.count / maxCount) * 100}%` }}
                                >
                                    {stat.count > 0 && <span className="chart-bar-value">{stat.count}</span>}
                                </div>
                                <div className="chart-bar-label">{stat.date.slice(5)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="admin-grid-2">
                {/* 员工绩效 */}
                <div className="admin-card">
                    <div className="admin-card-header">
                        <h2>👥 员工绩效</h2>
                    </div>
                    <div className="admin-card-body">
                        {employeeStats.length === 0 ? (
                            <div className="empty-state">暂无数据</div>
                        ) : (
                            <div className="report-list">
                                {employeeStats.map((emp, i) => (
                                    <div key={emp.name} className="report-item">
                                        <div className="report-rank">{i + 1}</div>
                                        <div className="report-name">{emp.name}</div>
                                        <div className="report-stats">
                                            <span>{emp.count} 件</span>
                                            <span className="report-value">¥{emp.value.toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 分类统计 */}
                <div className="admin-card">
                    <div className="admin-card-header">
                        <h2>📁 分类统计</h2>
                    </div>
                    <div className="admin-card-body">
                        {categoryStats.length === 0 ? (
                            <div className="empty-state">暂无数据</div>
                        ) : (
                            <div className="report-list">
                                {categoryStats.map((cat, i) => (
                                    <div key={cat.name} className="report-item">
                                        <div className="report-rank">{i + 1}</div>
                                        <div className="report-name">{cat.name}</div>
                                        <div className="report-stats">
                                            <span>{cat.count} 件</span>
                                            <span className="report-value">¥{cat.value.toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
