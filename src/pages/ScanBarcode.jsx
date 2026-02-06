import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Barcode from "react-barcode";
import { Html5Qrcode } from "html5-qrcode";
import { saveInventory, generateBarcode } from "../api";
import { store } from "../store";
import { useAuth } from "../auth/AuthContext";
import i18n from "../i18n";

const t = i18n.barcode;

export default function ScanBarcode() {
  const [product, setProduct] = useState(null);
  const [barcode, setBarcode] = useState("");
  const [stock, setStock] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const scannerRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const storedProduct = store.product;
    if (storedProduct) {
      setProduct(storedProduct);
      setStock(storedProduct.stock || 10);
    }

    return () => {
      // 清理扫描器
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => { });
      }
    };
  }, []);

  const startScanner = async () => {
    try {
      setScanError(null);
      setIsScanning(true);

      const html5QrCode = new Html5Qrcode("barcode-scanner");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 }
        },
        (decodedText) => {
          // 扫描成功
          setBarcode(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // 忽略扫描错误，继续扫描
        }
      );
    } catch (error) {
      console.error("Scanner error:", error);
      setScanError("No se pudo iniciar el escáner. Por favor, permita el acceso a la cámara.");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        // 忽略错误
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleGenerateBarcode = () => {
    setBarcode(generateBarcode());
  };

  const handleSave = async () => {
    if (!product) {
      alert(t.noProduct);
      navigate("/");
      return;
    }

    if (!barcode.trim()) {
      alert("Por favor ingrese o genere un código de barras");
      return;
    }

    setIsSaving(true);
    try {
      await saveInventory({
        ...product,
        barcode,
        stock,
        createdBy: user?.username || 'unknown',
        createdAt: new Date().toISOString()
      });
      alert(t.success);
      store.clearProduct();
      navigate("/");
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar, por favor intente de nuevo");
    } finally {
      setIsSaving(false);
    }
  };

  if (!product) {
    return (
      <div className="page">
        <h1 className="page-title">{t.title}</h1>
        <div className="card">
          <div className="alert alert-warning">
            ⚠️ {t.noProduct}
          </div>
          <button className="btn btn-primary" onClick={() => navigate("/")}>
            {t.goToPhoto}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">{t.title}</h1>

      {/* 产品预览 */}
      <div className="card fade-in">
        <div className="card-header">
          <span>📦</span> {t.productInfo}
        </div>

        <div className="product-card">
          {product.image && (
            <img src={product.image} alt={product.name} className="product-image" />
          )}
          <div className="product-name">{product.name}</div>
          <div className="product-description">{product.description}</div>

          <div className="product-prices">
            <span className="price-original">${product.originalPrice}</span>
            <span className="price-discount">${product.discountPrice}</span>
            <span className="price-badge">30% OFF</span>
          </div>
        </div>
      </div>

      {/* 条形码扫描区域 */}
      <div className="card fade-in">
        <div className="card-header">
          <span>📊</span> {t.barcodeSection}
        </div>

        {/* 扫描器容器 */}
        <div
          id="barcode-scanner"
          style={{
            display: isScanning ? 'block' : 'none',
            width: '100%',
            marginBottom: 12
          }}
        />

        {scanError && (
          <div className="alert alert-warning" style={{ marginBottom: 12 }}>
            ⚠️ {scanError}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">{t.barcodeNumber}</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder={t.scanOrEnter}
              style={{ flex: 1, minWidth: 150 }}
            />
            {!isScanning ? (
              <button
                className="btn btn-primary"
                onClick={startScanner}
                style={{ width: 'auto', whiteSpace: 'nowrap' }}
              >
                {t.scan}
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={stopScanner}
                style={{ width: 'auto', whiteSpace: 'nowrap' }}
              >
                {t.stopScan}
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={handleGenerateBarcode}
              style={{ width: 'auto', whiteSpace: 'nowrap' }}
            >
              {t.generate}
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
          <span>📈</span> {t.stockSection}
        </div>

        <div className="form-group">
          <label className="form-label">{t.quantity}</label>
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
            {t.saving}
          </>
        ) : t.confirmEntry}
      </button>
    </div>
  );
}