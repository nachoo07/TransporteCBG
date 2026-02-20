import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import client from '../../api/axios';
import { useAuth } from '../../context/login/LoginContext';
import { showSuccessToast, showErrorAlert, showConfirmAlert } from '../../utils/alerts/Alerts';
import { getErrorMsg } from '../../utils/helperError/ErrorMsg';
// 🔥 NOTA: Ya no importamos verificarInfoCompleta aquí porque confiamos en el backend.

export const DriverContext = createContext();

export const useDriver = () => {
    const context = useContext(DriverContext);
    if (!context) throw new Error('useDriver debe usarse dentro de un DriverProvider');
    return context;
};

export const DriverProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [drivers, setDrivers] = useState([]);
    const [inactiveDrivers, setInactiveDrivers] = useState([]);
    const [loading, setLoading] = useState(false);

    // --- 1. OBTENER CHOFERES ACTIVOS ---
    const getDrivers = useCallback(async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        try {
            const res = await client.get('/drivers/'); 
            const driversList = res.data.data || res.data;
            
            setDrivers(Array.isArray(driversList) ? driversList : []);
            
        } catch (error) {
            if (error?.isOffline) return;
            const msg = getErrorMsg(error, 'No se pudo cargar la lista de choferes');
            showErrorAlert('Error', msg);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    // --- 1.1 OBTENER CHOFERES INACTIVOS ---
    const getInactiveDrivers = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            const res = await client.get('/drivers/inactive'); 
            const inactiveList = res.data.data || res.data;
            
            setInactiveDrivers(Array.isArray(inactiveList) ? inactiveList : []);
            
        } catch (error) {
            if (error?.isOffline) return;
            const msg = getErrorMsg(error, 'No se pudo cargar la lista de choferes inactivos');
            showErrorAlert('Error', msg);
        }
    }, [isAuthenticated]);

    // ... (El resto del archivo getDriverById, createDriver, updateDriver, deleteDriver sigue igual, son correctos)
    const getDriverById = useCallback(async (id) => {
        try {
            const res = await client.get(`/drivers/${id}`);
            return res.data.data || res.data;
        } catch (error) {
            if (error?.isOffline) return null;
            const msg = getErrorMsg(error, 'No se pudo obtener el chofer');
            showErrorAlert('Error', msg);
            return null;
        }
    }, []);

    const createDriver = async (driverData) => {
        try {
            const res = await client.post('/drivers/create', driverData);
            const createdFromServer = res.data.data || res.data;
            // Al crear, confiamos en la respuesta del server
            setDrivers(prev => [...prev, createdFromServer]);
            
            showSuccessToast('¡Chofer registrado correctamente!');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const msg = getErrorMsg(error, 'Error al crear chofer');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    const updateDriver = async (id, updatedData) => {
        try {
            const res = await client.put(`/drivers/update/${id}`, updatedData);
            const updatedFromServer = res.data.data || res.data;

            setDrivers(prev => prev.map(d => {
                if (String(d.id) === String(id)) {
                    // Reemplazamos completo con lo que devolvió el backend (incluyendo info_completa actualizado)
                    return { ...d, ...updatedFromServer, id: id };
                }
                return d;
            }));

            showSuccessToast('¡Chofer actualizado correctamente!');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const msg = getErrorMsg(error, 'Error al actualizar chofer');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    const deleteDriver = async (id) => {
        const isConfirmed = await showConfirmAlert(
            '¿Archivar chofer?',
            'El chofer no aparecerá para nuevas operaciones, pero se conservará para el historial.',
            { confirmButtonText: 'Sí, archivar' }
        );
        if (isConfirmed) {
            try {
                await client.delete(`/drivers/delete/${id}`);

                setDrivers(prev =>
                  Array.isArray(prev) ? prev.filter(d => String(d.id) !== String(id)) : []
                );

                setInactiveDrivers(prev => {
                  const deleted = drivers.find(d => String(d.id) === String(id));
                  if (!deleted) return prev;
                  return [
                    ...prev,
                    {
                      ...deleted,
                      activo: false,
                      fecha_de_baja: new Date().toISOString()
                    }
                  ];
                });

                showSuccessToast('¡Chofer archivado!');
                return true;
            } catch (error) {
                if (error?.isOffline) return false;
                const msg = getErrorMsg(error, 'Error al eliminar');
                showErrorAlert('Error', msg);
                return false;
            }
        }
        return false;
    };

    // --- REACTIVAR CHOFER ---
const reactivateDriver = async (id) => {
        try {
            await client.put(`/drivers/reactivate/${id}`);
            
            // Eliminar del listado de inactivos
            setInactiveDrivers(prev => prev.filter(d => d.id !== id));
            
            // Traer los activos nuevamente para actualizar lista completa
            const activeRes = await client.get('/drivers/');
            const activeList = activeRes.data.data || activeRes.data;
            setDrivers(Array.isArray(activeList) ? activeList : []);
            
            showSuccessToast('¡Chofer reactivado correctamente!');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const msg = getErrorMsg(error, 'Error al reactivar chofer');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            getDrivers();
            getInactiveDrivers();
        }
    }, [getDrivers, getInactiveDrivers, isAuthenticated]);

    return (
        <DriverContext.Provider value={{
            drivers,
            inactiveDrivers,
            loading,
            createDriver,
            updateDriver,
            deleteDriver,
            reactivateDriver,
            getDrivers,
            getInactiveDrivers,
            getDriverById
        }}>
            {children}
        </DriverContext.Provider>
    );
};

export default DriverProvider;
