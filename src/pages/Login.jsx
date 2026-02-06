import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      alert("请输入用户名");
      return;
    }

    setIsLoading(true);
    try {
      await login({ username });
      navigate("/");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card fade-in">
        <div className="login-logo">
          <div className="login-logo-icon">📦</div>
        </div>
        <h1 className="login-title">仓库管理系统</h1>
        <p className="login-subtitle">员工登录入口</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">用户名</label>
            <input
              type="text"
              className="form-input"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div className="alert alert-info" style={{ fontSize: '0.85rem' }}>
            💡 提示：使用 "admin" 登录可访问库存管理功能
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner" style={{ width: 18, height: 18 }}></span>
                登录中...
              </>
            ) : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}