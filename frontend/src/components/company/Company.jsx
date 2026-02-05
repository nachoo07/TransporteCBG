import React, { useState, useEffect } from 'react';
import Navbar from '../../components/navbar/Navbar';
import CompanyFormModal from '../../components/company/CompanyFormModal';
import { useCompany } from '../../context/company/CompanyContext';
import './company.css';

const Company = () => {
  const { companies, loading, getCompanies, createCompany, updateCompany, deleteCompany, getCompanyById } = useCompany();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);

  useEffect(() => {
    getCompanies();
  }, []);

  const handleOpenCreate = () => {
    setSelectedCompany(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = async (partialCompany) => {
    setIsLoadingCompany(true);
    const fullCompany = await getCompanyById(partialCompany.id);
    setIsLoadingCompany(false);

    if (fullCompany) {
      setSelectedCompany(fullCompany);
      setIsFormOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsFormOpen(false);
    setSelectedCompany(null);
  };

  const handleSave = async (formData) => {
    let success = false;
    if (selectedCompany) {
      success = await updateCompany(selectedCompany.id, formData);
    } else {
      success = await createCompany(formData);
    }
    if (success) handleCloseModal();
  };

  const getTariffConfig = (tariffType) => {
    switch (tariffType) {
      case 'TARIFA':
        return { label: 'Tarifa por TN', color: '#3498db' };
      case 'FIJO':
        return { label: 'Precio Fijo', color: '#e74c3c' };
      default:
        return { label: 'Desconocido', color: '#95a5a6' };
    }
  };

  return (
    <div className="company-layout">
      <Navbar />
      <div className="company-container">
        <div className="company-header">
          <div className="company-title">
            <h1>Empresas</h1>
            <p>Gestión de empresas y configuración de tarifas</p>
          </div>
          <button onClick={handleOpenCreate} className="btn-add-company">
            <span>+</span> Nueva Empresa
          </button>
        </div>

        {!loading ? (
          <div className="company-table-wrapper">
            <table className="company-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo de Cobro</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {companies.length > 0 ? (
                  companies.map((company) => {
                    const tariffConfig = getTariffConfig(company.tipo_cobro);
                    return (
                      <tr key={company.id}>
                        <td>
                          <div style={{ fontWeight: '600' }}>{company.nombre}</div>
                        </td>
                        <td>
                          <span
                            className="tariff-badge"
                            style={{ backgroundColor: tariffConfig.color }}
                          >
                            {tariffConfig.label}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${company.activo ? 'status-active' : 'status-inactive'}`}>
                            {company.activo ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons" style={{ justifyContent: 'center' }}>
                            <button
                              onClick={() => handleOpenEdit(company)}
                              className="btn-icon edit-icon"
                              title="Editar"
                              disabled={isLoadingCompany}
                              style={{ opacity: isLoadingCompany ? 0.5 : 1 }}
                            >
                              {isLoadingCompany ? '⏳' : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => deleteCompany(company.id)}
                              className="btn-icon delete-icon"
                              title="Eliminar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                      No hay empresas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p>Cargando empresas...</p>
          </div>
        )}
      </div>

      <CompanyFormModal
        isOpen={isFormOpen}
        onClose={handleCloseModal}
        onSubmit={handleSave}
        companyToEdit={selectedCompany}
      />
    </div>
  );
};

export default Company;