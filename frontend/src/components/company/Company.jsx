import React, { useState, useEffect } from 'react';
import Navbar from '../../components/navbar/Navbar';
import CompanyFormModal from '../../components/company/CompanyFormModal';
import { useCompany } from '../../context/company/CompanyContext';
import './company.css';

const Company = () => {
  const {
    companies,
    inactiveCompanies,
    loading,
    getCompanies,
    getInactiveCompanies,
    createCompany,
    updateCompany,
    archiveCompany,
    reactivateCompany,
    getCompanyById
  } = useCompany();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [activeTab, setActiveTab] = useState('activas');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    getCompanies();
    getInactiveCompanies();
  }, []);

  const handleOpenCreate = () => {
    setSelectedCompany(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = async (partialCompany) => {
    if (activeTab !== 'activas') return;
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

  const filterCompanies = (arr) => {
    const q = search.trim().toLowerCase();
    if (!q) return arr;
    return arr.filter((c) => {
      const name = (c.nombre || '').toLowerCase();
      const tariff = (c.tipo_cobro || '').toLowerCase();
      return name.includes(q) || tariff.includes(q);
    });
  };

  const paginated = (arr) => {
    const start = (currentPage - 1) * itemsPerPage;
    return arr.slice(start, start + itemsPerPage);
  };

  const baseList = activeTab === 'activas' ? companies : inactiveCompanies;
  const filteredList = filterCompanies(baseList);
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);

  React.useEffect(() => { setCurrentPage(1); }, [activeTab, search]);

  return (
    <div className="company-layout">
      <Navbar />
      <div className="company-container">
        <div className="company-control-panel">
          <div className="company-control-header">
            <span className="company-control-title">Gestión de empresas</span>
          </div>

          <div className="company-toolbar-row">
            <div className="company-tabs-group company-tabs-segmented">
              <button
                className={`tab-btn company-tab-button ${activeTab === 'activas' ? 'active' : ''}`}
                onClick={() => setActiveTab('activas')}
              >
                Activas ({companies.length})
              </button>
              <button
                className={`tab-btn company-tab-button ${activeTab === 'archivadas' ? 'active' : ''}`}
                onClick={() => setActiveTab('archivadas')}
              >
                Archivadas ({inactiveCompanies.length})
              </button>
            </div>

            <div className="company-search-wrap company-search-wrap-wide">
              <input
                type="text"
                className="driver-search-input company-search-input"
                placeholder="Buscar por nombre o tipo de cobro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="company-header-actions">
              {activeTab === 'activas' && (
                <button onClick={handleOpenCreate} className="btn-add-company">
                  + Nueva Empresa
                </button>
              )}
            </div>
          </div>
        </div>

        {!loading ? (
          <div className="company-table-shell">
            <div className="company-table-wrapper">
              <table className="company-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo de Cobro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.length > 0 ? (
                    paginated(filteredList).map((company) => {
                      const tariffConfig = getTariffConfig(company.tipo_cobro);
                      return (
                        <tr key={company.id}>
                          <td>
                            <div className="company-name-cell">{company.nombre}</div>
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
                            <div className="action-buttons">
                              {activeTab === 'activas' && (
                                <button
                                  onClick={() => handleOpenEdit(company)}
                                  className="btn-action-chassis"
                                  title="Editar"
                                  disabled={isLoadingCompany}
                                  style={{ opacity: isLoadingCompany ? 0.5 : 1 }}
                                >
                                  {isLoadingCompany ? '⏳' : '✏️'}
                                </button>
                              )}
                              {activeTab === 'activas' ? (
                                <button
                                  onClick={() => archiveCompany(company.id)}
                                  className="btn-action-chassis"
                                  title="Archivar"
                                >
                                  🗂️
                                </button>
                              ) : (
                                <button
                                  onClick={() => reactivateCompany(company.id)}
                                  className="btn-action-chassis"
                                  title="Reactivar"
                                >
                                  ♻️
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="3" className="company-empty-state">
                        {activeTab === 'activas' ? 'No hay empresas activas.' : 'No hay empresas archivadas.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="company-table-footer">
              {totalPages > 1 && (
                <div className="company-pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    &lt;
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i + 1}
                      className={`pagination-btn${currentPage === i + 1 ? ' active' : ''}`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    &gt;
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="company-loading-state">
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
