import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";

import Login from "./pages/Login";
import CreateProduct from "./pages/CreateProduct";
import ScanBarcode from "./pages/ScanBarcode";
import MyRecords from "./pages/MyRecords";

// 管理员后台
import AdminLayout from "./admin/AdminLayout";
import Dashboard from "./admin/Dashboard";
import AdminInventory from "./admin/AdminInventory";
import AdminEmployees from "./admin/AdminEmployees";
import AdminReports from "./admin/AdminReports";
import AdminSettings from "./admin/AdminSettings";

function BottomNav() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // 管理员后台不显示底部导航
  if (!user || location.pathname === "/login" || location.pathname.startsWith("/admin")) return null;

  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <span className="nav-icon">📷</span>
        <span>拍照入库</span>
      </NavLink>
      <NavLink to="/barcode" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span className="nav-icon">📊</span>
        <span>条形码</span>
      </NavLink>
      <NavLink to="/my-records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span className="nav-icon">📋</span>
        <span>我的记录</span>
      </NavLink>
      {user.role === "ADMIN" && (
        <NavLink to="/admin" className="nav-item">
          <span className="nav-icon">⚙️</span>
          <span>后台管理</span>
        </NavLink>
      )}
      <button onClick={logout} className="nav-item" style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
        <span className="nav-icon">🚪</span>
        <span>退出</span>
      </button>
    </nav>
  );
}

// 管理员路由保护
function AdminRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "ADMIN") return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 员工端 */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><CreateProduct /></ProtectedRoute>} />
          <Route path="/barcode" element={<ProtectedRoute><ScanBarcode /></ProtectedRoute>} />
          <Route path="/my-records" element={<ProtectedRoute><MyRecords /></ProtectedRoute>} />

          {/* 管理员后台 */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="employees" element={<AdminEmployees />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
        <BottomNav />
      </BrowserRouter>
    </AuthProvider>
  );
}