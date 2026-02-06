import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeProductImage } from "../api";
import { store } from "../store";
import i18n from "../i18n";

const t = i18n.createProduct;

export default function CreateProduct() {
  const [image, setImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [product, setProduct] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();

  // 清理相机流
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
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
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      setCameraError("No se pudo acceder a la cámara. Por favor, permita el acceso.");
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
    setIsAnalyzing(true);
    try {
      const result = await analyzeProductImage(imageData);
      result.image = imageData;
      setProduct(result);
    } catch (error) {
      console.error("Análisis fallido:", error);
      alert("Análisis fallido, por favor intente de nuevo");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNext = () => {
    if (!product) {
      alert("Por favor tome una foto y espere el análisis");
      return;
    }
    store.setProduct(product);
    navigate("/barcode");
  };

  const handleRetake = () => {
    setImage(null);
    setProduct(null);
    setCameraActive(false);
  };

  return (
    <div className="page">
      <h1 className="page-title">{t.title}</h1>

      <div className="card fade-in">
        <div className="card-header">
          <span>📸</span> {t.step1}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {!image && !cameraActive && (
          <div className="camera-area" onClick={startCamera}>
            <div className="camera-icon">📷</div>
            <div className="camera-text">{t.startCamera}</div>
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
            <div className="product-name">{product.name}</div>
            <div className="product-description">{product.description}</div>

            <div className="product-prices">
              <span className="price-original">${product.originalPrice}</span>
              <span className="price-discount">${product.discountPrice}</span>
              <span className="price-badge">30% OFF</span>
            </div>

            <div className="product-meta">
              <div className="meta-item">
                <span>📦</span>
                <span>{t.stock}: {product.stock} {i18n.units.pieces}</span>
              </div>
              <div className="meta-item">
                <span>📁</span>
                <span>{product.category}</span>
              </div>
            </div>
          </div>

          <button
            className="btn btn-success"
            onClick={handleNext}
            style={{ marginTop: 16 }}
          >
            {t.nextStep}
          </button>
        </div>
      )}
    </div>
  );
}