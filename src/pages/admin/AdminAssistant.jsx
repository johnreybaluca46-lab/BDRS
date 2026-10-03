import React, { useEffect } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import AdminHeaderRight from '../../components/AdminHeaderRight';
import AdminChatbot from '../../components/AdminChatbot';
import '../../lib/admin-layout.css';

export default function AdminAssistant() {
  useEffect(() => {
    document.title = "Admin | Assistant";
  }, []);

  return (
    <div className="admin-dashboard-container">
      <AdminSidebar />
      <main className="admin-main">
        <header className="admin-header">
          <h1>BDRS Assistant</h1>
          <div className="header-right">
            <AdminHeaderRight />
          </div>
        </header>

        <div className="dashboard-content" style={{ height: 'calc(100vh - 120px)', padding: '20px' }}>
          <div style={{ width: '100%', height: '100%', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex' }}>
            <AdminChatbot fullScreen={true} />
          </div>
        </div>
      </main>
    </div>
  );
}
