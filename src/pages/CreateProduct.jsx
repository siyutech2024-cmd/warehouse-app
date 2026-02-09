import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeProductImage, saveInventory } from "../api";
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
  const [useNativeCamera, setUseNativeCamera] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
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
      setUseNativeCamera(true);
      fileInputRef.current?.click();
      return;
    }

    try {
      setCameraError(null);

      // 检查是否支持 getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setUseNativeCamera(true);
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
      // 如果相机访问失败，使用原生文件选择器
      setUseNativeCamera(true);
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

    // AI 分析
    await analyzePhoto(imageData);
  };

  // 处理文件选择（原生相机或图库）
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target.result;
      setImage(imageData);
      setUseNativeCamera(false);

      // AI 分析
      await analyzePhoto(imageData);
    };
    reader.readAsDataURL(file);
  };

  // AI 分析照片
  const analyzePhoto = async (imageData) => {
    setIsAnalyzing(true);
    try {
      console.log("Starting ChatGPT AI analysis...");
      const result = await analyzeProductImage(imageData);
      console.log("AI analysis result:", result);
      result.image = imageData;
      setProduct(result);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      alert("Análisis fallido: " + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 更新产品字段
  const updateField = (field, value) => {
    setProduct(prev => {
      const updated = { ...prev, [field]: value };
      // 如果修改了原价，自动计算折扣价
      if (field === 'originalPrice') {
        updated.discountPrice = Math.round(Number(value) * 0.7);
      }
      return updated;
    });
  };

  // 直接保存产品
  const handleSave = async () => {
    if (!product) {
      alert("Por favor tome una foto y espere el análisis");
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

      // 显示成功动画
      setShowSuccess(true);

      // 3秒后重置
      setTimeout(() => {
        setShowSuccess(false);
        setImage(null);
        setProduct(null);
        setCameraActive(false);
        setCameraError(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 2500);

    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar, por favor intente de nuevo");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetake = () => {
    setImage(null);
    setProduct(null);
    setCameraActive(false);
    setCameraError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 成功提交界面
  if (showSuccess) {
    return (
      <div className="page">
        <div className="success-overlay">
          <div className="success-content">
            <div className="success-icon">✅</div>
            <h2 className="success-title">{t.saveSuccess}</h2>
            <p className="success-message">
              {t.saveSuccessMsg}
            </p>
            <div className="success-details">
              <p><strong>{product?.name}</strong></p>
              <p>{t.quantity}: {product?.stock} {i18n.units.pieces}</p>
              <p>MXN ${product?.discountPrice}</p>
            </div>
            <p className="success-redirect">{t.redirecting}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">{t.title}</h1>

      <div className="card fade-in">
        <div className="card-header">
          <span>📸</span> {t.step1}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* 隐藏的文件输入（用于移动端原生相机） */}
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
              <div className="camera-hint" style={{ fontSize: '0.8rem', color: '#888', marginTop: 8 }}>
                Toque para abrir la cámara
              </div>
            )}
          </div>
        )}

        {cameraActive && (
          <div className="camera-area has-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-video"
            />
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

        {image && (
          <button
            className="btn btn-secondary"
            onClick={handleRetake}
            style={{ marginTop: 12 }}
          >
            {t.retake}
          </button>
        )}
      </div>

      {isAnalyzing && (
        <div className="card fade-in">
          <div className="loading">
            <span className="loading-spinner"></span>
            <span>{t.analyzing}</span>
          </div>
        </div>
      )}

      {product && !isAnalyzing && (
        <div className="card fade-in">
          <div className="card-header">
            <span>✨</span> {t.result}
          </div>

          <div className="product-card">
            {/* 可编辑的产品名称 */}
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">{t.editName}</label>
              <input
                type="text"
                className="form-input"
                value={product.name}
                onChange={(e) => updateField('name', e.target.value)}
              />
            </div>

            {/* 可编辑的描述 */}
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">{t.editDescription}</label>
              <input
                type="text"
                className="form-input"
                value={product.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </div>

            {/* 分类显示 */}
            <div className="product-meta">
              <div className="meta-item">
                <span>📁</span>
                <span>{product.category}</span>
              </div>
            </div>

            {/* 可编辑的价格 */}
            <div className="form-group" style={{ marginBottom: 12, marginTop: 12 }}>
              <label className="form-label">{t.editPrice}</label>
              <input
                type="number"
                className="form-input"
                value={product.originalPrice}
                onChange={(e) => updateField('originalPrice', e.target.value)}
                min="0"
              />
            </div>

            <div className="product-prices" style={{ marginBottom: 12 }}>
              <span className="price-original">MXN ${product.originalPrice}</span>
              <span className="price-discount">MXN ${product.discountPrice}</span>
              <span className="price-badge">30% OFF</span>
            </div>

            {/* 可编辑的库存 */}
            <div className="form-group" style={{ marginBottom: 12 }}>
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
            disabled={isSaving}
            style={{ marginTop: 16 }}
          >
            {isSaving ? (
              <>
                <span className="loading-spinner" style={{ width: 18, height: 18 }}></span>
                {t.saving}
              </>
            ) : t.confirmSave}
          </button>
        </div>
      )}
    </div>
  );
}