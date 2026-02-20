import { createContext, useState, useEffect, useContext, useRef } from 'react';
import client from '../../api/axios';
import Swal from 'sweetalert2';
import { showErrorAlert } from '../../utils/alerts/Alerts';

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

      setLoading(true);
      try {
        const res = await client.get('/users/perfil');
        setUser(res.data?.usuario || null);
        setIsAuthenticated(true);
      } catch {
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
      showErrorAlert('Sin conexión', 'No hay conexión a internet');
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
    } catch {
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
      showErrorAlert('Sesión expirada', 'Volvé a iniciar sesión');
    };

    window.addEventListener('SESSION_EXPIRED', handleSessionExpired);
    return () => window.removeEventListener('SESSION_EXPIRED', handleSessionExpired);
  }, [isAuthenticated]);

  /**
   * ONLINE / OFFLINE
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Si quedó un modal de "Sin conexión" abierto, lo cerramos al reconectar
      Swal.close();
    };
    const handleOffline = () => setIsOffline(true);
    const handleAppOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('APP_OFFLINE', handleAppOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('APP_OFFLINE', handleAppOffline);
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
