import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import i18n from "../i18n";

const t = i18n.admin;

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="admin-layout">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <span className="admin-logo-icon">📦</span>
                    <span className="admin-logo-text">{t.title}</span>
                </div>

                <nav className="admin-nav">
                    <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="admin-nav-icon">📊</span>
                        <span>{t.dashboard}</span>
                    </NavLink>
                    <NavLink to="/admin/inventory" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="admin-nav-icon">📦</span>
                        <span>{t.inventory}</span>
                    </NavLink>
                    <NavLink to="/admin/employees" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="admin-nav-icon">👥</span>
                        <span>{t.employees}</span>
                    </NavLink>
                    <NavLink to="/admin/reports" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="admin-nav-icon">📈</span>
                        <span>{t.reports}</span>
                    </NavLink>
                    <NavLink to="/admin/settings" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="admin-nav-icon">⚙️</span>
                        <span>{t.settings}</span>
                    </NavLink>
                </nav>

                <div className="admin-sidebar-footer">
                    <div className="admin-user-info">
                        <span className="admin-user-avatar">👤</span>
                        <div className="admin-user-details">
                            <span className="admin-user-name">{user?.username}</span>
                            <span className="admin-user-role">Administrador</span>
                        </div>
                    </div>
                    <button className="admin-logout-btn" onClick={handleLogout}>
                        🚪 {t.logout}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-main">
                <Outlet />
            </main>
        </div>
    );
}
