import React from 'react';
import './Spinner.css';

const Spinner = ({ message = 'Cargando...' }) => (
  <div className="spinner-container">
    <div className="spinner"></div>
    <span className="spinner-message">{message}</span>
  </div>
);

export default Spinner;
