import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import client from '../../api/axios';
import { useAuth } from '../../context/login/LoginContext';
import { showSuccessToast, showErrorAlert, showConfirmAlert } from '../../utils/alerts/Alerts';
import { getErrorMsg } from '../../utils/helperError/ErrorMsg';

export const UsersContext = createContext();

export const useUsers = () => {
    const context = useContext(UsersContext);
    if (!context) throw new Error('useUsers debe usarse dentro de un UsersProvider');
    return context;
};

export const UsersProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth(); // Solo necesitamos saber si está logueado
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(false);

    // --- 1. OBTENER USUARIOS ---
    const getUsuarios = useCallback(async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        try {
            const res = await client.get('/users/');
            const usersList = res.data?.data ?? res.data;
            setUsuarios(Array.isArray(usersList) ? usersList : []);
        } catch (error) {
            console.error(error);
            const msg = getErrorMsg(error, 'No se pudo cargar la lista de usuarios');
            showErrorAlert('Error de Carga', msg);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    // --- 2. CREAR USUARIO ---
    const createUsuario = async (userData) => {
        try {
            const res = await client.post('/users/create', userData);
            const created = res.data?.data ?? res.data?.user ?? res.data;
            setUsuarios((prev) => Array.isArray(prev) ? [...prev, created] : [created]);
            showSuccessToast('¡Nuevo usuario creado!');
            return true;
        } catch (error) {
            const msg = getErrorMsg(error, 'Error al crear usuario');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    // --- 3. ACTUALIZAR USUARIO ---
    const updateUsuario = async (id, updatedData) => {
        try {
            const res = await client.put(`/users/update/${id}`, updatedData);
            const updatedFromServer = res.data?.data ?? res.data?.user;
            setUsuarios((prev) => {
                if (!Array.isArray(prev)) return prev;
                return prev.map(u => (u.id === id ? (updatedFromServer ? updatedFromServer : { ...u, ...updatedData }) : u));
            });
            showSuccessToast('¡Usuario actualizado!');
            return true;
        } catch (error) {
            const msg = getErrorMsg(error, 'Error al actualizar usuario');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    // --- 4. ELIMINAR USUARIO ---
    const deleteUsuario = async (id) => {
        const isConfirmed = await showConfirmAlert('¿Eliminar usuario?', 'Esta acción no se puede deshacer.');

        if (isConfirmed) { // <--- Preguntamos directamente al booleano
            try {
                await client.delete(`/users/delete/${id}`);
                setUsuarios((prev) => Array.isArray(prev) ? prev.filter(u => u.id !== id) : []);
                showSuccessToast('¡Usuario eliminado!');
            } catch (error) {
                const msg = error.response?.data?.message || 'Error al eliminar';
                showErrorAlert('Error', msg);
            }
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            getUsuarios();
        }
    }, [getUsuarios, isAuthenticated]);

    return (
        <UsersContext.Provider value={{
            usuarios,
            loading,
            getUsuarios,
            createUsuario,
            updateUsuario,
            deleteUsuario
        }}>
            {children}
        </UsersContext.Provider>
    );
};

export default UsersProvider;