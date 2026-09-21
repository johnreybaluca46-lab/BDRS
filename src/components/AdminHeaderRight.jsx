import React from 'react';
import NotificationBell from './NotificationBell';
import AdminProfileDropdown from './AdminProfileDropdown';
import MaintenanceIndicator from './MaintenanceIndicator';
import NetworkStatusIndicator from './NetworkStatusIndicator';

export default function AdminHeaderRight() {
  return (
    <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <MaintenanceIndicator />
      <NetworkStatusIndicator />
      <NotificationBell />
      <AdminProfileDropdown />
    </div>
  );
}
