import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import i18n from "../i18n";

const t = i18n.login;

export default function Login() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      alert(t.enterUsername);
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
        <h1 className="login-title">{i18n.app.title}</h1>
        <p className="login-subtitle">{t.title}</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t.username}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t.enterUsername}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          <div className="alert alert-info" style={{ fontSize: '0.85rem' }}>
            💡 Consejo: Use "admin" para acceder a funciones de administración
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner" style={{ width: 18, height: 18 }}></span>
                {i18n.app.loading}
              </>
            ) : t.button}
          </button>
        </form>
      </div>
    </div>
  );
}