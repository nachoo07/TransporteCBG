import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/login/LoginContext';

const ProtectedRoute = ({ redirectIfAuthenticated = false, children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Mientras carga, no renderizamos nada (App ya muestra spinner)
  if (loading) {
    return null;
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