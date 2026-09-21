import React, { useState, useEffect, useRef } from 'react';
import { useMaintenance } from '../context/MaintenanceContext';
import { Clock } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function MaintenanceWarning() {
  const { maintenanceData, effectiveStatus } = useMaintenance();
  const [remainingTime, setRemainingTime] = useState('');
  const location = useLocation();
  const bannerRef = useRef(null);

  useEffect(() => {
    if (effectiveStatus !== 'scheduled' || !maintenanceData?.maintenanceStartTime) return;

    const updateTimer = () => {
      const startMillis = maintenanceData.maintenanceStartTime.toMillis ? maintenanceData.maintenanceStartTime.toMillis() : maintenanceData.maintenanceStartTime;
      const diff = startMillis - Date.now();

      if (diff <= 0) {
        setRemainingTime('00:00');
        return;
      }

      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setRemainingTime(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [maintenanceData, effectiveStatus]);

  useEffect(() => {
    if (effectiveStatus !== 'scheduled') {
      document.documentElement.style.removeProperty('--maintenance-banner-height');
      return;
    }

    if (!bannerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        document.documentElement.style.setProperty('--maintenance-banner-height', `${entry.contentRect.height}px`);
      }
    });

    resizeObserver.observe(bannerRef.current);

    return () => {
      resizeObserver.disconnect();
      document.documentElement.style.removeProperty('--maintenance-banner-height');
    };
  }, [effectiveStatus, location.pathname]); // Re-run if path changes because banner might unmount

  // Hide for Admin pages or Resident pages if not scheduled
  const isResidentPage = location.pathname.startsWith('/user-') || 
                         ['/barangay-clearance', '/certificate-of-residency', '/certificate-of-indigency', '/business-clearance'].includes(location.pathname);
                         
  if (location.pathname.startsWith('/admin') || location.pathname === '/login' || isResidentPage) return null;
  if (effectiveStatus !== 'scheduled') return null;

  return (
    <div ref={bannerRef} className="maintenance-warning-banner">
       <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div>
            <h4 style={{ margin: 0, color: '#c05621', fontSize: '1rem', fontWeight: 'bold' }}>Scheduled Maintenance</h4>
            <p style={{ margin: 0, color: '#dd6b20', fontSize: '0.85rem' }}>BDRS will undergo scheduled maintenance soon. Please finish your transactions before maintenance begins.</p>
          </div>
       </div>
       <div style={{ backgroundColor: '#feebc8', padding: '5px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fbd38d' }}>
          <Clock color="#c05621" size={20} />
          <span style={{ color: '#c05621', fontWeight: 'bold', fontSize: '1.1rem' }}>{remainingTime}</span>
       </div>
    </div>
  );
}
