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
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const hasCheckedRef = useRef(false);
  const sessionExpiredHandledRef = useRef(false);

  /**
   * CHECK SESSION AL INICIAR (UNA SOLA VEZ)
   */
  useEffect(() => {
    const checkSession = async () => {
      if (hasCheckedRef.current) {
        setIsCheckingSession(false);
        return;
      }

      if (isOffline) {
        setIsCheckingSession(false);
        return;
      }

      setIsCheckingSession(true);
      try {
        const res = await client.get('/users/perfil');
        setUser(res.data?.usuario || null);
        setIsAuthenticated(true);
      } catch {
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        hasCheckedRef.current = true;
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, [isOffline]);

  /**
   * LOGIN
   */
  const login = async (credentials) => {
    if (isOffline) {
      const offlineError = new Error('No hay conexión a internet.');
      offlineError.isOffline = true;
      showErrorAlert('Sin conexión', offlineError.message);
      throw offlineError;
    }

    try {
      const res = await client.post('/auth/login', credentials);
      setUser(res.data.data.user);
      setIsAuthenticated(true);
      hasCheckedRef.current = true;
      sessionExpiredHandledRef.current = false;
      return res.data;
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      throw error;
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
      sessionExpiredHandledRef.current = false;
    }
  };

  /**
   * SESIÓN EXPIRADA (AXIOS)
   */
  useEffect(() => {
    const handleSessionExpired = () => {
      if (!isAuthenticated) return;
      if (sessionExpiredHandledRef.current) return;
      sessionExpiredHandledRef.current = true;
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
        loading: isCheckingSession,
        isCheckingSession,
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
