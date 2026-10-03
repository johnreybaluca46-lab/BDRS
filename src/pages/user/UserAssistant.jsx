import React from 'react';
import ResidentSidebar from '../../components/ResidentSidebar';
import ResidentProfileDropdown from '../../components/ResidentProfileDropdown';
import ResidentNotificationBell from '../../components/ResidentNotificationBell';
import ResidentChatbot from '../../components/ResidentChatbot';
import '../../lib/admin-layout.css';

export default function UserAssistant() {
  return (
    <div className="admin-dashboard-container">
      <ResidentSidebar />
      <main className="admin-main">
        <header className="admin-header resident-header">
          <h1>BDRS Assistant</h1>
          <div className="header-right">
            <ResidentNotificationBell />
            <ResidentProfileDropdown />
          </div>
        </header>

        <div className="dashboard-content" style={{ height: 'calc(100vh - 120px)', padding: '20px' }}>
          <div style={{ width: '100%', height: '100%', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex' }}>
            <ResidentChatbot fullScreen={true} />
          </div>
        </div>
      </main>
    </div>
  );
}
