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
            console.error(error);
            const msg = getErrorMsg(error, 'No se pudo cargar la lista de empresas');
            showErrorAlert('Error', msg);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    const getCompanyById = async (id) => {
        try {
            const res = await client.get(`/company/${id}`);
            return res.data.data || res.data;
        } catch (error) {
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
        } catch (error) {
            const msg = getErrorMsg(error, 'No se pudo crear la empresa');
            showErrorAlert('Error', msg);
        }
    };

    const updateCompany = async (id, companyData) => {  
        try {
            const res = await client.put(`/company/update/${id}`, companyData);
            const updatedFromServer = res.data.data || res.data;
            setCompanies(prev => Array.isArray(prev) ? prev.map(company => company.id === id ? updatedFromServer : company) : []);
            showSuccessToast('Empresa actualizada exitosamente');
        } catch (error) {
            const msg = getErrorMsg(error, 'No se pudo actualizar la empresa');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    const deleteCompany = async (id) => {
        const confirmed = await showConfirmAlert('Confirmar eliminación', '¿Estás seguro de que deseas eliminar esta empresa? Esta acción no se puede deshacer.');
        if (!confirmed) return false;

        try {
            await client.delete(`/company/${id}`);
            setCompanies(prev => prev.filter(company => company.id !== id));
            showSuccessToast('Empresa eliminada exitosamente');
            return true;
        } catch (error) {
            const msg = getErrorMsg(error, 'No se pudo eliminar la empresa');
            showErrorAlert('Error', msg);
            return false;
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            getCompanies();
        }
    }, [getCompanies, isAuthenticated]);
    
    return (
        <CompanyContext.Provider value={{
            companies,
            loading,
            getCompanies,
            getCompanyById,
            createCompany,
            updateCompany,
            deleteCompany
        }}>
            {children}
        </CompanyContext.Provider>
    );
};
        

