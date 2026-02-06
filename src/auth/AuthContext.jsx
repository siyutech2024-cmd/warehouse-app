import { createContext, useContext, useState, useEffect } from "react";
import { store } from "../store";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // 恢复登录状态
  useEffect(() => {
    if (store.currentUser) {
      setUser(store.currentUser);
    }
  }, []);

  const login = async ({ username }) => {
    const newUser = username === "admin"
      ? { username, role: "ADMIN" }
      : { username, role: "EMPLOYEE" };

    setUser(newUser);
    store.setCurrentUser(newUser);
    return true;
  };

  const logout = () => {
    setUser(null);
    store.setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}