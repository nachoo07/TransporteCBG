import React, { useState } from 'react';
import Navbar from '../navbar/Navbar';
import UserFormModal from '../userFormModal/UserFormModal'; // IMPORTAMOS EL COMPONENTE
import { useUsers } from '../../context/users/UserContext';
import './panelUser.css';

const PanelUsers = () => {
  const { usuarios, loading, deleteUsuario, createUsuario, updateUsuario } = useUsers();
  
  // CONTROL DEL MODAL
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = creando, objeto = editando

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

  return (
    <div className="layout-wrapper">
      <Navbar />

      <div className="panel-container">
        
        {/* CABECERA */}
        <div className="panel-header">
          <div className="panel-title">
            <h1>Usuarios</h1>
            <p>Gestión de acceso al sistema</p>
          </div>
          <button onClick={handleOpenCreate} className="btn-create">
            <span className="plus-sign">+</span> Nuevo Usuario
          </button>
        </div>

        {/* LOADING */}
        {loading && <div className="loading-state">Cargando administradores...</div>}

        {/* TABLA */}
        {!loading && (
          <div className="table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nombre Completo</th>
                  <th>Usuario</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length > 0 ? (
                  usuarios.map((user) => (
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
                          <span className="status-badge active">Activo</span>
                        ) : (
                          <span className="status-badge inactive">Inactivo</span>
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
                    <td colSpan="3" className="empty-state">
                      No hay usuarios registrados aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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