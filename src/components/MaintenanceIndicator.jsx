import React from 'react';
import { Clock } from 'lucide-react';
import { useMaintenance } from '../context/MaintenanceContext';
import Swal from 'sweetalert2';

export default function MaintenanceIndicator() {
  const { isMaintenanceActive, maintenanceData } = useMaintenance();

  if (!isMaintenanceActive) return null;

  const handleClick = () => {
    let remaining = '';
    if (maintenanceData?.endTime) {
      const now = Date.now();
      const endMillis = maintenanceData.endTime.toMillis ? maintenanceData.endTime.toMillis() : maintenanceData.endTime;
      const diff = endMillis - now;
      if (diff > 0) {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        remaining = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      } else {
        remaining = 'Expired';
      }
    }

    const formatDate = (timestamp) => {
      if (!timestamp) return 'N/A';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    Swal.fire({
      title: 'Maintenance Mode',
      html: `
        <div style="text-align: left; font-size: 0.9rem;">
          <p><strong>Status:</strong> Active</p>
          <p><strong>Started:</strong> ${formatDate(maintenanceData?.startTime)}</p>
          <p><strong>Ends:</strong> ${formatDate(maintenanceData?.endTime)}</p>
          <p><strong>Remaining:</strong> ${remaining}</p>
          <hr />
          <p><strong>Message:</strong> ${maintenanceData?.message}</p>
        </div>
      `,
      icon: 'info',
      confirmButtonColor: '#3182ce'
    });
  };

  return (
    <button 
      onClick={handleClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        position: 'relative',
        color: '#e53e3e', // Red to stand out
        transition: 'color 0.2s',
      }}
      title="Maintenance Mode Active"
    >
      <Clock size={22} />
      <span style={{
        position: 'absolute',
        top: '6px',
        right: '6px',
        width: '8px',
        height: '8px',
        backgroundColor: '#e53e3e',
        borderRadius: '50%',
        border: '2px solid white'
      }}></span>
    </button>
  );
}
