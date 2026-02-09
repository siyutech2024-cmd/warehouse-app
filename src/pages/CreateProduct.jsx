import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeImage, saveInventory } from "../api";
import { useAuth } from "../auth/AuthContext";
import i18n from "../i18n";

const t = i18n.createProduct;

export default function CreateProduct() {
  const [image, setImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedProduct, setSavedProduct] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // 检测是否为移动设备
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // 清理相机流
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 尝试启动相机流
  const startCamera = async () => {
    // 移动端优先使用原生相机
    if (isMobile) {
      fileInputRef.current?.click();
      return;
    }

    try {
      setCameraError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        fileInputRef.current?.click();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      setCameraError("Cámara no disponible. Use selección de archivo.");
      fileInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    setImage(imageData);
    stopCamera();
    await analyzePhoto(imageData);
  };

  // 处理文件选择
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target.result;
      setImage(imageData);
      await analyzePhoto(imageData);
    };
    reader.readAsDataURL(file);
  };

  // AI 分析照片
  const analyzePhoto = async (imageData) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeImage(imageData);
      result.image = imageData;
      setProduct(result);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      // 分析失败时提供默认可编辑数据
      setProduct({
        name: "",
        description: "",
        category: "Otros",
        originalPrice: 100,
        discountPrice: 70,
        stock: 10,
        image: imageData
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 更新产品字段
  const updateField = (field, value) => {
    setProduct(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'originalPrice') {
        updated.discountPrice = Math.round(Number(value) * 0.7);
      }
      return updated;
    });
  };

  // 重置表单，准备下一个产品
  const resetForm = () => {
    setImage(null);
    setProduct(null);
    setCameraActive(false);
    setCameraError(null);
    setShowSuccess(false);
    setSavedProduct(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 保存产品
  const handleSave = async () => {
    if (!product) return;

    if (!product.name?.trim()) {
      alert("Por favor ingrese el nombre del producto");
      return;
    }

    setIsSaving(true);
    try {
      await saveInventory({
        ...product,
        stock: product.stock || 10,
        createdBy: user?.username || 'unknown',
        createdAt: new Date().toISOString()
      });

      // 保存成功信息
      setSavedProduct({ ...product });
      setShowSuccess(true);

    } catch (error) {
      console.error("Error al guardar:", error);
      alert(`❌ Error al guardar: ${error.message || 'Intente de nuevo'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetake = () => {
    setImage(null);
    setProduct(null);
    setCameraError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 成功界面 — 带"继续录入"和"查看记录"按钮
  if (showSuccess) {
    return (
      <div className="page">
        <div className="success-overlay">
          <div className="success-content">
            <div className="success-icon">✅</div>
            <h2 className="success-title">{t.saveSuccess}</h2>
            <p className="success-message">{t.saveSuccessMsg}</p>
            <div className="success-details">
              {savedProduct?.image && (
                <img
                  src={savedProduct.image}
                  alt={savedProduct.name}
                  style={{
                    width: 80, height: 80, objectFit: 'cover',
                    borderRadius: 12, margin: '0 auto 12px', display: 'block'
                  }}
                />
              )}
              <p><strong>{savedProduct?.name}</strong></p>
              <p>{t.quantity}: {savedProduct?.stock} {i18n.units.pieces}</p>
              <p>MXN ${savedProduct?.discountPrice}</p>
            </div>

            {/* 操作按钮 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              <button
                className="btn btn-primary"
                onClick={resetForm}
                style={{ fontSize: '1rem' }}
              >
                📷 Agregar otro producto
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate("/my-records")}
                style={{ fontSize: '0.9rem' }}
              >
                📋 Ver mis registros
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">{t.title}</h1>

      {/* 拍照区域 */}
      <div className="card fade-in">
        <div className="card-header">
          <span>📸</span> {t.step1}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {!image && !cameraActive && (
          <div className="camera-area" onClick={startCamera}>
            <div className="camera-icon">📷</div>
            <div className="camera-text">{t.startCamera}</div>
            {isMobile && (
              <div style={{ fontSize: '0.8rem', color: '#888', marginTop: 8 }}>
                Toque para abrir la cámara
              </div>
            )}
          </div>
        )}

        {cameraActive && (
          <div className="camera-area has-video">
            <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
            <div className="camera-controls">
              <button className="btn btn-primary capture-btn" onClick={capturePhoto}>
                {t.capture}
              </button>
              <button className="btn btn-secondary" onClick={stopCamera}>
                {t.stopCamera}
              </button>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="alert alert-warning" style={{ marginTop: 12 }}>
            ⚠️ {cameraError}
          </div>
        )}

        {image && (
          <div className="camera-area has-image">
            <img src={image} alt="Foto del producto" className="camera-preview" />
          </div>
        )}

        {image && !isAnalyzing && (
          <button className="btn btn-secondary" onClick={handleRetake} style={{ marginTop: 12 }}>
            {t.retake}
          </button>
        )}
      </div>

      {/* AI 分析中 */}
      {isAnalyzing && (
        <div className="card fade-in">
          <div className="loading">
            <span className="loading-spinner"></span>
            <span>{t.analyzing}</span>
          </div>
        </div>
      )}

      {/* 分析结果 — 可编辑表单 */}
      {product && !isAnalyzing && (
        <div className="card fade-in">
          <div className="card-header">
            <span>✨</span> {t.result}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 0' }}>
            {/* 产品名称 */}
            <div className="form-group">
              <label className="form-label">{t.editName}</label>
              <input
                type="text"
                className="form-input"
                value={product.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Ej: Coca Cola 600ml"
              />
            </div>

            {/* 描述 */}
            <div className="form-group">
              <label className="form-label">{t.editDescription}</label>
              <input
                type="text"
                className="form-input"
                value={product.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Descripción breve del producto"
              />
            </div>

            {/* 分类选择 */}
            <div className="form-group">
              <label className="form-label">{t.category}</label>
              <select
                className="form-input"
                value={product.category}
                onChange={(e) => updateField('category', e.target.value)}
              >
                {["Electrónica", "Oficina", "Hogar", "Ropa", "Alimentos", "Bebidas", "Limpieza", "Herramientas", "Juguetes", "Otros"].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* 价格区域 */}
            <div className="form-group">
              <label className="form-label">{t.editPrice}</label>
              <input
                type="number"
                className="form-input"
                value={product.originalPrice}
                onChange={(e) => updateField('originalPrice', e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="product-prices">
              <span className="price-original">MXN ${product.originalPrice}</span>
              <span className="price-discount">MXN ${product.discountPrice}</span>
              <span className="price-badge">30% OFF</span>
            </div>

            {/* 库存 */}
            <div className="form-group">
              <label className="form-label">{t.editStock}</label>
              <input
                type="number"
                className="form-input"
                value={product.stock}
                onChange={(e) => updateField('stock', parseInt(e.target.value) || 0)}
                min="1"
              />
            </div>
          </div>

          {/* 保存按钮 */}
          <button
            className="btn btn-success"
            onClick={handleSave}
            disabled={isSaving || !product.name?.trim()}
            style={{ marginTop: 16, width: '100%', padding: '14px', fontSize: '1rem' }}
          >
            {isSaving ? (
              <>
                <span className="loading-spinner" style={{ width: 18, height: 18, marginRight: 8 }}></span>
                {t.saving}
              </>
            ) : t.confirmSave}
          </button>
        </div>
      )}
    </div>
  );
}