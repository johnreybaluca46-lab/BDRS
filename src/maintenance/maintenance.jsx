import React, { useState, useEffect, useRef } from 'react';
import seal from '../assets/logo/barangay buluan seal.png';
import LoginBg from '../assets/image/login bg.png';
import './maintenance.css';
import { useMaintenance } from '../context/MaintenanceContext';
import Login from '../pages/auth/login';
import { Clock } from 'lucide-react';

const Maintenance = () => {
  const { maintenanceData } = useMaintenance();
  const [showLogin, setShowLogin] = useState(false);
  
  // 10-Click Secret Reveal state
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef(null);

  const handleLogoClick = () => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    setClickCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= 10) {
        setShowLogin(true);
        return 0; // Reset after trigger
      }
      return newCount;
    });

    // Reset counter if no clicks for 3 seconds
    clickTimeoutRef.current = setTimeout(() => {
      setClickCount(0);
    }, 3000);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (showLogin) {
    return <Login />;
  }

  return (
    <div className="maintenance-container" style={{ backgroundImage: `url("${LoginBg}")`, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="maintenance-card" style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: '500px', textAlign: 'center' }}>
        <img 
          src={seal} 
          alt="Barangay Buluan Seal" 
          className="maintenance-logo" 
          title="BDRS System"
          onClick={handleLogoClick}
          style={{ width: '120px', cursor: 'default', userSelect: 'none' }}
        />
        <h1 className="maintenance-title" style={{ fontSize: '1.8rem', color: '#1a202c', marginTop: '20px', marginBottom: '10px' }}>Maintenance Mode</h1>
        
        <p className="maintenance-message" style={{ color: '#4a5568', lineHeight: '1.6', marginBottom: '20px' }}>
          {maintenanceData?.message || "BDRS is currently undergoing scheduled maintenance. Please try again later."}
        </p>

        <div style={{ fontSize: '3rem', margin: '20px 0', color: '#3182ce' }}>🔧</div>

        <div style={{ backgroundColor: '#fff5f5', padding: '15px', borderRadius: '8px', border: '1px solid #fed7d7', marginBottom: '20px' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#c53030', fontWeight: 'bold' }}>Maintenance is currently in progress.</p>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#9b2c2c', lineHeight: '1.5' }}>
            Please wait while the system is being maintained.
          </p>
        </div>

        <div style={{ fontSize: '0.8rem', color: '#718096', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {maintenanceData?.maintenanceStartTime && (
            <div><strong>Started:</strong> {formatDate(maintenanceData.maintenanceStartTime)}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Maintenance;
