import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, X } from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';

export default function ResidentMaintenanceModal() {
  const { maintenanceData, effectiveStatus, isModalDismissed, setIsModalDismissed } = useMaintenance();
  const [remainingTime, setRemainingTime] = useState('');
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [initialSeconds, setInitialSeconds] = useState(0);

  useEffect(() => {
    if (effectiveStatus !== 'scheduled' || !maintenanceData?.maintenanceStartTime) return;

    const startMillis = maintenanceData.maintenanceStartTime.toMillis
      ? maintenanceData.maintenanceStartTime.toMillis()
      : maintenanceData.maintenanceStartTime;

    const initialDiff = Math.max(0, Math.floor((startMillis - Date.now()) / 1000));
    setInitialSeconds(initialDiff);

    const updateTimer = () => {
      const diff = startMillis - Date.now();
      if (diff <= 0) {
        setRemainingTime('00:00');
        setTotalSeconds(0);
        return;
      }
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTotalSeconds(Math.floor(diff / 1000));
      setRemainingTime(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [maintenanceData, effectiveStatus]);

  // Don't render anything if not scheduled or modal is dismissed
  if (effectiveStatus !== 'scheduled') return null;
  if (isModalDismissed) return null;

  const isUrgent = totalSeconds <= 60;
  const isWarning = totalSeconds <= 300;
  const accentColor = isUrgent ? '#e53e3e' : isWarning ? '#dd6b20' : '#c05621';
  const bgColor = isUrgent ? '#fff5f5' : '#fffaf0';
  const borderColor = isUrgent ? '#feb2b2' : '#fbd38d';
  const progressColor = isUrgent ? '#e53e3e' : '#f6ad55';
  const progress = initialSeconds > 0 ? Math.max(0, Math.min(100, ((initialSeconds - totalSeconds) / initialSeconds) * 100)) : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.35)',
          zIndex: 9998,
          backdropFilter: 'blur(2px)',
          animation: 'rm-fade-in 0.3s ease',
        }}
        onClick={() => setIsModalDismissed(true)}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          width: '90%',
          maxWidth: '440px',
          backgroundColor: bgColor,
          border: `2px solid ${borderColor}`,
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          animation: 'rm-slide-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div style={{ backgroundColor: accentColor, height: '5px', width: '100%' }} />
        <div style={{ backgroundColor: '#e2e8f0', height: '4px', width: '100%' }}>
          <div style={{ backgroundColor: progressColor, height: '100%', width: `${progress}%`, transition: 'width 1s linear' }} />
        </div>

        <button
          onClick={() => setIsModalDismissed(true)}
          style={{ position: 'absolute', top: '14px', right: '14px', background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '50%', transition: 'color 0.2s' }}
          title="Dismiss"
          onMouseOver={e => e.currentTarget.style.color = accentColor}
          onMouseOut={e => e.currentTarget.style.color = '#a0aec0'}
        >
          <X size={20} />
        </button>

        <div style={{ padding: '28px 28px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: isUrgent ? '#fed7d7' : '#feebcb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, animation: isUrgent ? 'rm-pulse 1s ease-in-out infinite' : 'none' }}>
              <AlertTriangle size={26} color={accentColor} />
            </div>
            <div>
              <h2 style={{ margin: 0, color: '#2d3748', fontSize: '1.15rem', fontWeight: 700 }}>Scheduled Maintenance</h2>
              <p style={{ margin: 0, color: '#718096', fontSize: '0.8rem', marginTop: '2px' }}>System will be temporarily unavailable</p>
            </div>
          </div>

          <p style={{ margin: '0 0 20px', color: '#4a5568', fontSize: '0.9rem', lineHeight: '1.6' }}>
            BDRS will undergo scheduled maintenance soon. Please{' '}
            <strong style={{ color: accentColor }}>finish your transactions</strong> before maintenance begins.
            You will be logged out automatically when maintenance starts.
          </p>

          <div style={{ backgroundColor: isUrgent ? '#fed7d7' : '#feebcb', border: `1.5px solid ${borderColor}`, borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={22} color={accentColor} />
              <span style={{ color: '#4a5568', fontSize: '0.9rem', fontWeight: 500 }}>Time remaining</span>
            </div>
            <span style={{ color: accentColor, fontWeight: 800, fontSize: '1.6rem', fontFamily: 'monospace', letterSpacing: '2px', animation: isUrgent ? 'rm-pulse 1s ease-in-out infinite' : 'none' }}>
              {remainingTime}
            </span>
          </div>

          <button
            onClick={() => setIsModalDismissed(true)}
            style={{ marginTop: '18px', width: '100%', padding: '10px', backgroundColor: accentColor, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            I understand, dismiss
          </button>
        </div>
      </div>

      <style>{`
        @keyframes rm-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rm-slide-in { from { opacity: 0; transform: translate(-50%, -54%) scale(0.92); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
        @keyframes rm-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
      `}</style>
    </>
  );
}
