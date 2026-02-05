import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import client from '../../api/axios';
import { useAuth } from '../../context/login/LoginContext'; // Ajusta la ruta si cambiaste de lugar el AuthContext
import Swal from 'sweetalert2';

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
            console.error(error);
            Swal.fire('Error', 'No se pudo cargar la lista de acoplados', 'error');
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
            console.error("Error obteniendo acoplado:", error);
            Swal.fire('Error', 'No se pudo obtener la información del acoplado', 'error');
            return null;
        }
    }, []);

    const buildErrorMessage = (error, fallback) => {
        const apiMsg = error?.response?.data?.message;
        const apiErrors = error?.response?.data?.errors;
        if (Array.isArray(apiErrors) && apiErrors.length > 0) {
            return apiErrors.join('\n');
        }
        if (apiMsg) return apiMsg;
        return fallback;
    };

    const createCoupled = async (coupledData) => {
        try {
            // Nota: coupledData debe ser un objeto FormData si lleva archivos
            const res = await client.post('/coupled/create', coupledData);
            
            // Obtenemos el objeto creado
            const created = res.data.data || res.data;
            setCoupled((prev) => [...prev, created]);

            Swal.fire('Éxito', 'Acoplado creado correctamente', 'success');
            return true;
        } catch (error) {
            console.error("Error creando acoplado:", error);
            const msg = buildErrorMessage(error, 'No se pudo crear el acoplado');
            Swal.fire('Error', msg, 'error');
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
            Swal.fire('Éxito', 'Acoplado actualizado correctamente', 'success');
            return true;
        } catch (error) {
            const msg = buildErrorMessage(error, 'No se pudo actualizar el acoplado');
            Swal.fire('Error', msg, 'error');
            return false;
        }
    }

    const deleteCoupled = async (id) => {
        const confirmed = await Swal.fire({
            title: '¿Dar de baja este Acoplado?',
            text: 'Se marcará como inactivo y no aparecerá en viajes.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmed.isConfirmed) return false;
        try {
            await client.delete(`/coupled/delete/${id}`);
            setCoupled((prev) => prev.filter((coupled) => coupled.id !== id));
            
            // Refrescar la lista de inactivos
            await getInactiveCoupled();
            
            Swal.fire('Éxito', 'Acoplado dado de baja correctamente', 'success');
            return true;
        } catch (error) {
            const msg = error.response?.data?.message || 'No se pudo dar de baja el acoplado';
            Swal.fire('Error', msg, 'error');
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
            console.error(error);
            Swal.fire('Error', 'No se pudo cargar los acoplados inactivos', 'error');
        }
    }, [isAuthenticated]);

    const reactivateCoupled = async (id) => {
        const confirmed = await Swal.fire({
            title: '¿Reactivar Acoplado?',
            text: 'El acoplado volverá a estar disponible para usar en viajes.',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmed.isConfirmed) return false;
        try {
            await client.put(`/coupled/reactivate/${id}`);

            setInactiveCoupled((prev) => prev.filter((coupled) => coupled.id !== id));
            await getCoupled(); // Refrescar lista activa

            Swal.fire('Éxito', 'Acoplado reactivado correctamente', 'success');
            return true;
        } catch (error) {
            const msg = error.response?.data?.message || 'No se pudo reactivar el acoplado';
            Swal.fire('Error', msg, 'error');
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