import { useEffect, useState } from "react";
import { fetchInventory } from "../api";

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalProducts: 0,
        totalStock: 0,
        totalValue: 0,
        todayCount: 0,
        employeeStats: []
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setIsLoading(true);
        try {
            const inventory = await fetchInventory();

            const today = new Date().toDateString();
            const todayItems = inventory.filter(item =>
                new Date(item.createdAt).toDateString() === today
            );

            // 员工统计
            const employeeMap = {};
            inventory.forEach(item => {
                const emp = item.createdBy || 'unknown';
                if (!employeeMap[emp]) {
                    employeeMap[emp] = { name: emp, count: 0, value: 0 };
                }
                employeeMap[emp].count += item.stock || 0;
                employeeMap[emp].value += (item.discountPrice || 0) * (item.stock || 0);
            });

            const employeeStats = Object.values(employeeMap)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            setStats({
                totalProducts: inventory.length,
                totalStock: inventory.reduce((sum, item) => sum + (item.stock || 0), 0),
                totalValue: inventory.reduce((sum, item) => sum + ((item.discountPrice || 0) * (item.stock || 0)), 0),
                todayCount: todayItems.length,
                employeeStats
            });
        } finally {
            setIsLoading(false);
        }
    };

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
                <h1 className="admin-title">📊 数据看板</h1>
                <p className="admin-subtitle">仓库运营数据概览</p>
            </div>

            {/* 统计卡片 */}
            <div className="stats-grid">
                <div className="stat-card stat-card-primary">
                    <div className="stat-icon">📦</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalProducts}</div>
                        <div className="stat-label">商品种类</div>
                    </div>
                </div>

                <div className="stat-card stat-card-success">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalStock.toLocaleString()}</div>
                        <div className="stat-label">总库存量</div>
                    </div>
                </div>

                <div className="stat-card stat-card-warning">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <div className="stat-value">¥{stats.totalValue.toLocaleString()}</div>
                        <div className="stat-label">库存总价值</div>
                    </div>
                </div>

                <div className="stat-card stat-card-info">
                    <div className="stat-icon">📅</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.todayCount}</div>
                        <div className="stat-label">今日入库</div>
                    </div>
                </div>
            </div>

            {/* 员工排行 */}
            <div className="admin-card">
                <div className="admin-card-header">
                    <h2>🏆 员工入库排行</h2>
                </div>
                <div className="admin-card-body">
                    {stats.employeeStats.length === 0 ? (
                        <div className="empty-state">暂无数据</div>
                    ) : (
                        <div className="ranking-list">
                            {stats.employeeStats.map((emp, index) => (
                                <div key={emp.name} className="ranking-item">
                                    <div className="ranking-position">
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                                    </div>
                                    <div className="ranking-name">{emp.name}</div>
                                    <div className="ranking-stats">
                                        <span className="ranking-count">{emp.count} 件</span>
                                        <span className="ranking-value">¥{emp.value.toLocaleString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 快捷操作 */}
            <div className="admin-card">
                <div className="admin-card-header">
                    <h2>⚡ 快捷操作</h2>
                </div>
                <div className="admin-card-body">
                    <div className="quick-actions">
                        <a href="/admin/inventory" className="quick-action-btn">
                            <span>📦</span>
                            <span>管理库存</span>
                        </a>
                        <a href="/admin/employees" className="quick-action-btn">
                            <span>👥</span>
                            <span>管理员工</span>
                        </a>
                        <a href="/admin/reports" className="quick-action-btn">
                            <span>📈</span>
                            <span>查看报表</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
