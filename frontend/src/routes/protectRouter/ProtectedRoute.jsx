import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/login/LoginContext';
import OfflineScreen from '../../components/ui/OfflineScreen';

const ProtectedRoute = ({ redirectIfAuthenticated = false, children }) => {
  const { isAuthenticated, loading, isOffline } = useAuth();

  // Mientras carga, no renderizamos nada (App ya muestra spinner)
  if (loading) {
    return null;
  }

  // MODO OFFLINE:
  // - En rutas protegidas, si no podemos validar sesión (por estar offline),
  //   no redirigimos a /login: mostramos pantalla informativa y esperamos reconexión.
  if (!redirectIfAuthenticated && isOffline && !isAuthenticated) {
    return <OfflineScreen />;
  }

  // Ruta pública (login) → si está autenticado, redirigir
  if (redirectIfAuthenticated && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Ruta protegida → si NO está autenticado, redirigir a login
  if (!redirectIfAuthenticated && !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Render normal
  return children ? children : <Outlet />;
};

export default ProtectedRoute;
