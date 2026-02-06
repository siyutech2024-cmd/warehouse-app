import { useEffect, useState } from "react";
import { fetchMyInventory } from "../api";
import { useAuth } from "../auth/AuthContext";

export default function MyRecords() {
    const { user } = useAuth();
    const [list, setList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user) {
            loadMyRecords();
        }
    }, [user]);

    const loadMyRecords = async () => {
        setIsLoading(true);
        try {
            const data = await fetchMyInventory(user.username);
            setList(data);
        } finally {
            setIsLoading(false);
        }
    };

    const totalStock = list.reduce((sum, item) => sum + (item.stock || 0), 0);

    return (
        <div className="page">
            <h1 className="page-title">📋 我的记录</h1>

            {/* 统计卡片 */}
            <div className="card fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{list.length}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>录入商品</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{totalStock}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>总件数</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{user?.username}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>当前用户</div>
                    </div>
                </div>
            </div>

            {/* 记录列表 */}
            <div className="card fade-in">
                <div className="card-header">
                    <span>📦</span> 入库记录
                </div>

                {isLoading ? (
                    <div className="loading">
                        <span className="loading-spinner"></span>
                        <span>加载中...</span>
                    </div>
                ) : list.length === 0 ? (
                    <div className="alert alert-info">
                        📭 您还没有入库记录，去拍照入库吧！
                    </div>
                ) : (
                    <div>
                        {list.map((item) => (
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
                                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>
                                        {item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : ''}
                                    </div>
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
