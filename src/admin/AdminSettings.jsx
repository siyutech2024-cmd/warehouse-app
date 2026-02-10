import { useState, useEffect } from "react";
import { store } from "../store";

export default function AdminSettings() {
    const [settings, setSettings] = useState({
        discountRate: 30,
        requireAudit: false,
        lowStockThreshold: 10,
        categories: ['电子产品', '办公用品', '生活用品', '其他']
    });
    const [newCategory, setNewCategory] = useState('');
    const [saved, setSaved] = useState(false);
    const [compressing, setCompressing] = useState(false);
    const [compressProgress, setCompressProgress] = useState('');
    const [compressResult, setCompressResult] = useState(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = () => {
        const stored = localStorage.getItem('warehouse_settings');
        if (stored) {
            setSettings(JSON.parse(stored));
        }
    };

    const saveSettings = () => {
        localStorage.setItem('warehouse_settings', JSON.stringify(settings));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const addCategory = () => {
        if (!newCategory.trim()) return;
        if (settings.categories.includes(newCategory.trim())) {
            alert('分类已存在');
            return;
        }
        setSettings({
            ...settings,
            categories: [...settings.categories, newCategory.trim()]
        });
        setNewCategory('');
    };

    const removeCategory = (cat) => {
        setSettings({
            ...settings,
            categories: settings.categories.filter(c => c !== cat)
        });
    };

    const handleCompressAll = async () => {
        if (!confirm('¿Comprimir todas las imágenes? Este proceso puede tardar varios minutos.')) return;
        setCompressing(true);
        setCompressResult(null);
        setCompressProgress('Iniciando...');

        try {
            const result = await store.compressAllImages((current, total, name, stats) => {
                setCompressProgress(`${current}/${total} — ${name} (✅${stats.compressed} ⏭${stats.skipped} ❌${stats.failed})`);
            });
            setCompressResult(result);
            setCompressProgress('');
        } catch (err) {
            console.error('压缩失败:', err);
            setCompressProgress('❌ Error: ' + err.message);
        } finally {
            setCompressing(false);
        }
    };

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1 className="admin-title">⚙️ 系统设置</h1>
                <p className="admin-subtitle">配置系统参数</p>
            </div>

            {saved && (
                <div className="alert alert-success fade-in">
                    ✅ 设置已保存
                </div>
            )}

            {/* 图片压缩工具 */}
            <div className="admin-card">
                <div className="admin-card-header">
                    <h2>🖼️ Compresión de Imágenes</h2>
                </div>
                <div className="admin-card-body">
                    <p style={{ fontSize: '0.88rem', color: 'var(--gray-600, #666)', marginBottom: 16 }}>
                        Comprime todas las imágenes en la base de datos para acelerar la exportación de Excel.
                        Las imágenes se redimensionarán a máx. 600px y calidad JPEG 50%.
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={handleCompressAll}
                        disabled={compressing}
                        style={{ minWidth: 220 }}
                    >
                        {compressing ? '⏳ Comprimiendo...' : '🗜️ Comprimir todas las imágenes'}
                    </button>

                    {compressing && compressProgress && (
                        <div style={{
                            marginTop: 12, padding: '10px 14px', borderRadius: 8,
                            background: 'var(--bg-secondary, #f0f4ff)', fontSize: '0.85rem',
                            fontFamily: 'monospace', wordBreak: 'break-all'
                        }}>
                            {compressProgress}
                        </div>
                    )}

                    {compressResult && (
                        <div className="alert alert-success" style={{ marginTop: 12 }}>
                            <strong>✅ Compresión completada</strong><br />
                            Total: {compressResult.total} productos<br />
                            Comprimidos: {compressResult.compressed} ·
                            Omitidos: {compressResult.skipped} ·
                            Fallidos: {compressResult.failed}
                        </div>
                    )}
                </div>
            </div>

            {/* 折扣设置 */}
            <div className="admin-card">
                <div className="admin-card-header">
                    <h2>💰 价格设置</h2>
                </div>
                <div className="admin-card-body">
                    <div className="form-group">
                        <label className="form-label">默认折扣率 (%)</label>
                        <div className="input-with-suffix">
                            <input
                                type="number"
                                className="form-input"
                                value={settings.discountRate}
                                onChange={e => setSettings({ ...settings, discountRate: parseInt(e.target.value) || 0 })}
                                min="0"
                                max="100"
                            />
                            <span className="input-suffix">%</span>
                        </div>
                        <p className="form-hint">折扣价 = 原价 × (100 - 折扣率)%，当前折扣价为原价的 {100 - settings.discountRate}%</p>
                    </div>
                </div>
            </div>

            {/* 库存预警 */}
            <div className="admin-card">
                <div className="admin-card-header">
                    <h2>⚠️ 库存预警</h2>
                </div>
                <div className="admin-card-body">
                    <div className="form-group">
                        <label className="form-label">低库存预警阈值</label>
                        <div className="input-with-suffix">
                            <input
                                type="number"
                                className="form-input"
                                value={settings.lowStockThreshold}
                                onChange={e => setSettings({ ...settings, lowStockThreshold: parseInt(e.target.value) || 0 })}
                                min="0"
                            />
                            <span className="input-suffix">件</span>
                        </div>
                        <p className="form-hint">当商品库存低于此值时显示预警</p>
                    </div>
                </div>
            </div>

            {/* 审核设置 */}
            <div className="admin-card">
                <div className="admin-card-header">
                    <h2>📝 入库审核</h2>
                </div>
                <div className="admin-card-body">
                    <div className="form-group">
                        <label className="toggle-label">
                            <input
                                type="checkbox"
                                className="toggle-input"
                                checked={settings.requireAudit}
                                onChange={e => setSettings({ ...settings, requireAudit: e.target.checked })}
                            />
                            <span className="toggle-switch"></span>
                            <span>启用入库审核</span>
                        </label>
                        <p className="form-hint">启用后，员工入库需要管理员审核才能正式入库</p>
                    </div>
                </div>
            </div>

            {/* 分类管理 */}
            <div className="admin-card">
                <div className="admin-card-header">
                    <h2>📁 商品分类</h2>
                </div>
                <div className="admin-card-body">
                    <div className="category-tags">
                        {settings.categories.map(cat => (
                            <span key={cat} className="category-tag">
                                {cat}
                                <button className="category-remove" onClick={() => removeCategory(cat)}>×</button>
                            </span>
                        ))}
                    </div>
                    <div className="form-group" style={{ marginTop: 16 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                type="text"
                                className="form-input"
                                value={newCategory}
                                onChange={e => setNewCategory(e.target.value)}
                                placeholder="添加新分类"
                                onKeyDown={e => e.key === 'Enter' && addCategory()}
                            />
                            <button className="btn btn-primary" onClick={addCategory}>添加</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 保存按钮 */}
            <div style={{ marginTop: 24 }}>
                <button className="btn btn-success" onClick={saveSettings}>
                    💾 保存设置
                </button>
            </div>
        </div>
    );
}
