import { createContext, useState, useContext, useEffect } from 'react';
import client from '../../api/axios';
import { useAuth } from '../../context/login/LoginContext'; // Ajusta la ruta si cambiaste de lugar el AuthContext
import Swal from 'sweetalert2';

export const AssignmentsContext = createContext();

export const useAssignments = () => {
    const context = useContext(AssignmentsContext);
    if (!context) throw new Error('useAssignments debe usarse dentro de un AssignmentsProvider');
    return context;
};

export const AssignmentsProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(false);

    // Función para cargar la lista
    const getAssignments = async () => {
        if (!isAuthenticated) return;
        setLoading(true);
        try {
            const res = await client.get('/assignments/');
            setAssignments(res.data.data || []);
        } catch (error) {
            console.error('Error al obtener asignaciones:', error);
            console.error('Detalles:', error.response?.data);
        } finally {
            setLoading(false);
        }
    };

    // Crear
    const buildErrorMessage = (error, fallback) => {
        const apiMsg = error?.response?.data?.message;
        const apiErrors = error?.response?.data?.errors;
        if (Array.isArray(apiErrors) && apiErrors.length > 0) return apiErrors.join('\n');
        if (apiMsg) return apiMsg;
        return fallback;
    };

    const createAssignment = async (data) => {
        try {
            await client.post('/assignments/create', data);
            Swal.fire('Éxito', 'Equipo asignado correctamente', 'success');
            getAssignments(); // Recargar lista
            return true;
        } catch (error) {
            const msg = buildErrorMessage(error, 'Error al asignar');
            Swal.fire('Error', msg, 'error');
            return false;
        }
    };

    // Finalizar (Liberar recursos)
    const finishAssignment = async (id) => {
        const result = await Swal.fire({
            title: '¿Finalizar viaje?',
            text: "El chofer y los vehículos quedarán libres para nuevas asignaciones.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, finalizar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await client.put(`/assignments/finish/${id}`);
                setAssignments(prev => prev.filter(a => a.id !== id));
                Swal.fire('Listo', 'Asignación finalizada', 'success');
            } catch (error) {
                const msg = buildErrorMessage(error, 'No se pudo finalizar');
                Swal.fire('Error', msg, 'error');
            }
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            getAssignments();
        }
    }, [isAuthenticated]);

    return (
        <AssignmentsContext.Provider value={{ assignments, loading, createAssignment, finishAssignment, getAssignments }}>
            {children}
        </AssignmentsContext.Provider>
    );
};

export default AssignmentsProvider;