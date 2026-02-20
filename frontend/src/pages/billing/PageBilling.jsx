import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/navbar/Navbar';

const PageBilling = () => {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
        <h1>Facturación</h1>
        <p>Accesos rápidos:</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/company-payments" style={{ padding: '10px 14px', background: '#fff', borderRadius: 10, border: '1px solid #eee' }}>
            Pagos de Empresa
          </Link>
          <Link to="/driver-payments" style={{ padding: '10px 14px', background: '#fff', borderRadius: 10, border: '1px solid #eee' }}>
            Pagos de Choferes
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PageBilling;

