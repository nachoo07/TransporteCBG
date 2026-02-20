import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import client from '../../api/axios';
import { useAuth } from '../../context/login/LoginContext';
import { showSuccessToast, showErrorAlert, showConfirmAlert } from '../../utils/alerts/Alerts';
import { getErrorMsg } from '../../utils/helperError/ErrorMsg';

export const TravelContext = createContext();

export const useTravel = () => {
    const context = useContext(TravelContext);
    if (!context) throw new Error('useTravel debe usarse dentro de un TravelProvider');
    return context;
};

export const TravelProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [travels, setTravels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [includeAnnulled, setIncludeAnnulled] = useState(false);

    // --- 1. OBTENER VIAJES ---
    const getTravels = useCallback(async (opts = {}) => {
        if (!isAuthenticated) return;

        const include = typeof opts.includeAnnulled === 'boolean' ? opts.includeAnnulled : includeAnnulled;
        setLoading(true);
        try {
            const res = await client.get('/travels/', { params: { includeAnnulled: include ? 'true' : 'false' } }); 
            const travelsList = res.data.data || res.data;
            setTravels(Array.isArray(travelsList) ? travelsList : []);
        } catch (error) {
            if (error?.isOffline) return;
            const msg = getErrorMsg(error, 'No se pudo cargar la lista de viajes');
            showErrorAlert('Error', msg);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, includeAnnulled]);

    const getTravelById = useCallback(async (id) => {
        try {
            const res = await client.get(`/travels/${id}`);
            return res.data.data || res.data;
        } catch (error) {
            if (error?.isOffline) return null;
            const msg = getErrorMsg(error, 'No se pudo obtener el viaje');
            showErrorAlert('Error', msg);
            return null;
        }
    }, []);

    const createTravel = async (travelData) => {
        try {
            await client.post('/travels/create', travelData);
            await getTravels(); // Recarga con joins y datos consistentes
            showSuccessToast('Viaje creado exitosamente');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const msg = getErrorMsg(error, 'No se pudo crear el viaje');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    const updateTravel = async (id, travelData) => {
        try {
            await client.put(`/travels/update/${id}`, travelData);
            await getTravels(); // Recarga para reflejar cambios y joins
            showSuccessToast('Viaje actualizado exitosamente');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const msg = getErrorMsg(error, 'No se pudo actualizar el viaje');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    const bulkUpdateTravelDocs = async (bulkData) => {
        try {
            await client.put('/travels/bulk-docs', bulkData);
            await getTravels();
            showSuccessToast('Actualización masiva aplicada');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const msg = getErrorMsg(error, 'No se pudo aplicar la actualización masiva');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    const cancelTravel = async (id, motivo) => {
        try {
            await client.put(`/travels/cancel/${id}`, { motivo });
            await getTravels();
            showSuccessToast('Viaje anulado');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const msg = getErrorMsg(error, 'No se pudo anular el viaje');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    const restoreTravel = async (id) => {
        try {
            await client.put(`/travels/restore/${id}`);
            await getTravels();
            showSuccessToast('Viaje restaurado');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const msg = getErrorMsg(error, 'No se pudo restaurar el viaje');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    const deleteTravel = async (id) => {
        const confirmed = await showConfirmAlert(
            'Eliminar viaje (permanente)',
            'Se eliminará el viaje de forma permanente. Si el viaje ya tiene facturación/pago asociado, deberías usar "Anular".'
        );
        if (!confirmed) return false;
        
        try {
            await client.delete(`/travels/delete/${id}`);
            setTravels(prev => Array.isArray(prev) ? prev.filter(travel => travel.id !== id) : []);
            showSuccessToast('Viaje eliminado exitosamente');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const msg = getErrorMsg(error, 'No se pudo eliminar el viaje');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            getTravels();
        }
    }, [isAuthenticated, getTravels]);

    return (
        <TravelContext.Provider value={{
            travels,
            loading,
            getTravels,
            includeAnnulled,
            setIncludeAnnulled,
            getTravelById,
            createTravel,
            updateTravel,
            bulkUpdateTravelDocs,
            cancelTravel,
            restoreTravel,
            deleteTravel
        }}>
            {children}
        </TravelContext.Provider>
    );
};
