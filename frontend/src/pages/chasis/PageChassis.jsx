import React, { useState } from 'react';
import Navbar from '../../components/navbar/Navbar'; 
import Chassis from '../../components/chassis/Chassis';
import Coupled from '../../components/coupled/Coupled';
import './fleetManagement.css'; // Crearemos un CSS unificado para esto

const PageChassis = () => {
    // Estado para controlar qué pestaña está activa ('chassis' o 'coupled')
    const [activeTab, setActiveTab] = useState('chassis');

    return (
        <div className="fleet-layout">
            <Navbar />
            
            <div className="fleet-container">
                <div className="fleet-header-main">
                    <h1>🚚 Gestión de Flota</h1>
                </div>

                {/* --- ZONA DE PESTAÑAS (TABS) --- */}
                <div className="fleet-tabs">
                    <button 
                        className={`tab-btn ${activeTab === 'chassis' ? 'active' : ''}`}
                        onClick={() => setActiveTab('chassis')}
                    >
                        🚛 Chasis
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'coupled' ? 'active' : ''}`}
                        onClick={() => setActiveTab('coupled')}
                    >
                        🛒 Acoplados
                    </button>
                </div>

                {/* --- CONTENIDO DINÁMICO --- */}
                <div className="fleet-content-wrapper">
                    {activeTab === 'chassis' ? (
                        <Chassis />
                    ) : (
                        <Coupled />
                    )}
                </div>
            </div>
        </div>
    );
};

export default PageChassis;