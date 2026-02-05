import { useState, useEffect } from 'react'; // 1. Agregamos useEffect
import { useAuth } from '../../context/login/LoginContext';
import { useNavigate } from 'react-router-dom'; // 2. Importamos useNavigate
import './login.css';

const Login = () => {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate(); // 3. Inicializamos el hook

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // OPCIONAL PERO RECOMENDADO:
    // Si el usuario ya está logueado y entra a /login, lo mandamos al home automáticamente
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/'); // O la ruta que uses para home (ej: '/dashboard')
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validación básica: solo verificar que no estén vacíos
        if (!email.trim() || !password) {
            setError('Por favor, ingresa usuario y contraseña.');
            return;
        }

        try {
            await login({ email: email.trim(), password });
        } catch (err) {
            // Mostrar mensaje simplificado del servidor
            const msg = err.response?.data?.message || 'Error al iniciar sesión';
            setError(msg);
        }
    };

    // --- ELIMINADO ---
    // Borré el bloque "if (isAuthenticated) return <div>..." 
    // porque eso era lo que bloqueaba la redirección.
    // -----------------

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-brand-section">
                    <div className="login-logo-container">
                        <div className="login-logo">CBG</div>
                    </div>
                    <h2 className="login-brand-title">TransporteCBG</h2>
                </div>

                <div className="login-form-section">
                    <div>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#2a2a2a', fontWeight: '700' }}>Ingreso</h2>
                        <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#6B6B6B', fontWeight: '400' }}>
                            Bienvenido. Por favor ingresa tus credenciales.
                        </p>
                    </div>
                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="email">Usuario</label>
                            <input
                                id="email"
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="Usuario"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Contraseña</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                            />
                        </div>
                        {error && <div className="error-alert">{error}</div>}
                        <button type="submit" className="login-btn">
                            Ingresar
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;