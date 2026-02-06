import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Barcode from "react-barcode";
import { saveInventory, generateBarcode } from "../api";
import { store } from "../store";

export default function ScanBarcode() {
  const [product, setProduct] = useState(null);
  const [barcode, setBarcode] = useState("");
  const [stock, setStock] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedProduct = store.product;
    if (storedProduct) {
      setProduct(storedProduct);
      setStock(storedProduct.stock || 10);
      // 自动生成条形码
      setBarcode(generateBarcode());
    }
  }, []);

  const handleSave = async () => {
    if (!product) {
      alert("请先在入库页面拍照录入产品");
      navigate("/");
      return;
    }

    if (!barcode.trim()) {
      alert("请输入或生成条形码");
      return;
    }

    setIsSaving(true);
    try {
      await saveInventory({
        ...product,
        barcode,
        stock,
      });
      alert("✅ 入库成功！");
      navigate("/");
    } catch (error) {
      console.error("保存失败:", error);
      alert("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateBarcode = () => {
    setBarcode(generateBarcode());
  };

  if (!product) {
    return (
      <div className="page">
        <h1 className="page-title">📊 条形码录入</h1>
        <div className="card">
          <div className="alert alert-warning">
            ⚠️ 请先在"拍照入库"页面录入产品信息
          </div>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            去拍照入库
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">📊 条形码录入</h1>

      {/* 产品预览 */}
      <div className="card fade-in">
        <div className="card-header">
          <span>📦</span> 产品信息确认
        </div>

        <div className="product-card">
          {product.image && (
            <img src={product.image} alt={product.name} className="product-image" />
          )}
          <div className="product-name">{product.name}</div>
          <div className="product-description">{product.description}</div>

          <div className="product-prices">
            <span className="price-original">¥{product.originalPrice}</span>
            <span className="price-discount">¥{product.discountPrice}</span>
            <span className="price-badge">7折</span>
          </div>
        </div>
      </div>

      {/* 条形码 */}
      <div className="card fade-in">
        <div className="card-header">
          <span>📊</span> 条形码
        </div>

        <div className="form-group">
          <label className="form-label">条形码编号</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="form-input"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="扫描或输入条形码"
            />
            <button
              className="btn btn-secondary"
              onClick={handleGenerateBarcode}
              style={{ width: 'auto', whiteSpace: 'nowrap' }}
            >
              生成
            </button>
          </div>
        </div>

        {barcode && (
          <div className="barcode-display">
            <Barcode value={barcode} width={1.5} height={60} fontSize={12} />
          </div>
        )}
      </div>

      {/* 库存调整 */}
      <div className="card fade-in">
        <div className="card-header">
          <span>📈</span> 库存数量
        </div>

        <div className="form-group">
          <label className="form-label">入库数量</label>
          <input
            type="number"
            className="form-input"
            value={stock}
            onChange={(e) => setStock(parseInt(e.target.value) || 0)}
            min="1"
          />
        </div>
      </div>

      {/* 确认按钮 */}
      <button
        className="btn btn-success"
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <>
            <span className="loading-spinner" style={{ width: 18, height: 18 }}></span>
            保存中...
          </>
        ) : "✅ 确认入库"}
      </button>
    </div>
  );
}