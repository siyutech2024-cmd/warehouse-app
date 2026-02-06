import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { analyzeProductImage } from "../api";
import { store } from "../store";

export default function CreateProduct() {
  const [image, setImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [product, setProduct] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 读取图片
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target.result;
      setImage(imageData);

      // AI 分析
      setIsAnalyzing(true);
      try {
        const result = await analyzeProductImage(imageData);
        setProduct(result);
      } catch (error) {
        console.error("分析失败:", error);
        alert("分析失败，请重试");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleNext = () => {
    if (!product) {
      alert("请先拍照并等待分析完成");
      return;
    }
    store.setProduct(product);
    navigate("/barcode");
  };

  const handleRetake = () => {
    setImage(null);
    setProduct(null);
    fileInputRef.current.value = "";
  };

  return (
    <div className="page">
      <h1 className="page-title">📷 拍照入库</h1>

      <div className="card fade-in">
        <div className="card-header">
          <span>📸</span> 第一步：拍摄产品照片
        </div>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageSelect}
          ref={fileInputRef}
          style={{ display: "none" }}
          id="camera-input"
        />

        {!image ? (
          <label htmlFor="camera-input" className="camera-area">
            <div className="camera-icon">📷</div>
            <div className="camera-text">点击拍照或选择图片</div>
          </label>
        ) : (
          <div className="camera-area has-image">
            <img src={image} alt="产品图片" className="camera-preview" />
          </div>
        )}

        {image && (
          <button
            className="btn btn-secondary"
            onClick={handleRetake}
            style={{ marginTop: 12 }}
          >
            🔄 重新拍照
          </button>
        )}
      </div>

      {isAnalyzing && (
        <div className="card fade-in">
          <div className="loading">
            <span className="loading-spinner"></span>
            <span>AI 正在分析产品信息...</span>
          </div>
        </div>
      )}

      {product && !isAnalyzing && (
        <div className="card fade-in">
          <div className="card-header">
            <span>✨</span> AI 分析结果
          </div>

          <div className="product-card">
            <div className="product-name">{product.name}</div>
            <div className="product-description">{product.description}</div>

            <div className="product-prices">
              <span className="price-original">¥{product.originalPrice}</span>
              <span className="price-discount">¥{product.discountPrice}</span>
              <span className="price-badge">7折</span>
            </div>

            <div className="product-meta">
              <div className="meta-item">
                <span>📦</span>
                <span>库存: {product.stock} 件</span>
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
            下一步：录入条形码 →
          </button>
        </div>
      )}
    </div>
  );
}