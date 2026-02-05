import { createContext, useState, useEffect, useContext, useRef } from 'react';
import client from '../../api/axios';
import Swal from 'sweetalert2';

export const LoginContext = createContext();

export const useAuth = () => {
  const context = useContext(LoginContext);
  if (!context) throw new Error('useAuth debe usarse dentro de LoginProvider');
  return context;
};

export const LoginProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const hasCheckedRef = useRef(false);

  /**
   * CHECK SESSION AL INICIAR (UNA SOLA VEZ)
   */
  useEffect(() => {
    const checkSession = async () => {
      if (hasCheckedRef.current) {
        setLoading(false);
        return;
      }

      if (isOffline) {
        setLoading(false);
        return;
      }

      try {
        const res = await client.get('/users/perfil');
        setUser(res.data);
        setIsAuthenticated(true);
      } catch (error) {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        hasCheckedRef.current = true;
        setLoading(false); // 🔴 CLAVE ABSOLUTA
      }
    };

    checkSession();
  }, [isOffline]);

  /**
   * LOGIN
   */
  const login = async (credentials) => {
    if (isOffline) {
      Swal.fire('Sin conexión', 'No hay conexión a internet', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await client.post('/auth/login', credentials);
      setUser(res.data.data.user);
      setIsAuthenticated(true);
      hasCheckedRef.current = true;
      return res.data;
    } finally {
      setLoading(false);
    }
  };

  /**
   * LOGOUT SEGURO
   */
  const logout = async () => {
    try {
      if (!isOffline) {
        await client.post('/auth/logout');
      }
    } catch (_) {
      // ignorar
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      hasCheckedRef.current = true;
      window.location.href = '/login';
    }
  };

  /**
   * SESIÓN EXPIRADA (AXIOS)
   */
  useEffect(() => {
    const handleSessionExpired = () => {
      if (!isAuthenticated) return;
      logout();
      Swal.fire('Sesión expirada', 'Volvé a iniciar sesión', 'warning');
    };

    window.addEventListener('SESSION_EXPIRED', handleSessionExpired);
    return () => window.removeEventListener('SESSION_EXPIRED', handleSessionExpired);
  }, [isAuthenticated]);

  /**
   * ONLINE / OFFLINE
   */
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <LoginContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        isOffline,
        login,
        logout
      }}
    >
      {children}
    </LoginContext.Provider>
  );
};

export default LoginProvider;