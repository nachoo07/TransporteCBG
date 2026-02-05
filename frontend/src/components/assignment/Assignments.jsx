import React, { useState, useEffect } from 'react';
import Navbar from '../../components/navbar/Navbar';
import { useAssignments } from '../../context/assignment/AssignmentsContext';
import { useDriver } from '../../context/driver/DriverContext';
import { useChasis } from '../../context/chasis/ChasisContext';
import { useCoupled } from '../../context/coupled/CoupledContext'; // Asumo que tienes este context
import './assignments.css';

const Assignments = () => {
    const { assignments, loading, createAssignment, finishAssignment } = useAssignments();
    
    // Traemos los datos para los Selects del Modal
    const { drivers } = useDriver(); 
    const { chasis } = useChasis();
    const { coupled } = useCoupled(); // Asumo nombre

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ chofer_id: '', chasis_id: '', acoplado_id: '' });

    // Filtrar solo los disponibles (activos y NO asignados)
    const ocupadosChofer = assignments.map(a => a.chofer_id);
    const ocupadosChasis = assignments.map(a => a.chasis_id);
    const ocupadosAcoplado = assignments.map(a => a.acoplado_id);

    const availableDrivers = drivers.filter(d => d.activo && !ocupadosChofer.includes(d.id));
    const availableChasis = chasis.filter(c => c.activo && !ocupadosChasis.includes(c.id));
    const availableCoupled = coupled.filter(c => c.activo && !ocupadosAcoplado.includes(c.id));

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await createAssignment(formData);
        if (success) {
            setIsModalOpen(false);
            setFormData({ chofer_id: '', chasis_id: '', acoplado_id: '' });
        }
    };

    return (
        <div className="assign-layout">
            <Navbar />
            <div className="assign-container">
                <div className="assign-header">
                    <h1>Mesa de Asignaciones (Operaciones)</h1>
                    <button onClick={() => setIsModalOpen(true)} className="btn-assign">+ Nueva Asignación</button>
                </div>

                <div className="table-wrapper">
                    <table className="assign-table">
                        <thead>
                            <tr>
                                <th>Estado</th>
                                <th>Tractor (Chasis)</th>
                                <th>Acoplado</th>
                                <th>Chofer Asignado</th>
                                <th>Fecha Inicio</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assignments.length > 0 ? assignments.map(item => (
                                <tr key={item.id}>
                                    <td><span className="badge-active">En Curso</span></td>
                                    <td><strong>{item.Dominio_chasis}</strong></td>
                                    <td>{item.Dominio_acoplado}</td>
                                    <td style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                        <div className="mini-avatar">{item.chofer_nombre?.charAt(0)}</div>
                                        {item.chofer_nombre} {item.chofer_apellido}
                                    </td>
                                    <td>{new Date(item.fecha_inicio).toLocaleDateString()}</td>
                                    <td>
                                        <button onClick={() => finishAssignment(item.id)} className="btn-finish" title="Finalizar Viaje / Liberar">
                                            🏁 Finalizar
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" style={{textAlign:'center', padding:'2rem'}}>No hay vehículos asignados actualmente.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODAL DE ASIGNACIÓN --- */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Configurar Nuevo Equipo</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Seleccionar Chasis (Tractor)</label>
                                <select 
                                    value={formData.chasis_id} 
                                    onChange={e => setFormData({...formData, chasis_id: e.target.value})}
                                    required
                                >
                                    <option value="">-- Elegir Chasis --</option>
                                    {availableChasis.map(c => (
                                        <option key={c.id} value={c.id}>{c.Dominio_chasis}</option>
                                    ))}
                                </select>
                                {availableChasis.length === 0 && <small style={{color:'orange'}}>⚠️ No hay chasis disponibles</small>}
                            </div>

                            <div className="form-group">
                                <label>Seleccionar Acoplado</label>
                                <select 
                                    value={formData.acoplado_id} 
                                    onChange={e => setFormData({...formData, acoplado_id: e.target.value})}
                                    required
                                >
                                    <option value="">-- Elegir Acoplado --</option>
                                    {availableCoupled.map(c => (
                                        <option key={c.id} value={c.id}>{c.Dominio_acoplado}</option>
                                    ))}
                                </select>
                                {availableCoupled.length === 0 && <small style={{color:'orange'}}>⚠️ No hay acoplados disponibles</small>}
                            </div>

                            <div className="form-group">
                                <label>Seleccionar Chofer Responsable</label>
                                <select 
                                    value={formData.chofer_id} 
                                    onChange={e => setFormData({...formData, chofer_id: e.target.value})}
                                    required
                                >
                                    <option value="">-- Elegir Chofer --</option>
                                    {availableDrivers.map(d => (
                                        <option key={d.id} value={d.id}>{d.apellido}, {d.nombre} ({d.dni})</option>
                                    ))}
                                </select>
                                {availableDrivers.length === 0 && <small style={{color:'orange'}}>⚠️ No hay choferes disponibles</small>}
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-cancel">Cancelar</button>
                                <button type="submit" className="btn-save">Confirmar Asignación</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Assignments;