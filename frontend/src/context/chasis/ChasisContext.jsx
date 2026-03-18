import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import client from '../../api/axios';
import { useAuth } from '../../context/login/LoginContext'; // Ajusta la ruta si cambiaste de lugar el AuthContext
import { showSuccessToast, showErrorAlert, showConfirmAlert } from '../../utils/alerts/Alerts';
import { getErrorMsg } from '../../utils/helperError/ErrorMsg';

export const ChasisContext = createContext();

export const useChasis = () => {
    const context = useContext(ChasisContext);
    if (!context) throw new Error('useChasis debe usarse dentro de un ChasisProvider');
    return context;
};

const ChasisProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [chasis, setChasis] = useState([]);
    const [inactiveChasis, setInactiveChasis] = useState([]);
    const [loading, setLoading] = useState(false);


    const getChasis = useCallback(async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        try {
            const res = await client.get('/chassis/');
            const chasisList = res.data.data || res.data;

            // El backend ya calcula info_completa, confiamos en su respuesta
            const chasisWithInfo = Array.isArray(chasisList) ? chasisList : [];

            setChasis(chasisWithInfo);
        } catch (error) {
            if (error?.isOffline) return;
            const msg = getErrorMsg(error, 'No se pudo cargar la lista de chasis');
            showErrorAlert('Error', msg);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);


    const getChasisById = useCallback(async (id) => {
        try {
            const res = await client.get(`/chassis/${id}`);
            return res.data.data || res.data;
        } catch (error) {
            if (error?.isOffline) return null;
            const msg = getErrorMsg(error, 'No se pudo obtener el chasis');
            showErrorAlert('Error', msg);
            return null;
        }
    }, []);

    const createChasis = async (chasisData) => {
        try {
            const res = await client.post('/chassis/create', chasisData);

            const created = res.data.data || res.data;
            setChasis((prev) => [...prev, created]);
            await getChasis();
            await getInactiveChasis();

            // ✅ ÉXITO: Usamos el Toast (Sonner)
            showSuccessToast('¡Chasis creado correctamente!');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            // ❌ ERROR: Usamos el Alert (Swal) para que lea el error
            const serverMsg = getErrorMsg(error, 'No se pudo crear el chasis');
            showErrorAlert('Error', serverMsg);
            return false;
        }
    };

    const updateChasis = async (id, chasisData) => {
        try {
            const res = await client.put(`/chassis/update/${id}`, chasisData);
            const updatedFromServer = res.data.data || res.data;

            setChasis((prev) =>
                prev.map((oldChasis) => {
                    if (oldChasis.id === id) {
                        return { ...oldChasis, ...updatedFromServer, id };
                    }
                    return oldChasis;
                })
            );

            await getChasis();
            await getInactiveChasis();

            showSuccessToast('Chasis actualizado correctamente.');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const msg = getErrorMsg(error, 'No se pudo actualizar el chasis');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    const deleteChasis = async (id) => {
        const confirmed = await showConfirmAlert(
            '¿Archivar este Chasis?',
            'El chasis no aparecerá para nuevos viajes, pero se conservará para el historial.',
            { confirmButtonText: 'Sí, archivar' }
        );

        if (!confirmed) return false;
        try {
            await client.delete(`/chassis/delete/${id}`);

            setChasis((prev) => Array.isArray(prev) ? prev.filter((chasis) => chasis.id !== id) : []);

            // Refrescar la lista de inactivos
            await getInactiveChasis();

            // ✅ ÉXITO AL DAR DE BAJA: Toast rápido
            showSuccessToast('Chasis archivado exitosamente.')
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const serverMsg = getErrorMsg(error, 'No se pudo archivar el chasis');
            showErrorAlert('Error', serverMsg);
            return false;
        }
    };

    const getInactiveChasis = useCallback(async () => {
        if (!isAuthenticated) return;

        try {
            const res = await client.get('/chassis/inactive');
            const inactiveList = res.data.data || res.data;
            const chasisWithInfo = Array.isArray(inactiveList) ? inactiveList : [];
            setInactiveChasis(chasisWithInfo);
        } catch (error) {
            if (error?.isOffline) return;
            const msg = getErrorMsg(error, 'No se pudo cargar los chasis inactivos');
            showErrorAlert('Error', msg);
        }
    }, [isAuthenticated]);

const reactivateChasis = async (id) => {

    try {
        await client.put(`/chassis/reactivate/${id}`);

        setInactiveChasis((prev) =>
            Array.isArray(prev) ? prev.filter((chasis) => chasis.id !== id) : []
        );

        await getChasis(); // refrescar activos

        showSuccessToast('Chasis reactivado exitosamente.');
        return true;
    } catch (error) {
        if (error?.isOffline) return false;
        const serverMsg = getErrorMsg(error, 'No se pudo reactivar el chasis');
        showErrorAlert('Error', serverMsg);
        return false;
    }
};

useEffect(() => {
    if (isAuthenticated) {
        getChasis();
        getInactiveChasis();
    }
}, [getChasis, getInactiveChasis, isAuthenticated]);



return (
    <ChasisContext.Provider value={{
        chasis,
        inactiveChasis,
        loading,
        getChasis,
        getInactiveChasis,
        getChasisById,
        createChasis,
        updateChasis,
        deleteChasis,
        reactivateChasis
    }}>
        {children}
    </ChasisContext.Provider>
)
}

export default ChasisProvider
