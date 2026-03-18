import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/navbar/Navbar';
import '../chasis/fleetManagement.css';
import './billing.css';
import CompanyPayments from '../../components/companyPayments/CompanyPayments';
import DriverPayments from '../../components/driverPayments/DriverPayments';

const PageBilling = () => {
  const [activeTab, setActiveTab] = useState('payments');

  return (
    <div className="fleet-layout">
      <Navbar />
      <div className="fleet-container">
        <div className="fleet-header-main">
          <h1>🧾 Facturacion</h1>
        </div>

        <div className="fleet-tabs fleet-tabs-segmented-main">
          <button
            className={`tab-btn fleet-main-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
            type="button"
          >
           🏦 Empresas
          </button>
          <button
            className={`tab-btn fleet-main-tab-btn ${activeTab === 'entities' ? 'active' : ''}`}
            onClick={() => setActiveTab('entities')}
            type="button"
          >
           👨‍✈️ Choferes
          </button>
        </div>

        <div className="fleet-content-wrapper">
          {activeTab === 'payments' ? (
            <CompanyPayments />
          ) : (
            <DriverPayments />
          )}
        </div>
      </div>
    </div>
  );
};

export default PageBilling;
