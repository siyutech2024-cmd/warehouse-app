import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Barcode from "react-barcode";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { saveInventory, generateBarcode, checkBarcodeExists } from "../api";
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
  const [scanStatus, setScanStatus] = useState("");
  const [barcodeWarning, setBarcodeWarning] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const scannerRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    const storedProduct = store.product;
    if (storedProduct) {
      setProduct(storedProduct);
      setStock(storedProduct.stock || 10);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => { });
      }
    };
  }, []);

  // 检查条形码是否重复
  const checkDuplicate = async (code) => {
    if (!code || code.length < 3) {
      setBarcodeWarning("");
      return;
    }

    try {
      const exists = await checkBarcodeExists(code);
      if (exists) {
        setBarcodeWarning(`⚠️ ¡Este código ya existe! Por favor use otro código.`);
      } else {
        setBarcodeWarning("");
      }
    } catch (error) {
      console.log("Error checking barcode:", error);
    }
  };

  // 条形码变化时检查重复
  const handleBarcodeChange = (e) => {
    const newCode = e.target.value;
    setBarcode(newCode);
    checkDuplicate(newCode);
  };

  const startScanner = async () => {
    try {
      setScanError(null);
      setScanStatus("Iniciando cámara...");
      setIsScanning(true);

      // 只支持最常用格式，加快识别速度
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.QR_CODE
      ];

      const html5QrCode = new Html5Qrcode("barcode-scanner", {
        formatsToSupport: formatsToSupport,
        verbose: false
      });
      scannerRef.current = html5QrCode;

      // 超高速扫描配置
      const config = {
        fps: 30, // 最高帧率
        qrbox: { width: 350, height: 180 }, // 宽矩形更适合条形码
        aspectRatio: 2.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true // 使用原生API如支持
        }
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        async (decodedText, decodedResult) => {
          console.log("✅ Scanned:", decodedText);
          setBarcode(decodedText);
          setScanStatus(`¡Escaneado! ${decodedResult.result.format?.formatName || ''}`);
          stopScanner();
          // 检查重复
          await checkDuplicate(decodedText);
        },
        () => { }
      );

      setScanStatus("Apunte la cámara al código de barras");
    } catch (error) {
      console.error("Scanner error:", error);
      setScanError(`Error: ${error.message || error}`);
      setScanStatus("");
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) { }
      scannerRef.current = null;
    }
    setIsScanning(false);
    setScanStatus("");
  };

  const handleGenerateBarcode = async () => {
    let newBarcode;
    let attempts = 0;

    // 生成唯一条形码，最多尝试5次
    do {
      newBarcode = generateBarcode();
      const exists = await checkBarcodeExists(newBarcode);
      if (!exists) break;
      attempts++;
    } while (attempts < 5);

    setBarcode(newBarcode);
    setBarcodeWarning("");
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

    // 保存前再次检查重复
    const exists = await checkBarcodeExists(barcode);
    if (exists) {
      alert("⚠️ Este código de barras ya existe. Por favor use otro código.");
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

      // 显示成功动画
      setShowSuccess(true);
      store.clearProduct();

      // 3秒后跳转
      setTimeout(() => {
        navigate("/");
      }, 2500);

    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar, por favor intente de nuevo");
      setIsSaving(false);
    }
  };

  // 成功提交界面
  if (showSuccess) {
    return (
      <div className="page">
        <div className="success-overlay">
          <div className="success-content">
            <div className="success-icon">✅</div>
            <h2 className="success-title">¡Entrada Exitosa!</h2>
            <p className="success-message">
              El producto ha sido registrado correctamente.
            </p>
            <div className="success-details">
              <p><strong>{product?.name}</strong></p>
              <p>Código: {barcode}</p>
              <p>Cantidad: {stock} unidades</p>
            </div>
            <p className="success-redirect">Redirigiendo...</p>
          </div>
        </div>
      </div>
    );
  }

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
            <span className="price-original">MXN ${product.originalPrice}</span>
            <span className="price-discount">MXN ${product.discountPrice}</span>
            <span className="price-badge">30% OFF</span>
          </div>
        </div>
      </div>

      {/* 条形码扫描区域 */}
      <div className="card fade-in">
        <div className="card-header">
          <span>📊</span> {t.barcodeSection}
        </div>

        <div
          id="barcode-scanner"
          style={{
            display: isScanning ? 'block' : 'none',
            width: '100%',
            minHeight: isScanning ? 250 : 0,
            marginBottom: 12,
            borderRadius: 12,
            overflow: 'hidden'
          }}
        />

        {scanStatus && (
          <div className="alert alert-info" style={{ marginBottom: 12 }}>
            📷 {scanStatus}
          </div>
        )}

        {scanError && (
          <div className="alert alert-warning" style={{ marginBottom: 12 }}>
            ⚠️ {scanError}
          </div>
        )}

        {/* 重复警告 */}
        {barcodeWarning && (
          <div className="alert alert-danger" style={{ marginBottom: 12 }}>
            {barcodeWarning}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">{t.barcodeNumber}</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              className={`form-input ${barcodeWarning ? 'input-error' : ''}`}
              value={barcode}
              onChange={handleBarcodeChange}
              placeholder={t.scanOrEnter}
              style={{ flex: 1, minWidth: 150 }}
            />
            {!isScanning ? (
              <button
                className="btn btn-primary"
                onClick={startScanner}
                style={{ width: 'auto', whiteSpace: 'nowrap' }}
              >
                📷 {t.scan}
              </button>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={stopScanner}
                style={{ width: 'auto', whiteSpace: 'nowrap' }}
              >
                ⏹️ {t.stopScan}
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={handleGenerateBarcode}
              style={{ width: 'auto', whiteSpace: 'nowrap' }}
            >
              🔢 {t.generate}
            </button>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', color: '#888', marginTop: 8 }}>
          Formatos: EAN-13, EAN-8, Code-128, UPC-A, QR
        </div>

        {barcode && !barcodeWarning && (
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
        disabled={isSaving || !!barcodeWarning}
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