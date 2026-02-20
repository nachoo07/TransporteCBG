import React, { useCallback, useMemo, useState } from 'react';
import Navbar from '../navbar/Navbar';
import UserFormModal from '../userFormModal/UserFormModal'; // IMPORTAMOS EL COMPONENTE
import { useUsers } from '../../context/users/UserContext';
import './panelUser.css';
import '../driver/driver.css';

const PanelUsers = () => {
  const { usuarios, loading, deleteUsuario, createUsuario, updateUsuario } = useUsers();
  
  // CONTROL DEL MODAL
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = creando, objeto = editando
  const [activeTab, setActiveTab] = useState('activos');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Abrir para CREAR
  const handleOpenCreate = () => {
    setEditingUser(null); // Limpiamos para indicar que es nuevo
    setIsModalOpen(true);
  };

  // Abrir para EDITAR
  const handleOpenEdit = (user) => {
    setEditingUser(user); // Guardamos a quién vamos a editar
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  // ESTA FUNCIÓN RECIBE LOS DATOS DEL FORMULARIO Y DECIDE SI CREA O EDITA
  const handleSave = async (formData) => {
    let success = false;

    if (editingUser) {
        // --- MODO EDICIÓN ---
        success = await updateUsuario(editingUser.id, formData);
    } else {
        // --- MODO CREACIÓN ---
        success = await createUsuario(formData);
    }

    if (success) {
        handleCloseModal();
    }
  };

  const filterUsers = useCallback((arr) => {
    const q = search.trim().toLowerCase();
    if (!q) return arr;
    return arr.filter((u) => {
      const fullName = `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      return fullName.includes(q) || email.includes(q);
    });
  }, [search]);

  const paginated = (arr) => {
    const start = (currentPage - 1) * itemsPerPage;
    return arr.slice(start, start + itemsPerPage);
  };

  const activeUsers = useMemo(
    () => filterUsers((usuarios || []).filter((u) => !!u.activo)),
    [usuarios, filterUsers]
  );
  const inactiveUsers = useMemo(
    () => filterUsers((usuarios || []).filter((u) => !u.activo)),
    [usuarios, filterUsers]
  );

  const baseList = activeTab === 'activos' ? activeUsers : inactiveUsers;
  const totalPages = Math.ceil(baseList.length / itemsPerPage);

  React.useEffect(() => { setCurrentPage(1); }, [activeTab, search]);

  return (
    <div className="driver-layout">
      <Navbar />

      <div className="driver-container">
        
        {/* CABECERA */}
        <div className="driver-header">
          <div className="driver-title">
            <h1>🔐 Usuarios</h1>
          </div>
        </div>

        {/* LOADING */}
        {loading && <div className="loading-state">Cargando usuarios...</div>}

        {/* TABLA */}
        {!loading && (
          <>
          <div className="driver-tabs">
            <div>
              <button
                className={`tab-btn ${activeTab === 'activos' ? 'active' : ''}`}
                onClick={() => setActiveTab('activos')}
              >
                👤 Activos ({activeUsers.length})
              </button>
              <button
                className={`tab-btn ${activeTab === 'inactivos' ? 'active' : ''}`}
                onClick={() => setActiveTab('inactivos')}
              >
                📦 Inactivos ({inactiveUsers.length})
              </button>
            </div>

            <div>
              <input
                type="text"
                className="driver-search-input"
                placeholder="Buscar por nombre o usuario..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="driver-header-actions">
              <button onClick={handleOpenCreate} className="btn-add-driver subtle">
                ➕ Nuevo Usuario
              </button>
            </div>
          </div>

          <div className="driver-table-wrapper">
            <table className="driver-table">
              <thead>
                <tr>
                  <th>Nombre Completo</th>
                  <th>Usuario</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {baseList.length > 0 ? (
                  paginated(baseList).map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <div className="avatar-circle">
                            {user.nombre?.charAt(0).toUpperCase() || 'A'}{user.apellido?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <span className="user-name-text" style={{ textTransform: 'capitalize' }}>{user.nombre} {user.apellido}</span>
                        </div>
                      </td>
                      <td><span className="email-text">
                        {user.email?.charAt(0).toUpperCase() + user.email?.slice(1)}
                      </span></td>
                      <td>
                        {user.activo ? (
                          <span className="status-badge status-active">Activo</span>
                        ) : (
                          <span className="status-badge status-inactive">Inactivo</span>
                        )}
                      </td>
                      <td>
                        <div className="actions-cell">
                          {/* Botón EDITAR ahora funciona */}
                          <button onClick={() => handleOpenEdit(user)} className="btn-action edit" title="Editar">
                            <svg xmlns="http://www.w3.org/2000/svg" className="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          
                          <button onClick={() => deleteUsuario(user.id)} className="btn-action delete" title="Eliminar">
                            <svg xmlns="http://www.w3.org/2000/svg" className="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="empty-state">
                      No hay usuarios registrados aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="driver-pagination">
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
          </>
        )}
      </div>

      {/* --- INVOCAMOS EL COMPONENTE REUTILIZABLE --- */}
      <UserFormModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onSubmit={handleSave} 
        userToEdit={editingUser} // Le pasamos el usuario (o null si es nuevo)
      />

    </div>
  );
};

export default PanelUsers;
