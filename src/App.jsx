import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import i18n from "./i18n";

import Login from "./pages/Login";
import CreateProduct from "./pages/CreateProduct";
import ScanBarcode from "./pages/ScanBarcode";
import MyRecords from "./pages/MyRecords";

// Admin Backend
import AdminLayout from "./admin/AdminLayout";
import Dashboard from "./admin/Dashboard";
import AdminInventory from "./admin/AdminInventory";
import AdminEmployees from "./admin/AdminEmployees";
import AdminReports from "./admin/AdminReports";
import AdminSettings from "./admin/AdminSettings";

const nav = i18n.nav;

function BottomNav() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Hide bottom nav for admin section
  if (!user || location.pathname === "/login" || location.pathname.startsWith("/admin")) return null;

  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <span className="nav-icon">📷</span>
        <span>{nav.photo}</span>
      </NavLink>
      <NavLink to="/barcode" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span className="nav-icon">📊</span>
        <span>{nav.barcode}</span>
      </NavLink>
      <NavLink to="/my-records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span className="nav-icon">📋</span>
        <span>{nav.myRecords}</span>
      </NavLink>
      {user.role === "ADMIN" && (
        <NavLink to="/admin" className="nav-item">
          <span className="nav-icon">⚙️</span>
          <span>{nav.admin}</span>
        </NavLink>
      )}
      <button onClick={logout} className="nav-item" style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
        <span className="nav-icon">🚪</span>
        <span>Salir</span>
      </button>
    </nav>
  );
}

// Admin route protection
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
          {/* Employee Pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><CreateProduct /></ProtectedRoute>} />
          <Route path="/barcode" element={<ProtectedRoute><ScanBarcode /></ProtectedRoute>} />
          <Route path="/my-records" element={<ProtectedRoute><MyRecords /></ProtectedRoute>} />

          {/* Admin Backend */}
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