import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="admin-layout">
            {/* 侧边栏 */}
            <aside className="admin-sidebar">
                <div className="admin-logo">
                    <span className="admin-logo-icon">📦</span>
                    <span className="admin-logo-text">仓库管理</span>
                </div>

                <nav className="admin-nav">
                    <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="admin-nav-icon">📊</span>
                        <span>数据看板</span>
                    </NavLink>
                    <NavLink to="/admin/inventory" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="admin-nav-icon">📦</span>
                        <span>库存管理</span>
                    </NavLink>
                    <NavLink to="/admin/employees" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="admin-nav-icon">👥</span>
                        <span>员工管理</span>
                    </NavLink>
                    <NavLink to="/admin/reports" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="admin-nav-icon">📈</span>
                        <span>统计报表</span>
                    </NavLink>
                    <NavLink to="/admin/settings" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
                        <span className="admin-nav-icon">⚙️</span>
                        <span>系统设置</span>
                    </NavLink>
                </nav>

                <div className="admin-sidebar-footer">
                    <div className="admin-user-info">
                        <span className="admin-user-avatar">👤</span>
                        <div className="admin-user-details">
                            <span className="admin-user-name">{user?.username}</span>
                            <span className="admin-user-role">管理员</span>
                        </div>
                    </div>
                    <button className="admin-logout-btn" onClick={handleLogout}>
                        🚪 退出
                    </button>
                </div>
            </aside>

            {/* 主内容区 */}
            <main className="admin-main">
                <Outlet />
            </main>
        </div>
    );
}
