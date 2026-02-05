import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/login/LoginContext'; // Ajusta la ruta si es necesario
import Swal from 'sweetalert2';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import 'bootstrap/dist/css/bootstrap.min.css';
import './navbar.css';

const NavigationBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: '¿Cerrar sesión?',
      text: "Tendrás que ingresar tus datos nuevamente.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#FF9020',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, salir',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      await logout();
      navigate('/login');
    }
  };

  return (
    // Agregamos 'navbar-custom' para aplicar tus estilos naranjas
    <Navbar expand="lg" className="navbar-custom" variant="dark">
      <Container fluid>
        {/* LOGO */}
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2">
          <span className="navbar-logo-icon">CBG</span>
          <span className="navbar-logo-text">TransporteCBG</span>
        </Navbar.Brand>

        {/* BOTÓN HAMBURGUESA (MÓVIL) */}
        <Navbar.Toggle aria-controls="basic-navbar-nav" />

        {/* CONTENIDO COLAPSABLE */}
        <Navbar.Collapse id="basic-navbar-nav">
          
          {/* ENLACES CENTRALES */}
          <Nav className="me-auto my-2 my-lg-0 navbar-links-container ">
            <Nav.Link as={Link} to="/panel-driver">Choferes</Nav.Link>
            <Nav.Link as={Link} to="/chassis">Flota</Nav.Link>
            <Nav.Link as={Link} to="/company">Empresas</Nav.Link>
            <Nav.Link as={Link} to="/travels">Viajes</Nav.Link>
            <Nav.Link as={Link} to="/panel-user">Usuarios</Nav.Link>

            {/* TU DROPDOWN DE EJEMPLO */}
            <NavDropdown title="Facturacion" id="basic-nav-dropdown">
              <NavDropdown.Item href="#action/3.1">Pagos de Empresa</NavDropdown.Item>
              <NavDropdown.Item href="#action/3.2">Pagos de Choferes</NavDropdown.Item>
            </NavDropdown>
          </Nav>

          {/* SECCIÓN USUARIO Y LOGOUT (A LA DERECHA) */}
          <div className="d-flex align-items-center gap-3 mt-3 mt-lg-0 user-actions">
            <span className="navbar-username text-white">
              Hola, <strong>{user?.name || 'Usuario'}</strong>
            </span>
            <button onClick={handleLogout} className="navbar-logout-btn">
              Cerrar Sesión
            </button>
          </div>

        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavigationBar;