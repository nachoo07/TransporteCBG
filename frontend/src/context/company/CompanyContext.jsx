import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import client from '../../api/axios';
import { useAuth } from '../../context/login/LoginContext';
import { showSuccessToast, showErrorAlert, showConfirmAlert } from '../../utils/alerts/Alerts';
import { getErrorMsg } from '../../utils/helperError/ErrorMsg';

export const CompanyContext = createContext();

export const useCompany = () => {
    const context = useContext(CompanyContext);
    if (!context) throw new Error('useCompany debe usarse dentro de un CompanyProvider');
    return context;
};

export const CompanyProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [inactiveCompanies, setInactiveCompanies] = useState([]);
    const [loading, setLoading] = useState(false);

    // --- 1. OBTENER EMPRESAS ---
    const getCompanies = useCallback(async () => {
        if (!isAuthenticated) return;

        setLoading(true);
        try {
            const res = await client.get('/company/'); 
            const companiesList = res.data.data || res.data;
            setCompanies(Array.isArray(companiesList) ? companiesList : []);
        } catch (error) {
            if (error?.isOffline) return;
            const msg = getErrorMsg(error, 'No se pudo cargar la lista de empresas');
            showErrorAlert('Error', msg);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const getInactiveCompanies = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const res = await client.get('/company/inactive');
            const list = res.data.data || res.data;
            setInactiveCompanies(Array.isArray(list) ? list : []);
        } catch (error) {
            if (error?.isOffline) return;
            const msg = getErrorMsg(error, 'No se pudo cargar la lista de empresas archivadas');
            showErrorAlert('Error', msg);
        }
    }, [isAuthenticated]);

    const getCompanyById = async (id) => {
        try {
            const res = await client.get(`/company/${id}`);
            return res.data.data || res.data;
        } catch (error) {
            if (error?.isOffline) return null;
            const msg = getErrorMsg(error, 'No se pudo obtener la empresa');
            showErrorAlert('Error', msg);
            return null;
        }
    };

    const createCompany = async (companyData) => {
        try {
            const res = await client.post('/company/create', companyData);
            const createdFromServer = res.data.data || res.data;
            setCompanies(prev => [...prev, createdFromServer]);
            showSuccessToast('Empresa creada exitosamente');
            return true;
        } catch (error) {
            if (error?.isOffline) return;
            const msg = getErrorMsg(error, 'No se pudo crear la empresa');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    const updateCompany = async (id, companyData) => {  
        try {
            const res = await client.put(`/company/update/${id}`, companyData);
            const updatedFromServer = res.data.data || res.data;
            setCompanies(prev => Array.isArray(prev) ? prev.map(company => company.id === id ? updatedFromServer : company) : []);
            showSuccessToast('Empresa actualizada exitosamente');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const msg = getErrorMsg(error, 'No se pudo actualizar la empresa');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    const archiveCompany = async (id) => {
        const confirmed = await showConfirmAlert(
            'Archivar empresa',
            'La empresa no se podrá seleccionar para nuevos viajes, pero se conservará para el historial.',
            { confirmButtonText: 'Sí, archivar' }
        );
        if (!confirmed) return false;

        try {
            await client.delete(`/company/${id}`);
            const archived = companies.find(c => c.id === id);
            setCompanies(prev => prev.filter(company => company.id !== id));
            if (archived) setInactiveCompanies(prev => [...prev, { ...archived, activo: false }]);
            showSuccessToast('Empresa archivada exitosamente');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const msg = getErrorMsg(error, 'No se pudo archivar la empresa');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    const reactivateCompany = async (id) => {
        const confirmed = await showConfirmAlert(
            'Reactivar empresa',
            'La empresa volverá a estar disponible para nuevos viajes.',
            { confirmButtonText: 'Sí, reactivar', icon: 'info' }
        );
        if (!confirmed) return false;
        try {
            const res = await client.put(`/company/reactivate/${id}`);
            const updated = res.data?.data ?? res.data;
            setInactiveCompanies(prev => prev.filter(c => c.id !== id));
            if (updated) setCompanies(prev => [...prev, updated]);
            showSuccessToast('Empresa reactivada exitosamente');
            return true;
        } catch (error) {
            if (error?.isOffline) return false;
            const msg = getErrorMsg(error, 'No se pudo reactivar la empresa');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            getCompanies();
            getInactiveCompanies();
        }
    }, [getCompanies, getInactiveCompanies, isAuthenticated]);
    
    return (
        <CompanyContext.Provider value={{
            companies,
            inactiveCompanies,
            loading,
            getCompanies,
            getInactiveCompanies,
            getCompanyById,
            createCompany,
            updateCompany,
            archiveCompany,
            reactivateCompany
        }}>
            {children}
        </CompanyContext.Provider>
    );
};
        
