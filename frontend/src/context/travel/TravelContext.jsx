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

    // --- 1. OBTENER VIAJES ---
    const getTravels = useCallback(async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        try {
            const res = await client.get('/travels/'); 
            const travelsList = res.data.data || res.data;
            setTravels(Array.isArray(travelsList) ? travelsList : []);
        } catch (error) {
            console.error(error);
            const msg = getErrorMsg(error, 'No se pudo cargar la lista de viajes');
            showErrorAlert('Error', msg);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const getTravelById = useCallback(async (id) => {
        try {
            const res = await client.get(`/travels/${id}`);
            return res.data.data || res.data;
        } catch (error) {
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
            const msg = getErrorMsg(error, 'No se pudo actualizar el viaje');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    const deleteTravel = async (id) => {
        const confirmed = await showConfirmAlert('Confirmar eliminación', '¿Estás seguro de que deseas eliminar este viaje?');
        if (!confirmed) return false;
        
        try {
            await client.delete(`/travels/delete/${id}`);
            setTravels(prev => Array.isArray(prev) ? prev.filter(travel => travel.id !== id) : []);
            showSuccessToast('Viaje eliminado exitosamente');
            return true;
        } catch (error) {
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
            getTravelById,
            createTravel,
            updateTravel,
            deleteTravel
        }}>
            {children}
        </TravelContext.Provider>
    );
};