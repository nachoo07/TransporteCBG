import { useState, useEffect } from 'react'; // 1. Agregamos useEffect
import { useAuth } from '../../context/login/LoginContext';
import { useNavigate } from 'react-router-dom'; // 2. Importamos useNavigate
import { FiEye, FiEyeOff } from 'react-icons/fi';
import './login.css';

const Login = () => {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate(); // 3. Inicializamos el hook

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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
            setSubmitting(true);
            await login({ email: email.trim(), password });
        } catch (err) {
            const msg =
                err.response?.data?.message ||
                err.message ||
                'Error al iniciar sesión';
            setError(msg);
        } finally {
            setSubmitting(false);
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
                    <h2 className="login-brand-title">Transporte CBG</h2>
                </div>

                <div className="login-form-section">
                    <div className="login-form-header">
                        <h2 className="login-title">Ingreso</h2>
                        <p className="login-subtitle">
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
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                autoComplete="username"
                                style={{ textTransform: 'none' }}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Contraseña</label>
                            <div className="password-field">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    autoComplete="current-password"
                                    style={{ textTransform: 'none' }}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                    {showPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </div>
                        </div>
                        {error && <div className="error-alert">{error}</div>}
                        <button type="submit" className={`login-btn${submitting ? ' loading' : ''}`} disabled={submitting}>
                            {submitting ? 'Ingresando...' : 'Ingresar'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
