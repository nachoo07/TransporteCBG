import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import client from '../../api/axios';
import { useAuth } from '../../context/login/LoginContext'; // Ajusta la ruta si cambiaste de lugar el AuthContext
import { showErrorAlert, showSuccessToast, showConfirmAlert } from '../../utils/alerts/Alerts';
import { getErrorMsg } from '../../utils/helperError/ErrorMsg';

export const CoupledContext = createContext();

export const useCoupled = () => {
    const context = useContext(CoupledContext);
    if (!context) throw new Error('useCoupled debe usarse dentro de un CoupledProvider');
    return context;
};

const CoupledProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [coupled, setCoupled] = useState([]);
    const [inactiveCoupled, setInactiveCoupled] = useState([]);
    const [loading, setLoading] = useState(false);

    const getCoupled = useCallback(async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        try {
            const res = await client.get('/coupled/'); // Asegúrate que tu ruta en backend sea /coupled
            // Ajustamos para leer la data correctamente según tu backend
            const coupledList = res.data.data || res.data; 
            setCoupled(Array.isArray(coupledList) ? coupledList : []);
        } catch (error) {
            if (error?.isOffline) return;
            const msg = getErrorMsg(error, 'No se pudo cargar la lista de acoplados');
            showErrorAlert('Error', msg);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const getCoupledById = useCallback(async (id) => {
        try {
            const res = await client.get(`/coupled/${id}`);
            // Retornamos los datos al componente para que él los muestre
            return res.data.data || res.data;
        } catch (error) {
            if (error?.isOffline) return null;
            const msg = getErrorMsg(error, 'No se pudo obtener la información del acoplado');
            showErrorAlert('Error', msg);
            return null;
        }
    }, []);

    const createCoupled = async (coupledData) => {
        try {
            // Nota: coupledData debe ser un objeto FormData si lleva archivos
            const res = await client.post('/coupled/create', coupledData);
            
            // Obtenemos el objeto creado
            const created = res.data.data || res.data;
            setCoupled((prev) => [...prev, created]);
            await getCoupled();
            await getInactiveCoupled();

            showSuccessToast('¡Acoplado creado correctamente!');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const msg = getErrorMsg(error, 'No se pudo crear el acoplado');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    const updateCoupled = async (id, coupledData) => {
        try {
            const res = await client.put(`/coupled/update/${id}`, coupledData);
            const updated = res.data.data || res.data;
            setCoupled((prev) =>
                prev.map((coupled) => {
                    if (coupled.id === id)
                        return {...coupled, ...updated, id: id };
                    return coupled;
                })
            );
            await getCoupled();
            await getInactiveCoupled();
            showSuccessToast('Acoplado actualizado correctamente.');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const msg = getErrorMsg(error, 'No se pudo actualizar el acoplado');
            showErrorAlert('Error', msg);
            return false;
        }
    }

    const deleteCoupled = async (id) => {
        const confirmed = await showConfirmAlert(
            '¿Archivar este Acoplado?',
            'El acoplado no aparecerá para nuevos viajes, pero se conservará para el historial.',
            { confirmButtonText: 'Sí, archivar' }
        );
        if (!confirmed) return false;
        try {
            await client.delete(`/coupled/delete/${id}`);
            setCoupled((prev) => prev.filter((coupled) => coupled.id !== id));
            
            // Refrescar la lista de inactivos
            await getInactiveCoupled();
            
            showSuccessToast('Acoplado archivado correctamente.');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const msg = getErrorMsg(error, 'No se pudo archivar el acoplado');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    const getInactiveCoupled = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            const res = await client.get('/coupled/inactive');
            const inactiveList = res.data.data || res.data;
            setInactiveCoupled(Array.isArray(inactiveList) ? inactiveList : []);
        } catch (error) {
            if (error?.isOffline) return;
            const msg = getErrorMsg(error, 'No se pudo cargar los acoplados inactivos');
            showErrorAlert('Error', msg);
        }
    }, [isAuthenticated]);

    const reactivateCoupled = async (id) => {
        const confirmed = await showConfirmAlert(
            '¿Reactivar Acoplado?',
            'El acoplado volverá a estar disponible para usar en viajes.',
            { icon: 'info', confirmButtonText: 'Sí, reactivar' }
        );
        if (!confirmed) return false;
        try {
            await client.put(`/coupled/reactivate/${id}`);

            setInactiveCoupled((prev) => prev.filter((coupled) => coupled.id !== id));
            await getCoupled(); // Refrescar lista activa

            showSuccessToast('Acoplado reactivado correctamente.');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const msg = getErrorMsg(error, 'No se pudo reactivar el acoplado');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            getCoupled();
            getInactiveCoupled();
        }
    }, [getCoupled, getInactiveCoupled, isAuthenticated]);



  return (
    <CoupledContext.Provider value={{
        coupled,
        inactiveCoupled,
        loading,
        getCoupled,
        getInactiveCoupled,
        getCoupledById,
        createCoupled,
        updateCoupled,
        deleteCoupled,
        reactivateCoupled
    }}>
      {children}
    </CoupledContext.Provider>
  )
}

export default CoupledProvider;
