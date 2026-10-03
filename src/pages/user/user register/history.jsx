import React, { useState, useEffect } from 'react';
import SkeletonTimeline from '../../../components/SkeletonTimeline';
import ResidentSidebar from '../../../components/ResidentSidebar';
import ResidentProfileDropdown from '../../../components/ResidentProfileDropdown';
import ResidentNotificationBell from '../../../components/ResidentNotificationBell';
import '../../../lib/admin-layout.css';
import '../../../lib/history.css';
import { collection, query, where, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { auth, db } from '../../../database/firebase';
import { Trash2, FileText, Check, Clock, X, Bell, CheckCircle, ArrowRight } from 'lucide-react';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, colorTheme, linkText, linkTo, valuePrefix = '', style, className = '' }) => {
  return (
    <div className={`summary-card new-card-${colorTheme} ${className}`} style={style}>
      <div className="summary-card-header">
        <div className="summary-card-icon-wrapper">
          <Icon size={22} strokeWidth={2.5} />
        </div>
        <span className="summary-card-title">{title}</span>
      </div>
      <div className="summary-card-body">
        <div className="summary-card-value-wrapper">
          <span className="summary-card-value">{valuePrefix}{value}</span>
        </div>
      </div>
      <Link to={linkTo} className="summary-card-link-btn">
        {linkText} <ArrowRight size={14} />
      </Link>
      <div className="summary-card-bg-icon">
        <Icon size={80} strokeWidth={1.5} />
      </div>
    </div>
  );
};

export default function RequestHistory() {
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState('All Time');
  const [availableMonths, setAvailableMonths] = useState([]);
  const [stats, setStats] = useState({ pending: 0, rejected: 0, actions: 0 });

  useEffect(() => {
    document.title = "Resident | Activity Log";
    
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'requests'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = [];
      const months = new Set();
      let pending = 0;
      let rejected = 0;
      let actions = 0;

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        
        // Skip if user cleared this from history
        if (data.clearedFromHistory) return;

        let status = data.status || 'Pending';
        if (status === 'Processing') status = 'Pending';
        if (status === 'Trash') status = 'Rejected';

        const timestamp = data.timestamp ? data.timestamp.toDate() : new Date();
        const monthKey = timestamp.toLocaleString('default', { month: 'long', year: 'numeric' });
        months.add(monthKey);

        logs.push({
          id: docSnap.id,
          type: status,
          document: data.type,
          timestamp,
          monthKey
        });

        if (status === 'Pending') pending++;
        else if (status === 'Rejected') rejected++;
        else actions++; // Approved or Completed count as "Document Actions"
      });

      logs.sort((a, b) => b.timestamp - a.timestamp);
      
      setHistoryLogs(logs);
      setStats({ pending, rejected, actions });
      setAvailableMonths(Array.from(months).sort((a, b) => new Date(b) - new Date(a)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleClearLogs = async () => {
    if (historyLogs.length === 0) return;

    const confirm = await Swal.fire({
      title: 'Clear Activity Logs?',
      text: 'This will remove all currently visible logs from your history. This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Yes, clear logs'
    });

    if (confirm.isConfirmed) {
      try {
        const batch = writeBatch(db);
        const filteredLogs = filterMonth === 'All Time' 
          ? historyLogs 
          : historyLogs.filter(log => log.monthKey === filterMonth);

        filteredLogs.forEach(log => {
          const ref = doc(db, 'requests', log.id);
          batch.update(ref, { clearedFromHistory: true });
        });

        await batch.commit();
        
        Swal.fire({
          title: 'Logs Cleared!',
          text: 'Your activity history has been cleared.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error clearing logs:', error);
        Swal.fire('Error', 'Failed to clear logs.', 'error');
      }
    }
  };

  const filteredLogs = filterMonth === 'All Time' 
    ? historyLogs 
    : historyLogs.filter(log => log.monthKey === filterMonth);

  const getIconData = (type) => {
    switch(type) {
      case 'Approved': return { icon: <FileText size={14} />, cls: 'bg-green', title: 'Approved request' };
      case 'Completed': return { icon: <Bell size={14} />, cls: 'bg-yellow', title: 'Completed request' };
      case 'Rejected': return { icon: <Trash2 size={14} />, cls: 'bg-red', title: 'Rejected request' };
      case 'Pending': return { icon: <Clock size={14} />, cls: 'bg-blue', title: 'Pending request' };
      default: return { icon: <FileText size={14} />, cls: 'bg-blue', title: 'Document Request' };
    }
  };

  const formatDate = (date) => {
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  return (
    <div className="admin-dashboard-container">
      <ResidentSidebar />

      <main className="admin-main">
        <header className="admin-header resident-header">
          <h1>Request History</h1>
          <div className="header-right">
            <ResidentNotificationBell />
            <ResidentProfileDropdown />
          </div>
        </header>

        <div className="dashboard-content">
          <div className="dashboard-panel">
            
            <div className="activity-log-header">
              <h2 className="panel-title" style={{ margin: 0 }}>Full Activity Log</h2>
              <div className="activity-log-controls">
                <button className="btn-clear-logs" onClick={handleClearLogs} disabled={filteredLogs.length === 0}>
                  <Trash2 size={16} /> Clear Logs
                </button>
                <select 
                  className="log-filter-select"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                >
                  <option value="All Time">All Time</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="history-stats-grid">
              <StatCard
                title="Approved"
                value={stats.actions}
                icon={CheckCircle}
                colorTheme="green"
                linkText="View all"
                linkTo="/user-approved-requests"
              />
              <StatCard
                title="Rejected"
                value={stats.rejected}
                icon={Trash2}
                colorTheme="red"
                linkText="View all"
                linkTo="/user-rejected-requests"
              />
              <StatCard
                title="Document Actions"
                value={historyLogs.length}
                icon={FileText}
                colorTheme="blue"
                linkText="View all"
                linkTo="/user-my-requests"
              />
            </div>

            {loading ? <SkeletonTimeline /> : filteredLogs.length > 0 ? (
              <div className="user-timeline">
                {filteredLogs.map(log => {
                  const iconData = getIconData(log.type);
                  return (
                          <div className="timeline-item" key={log.id}>
                      <div className={`timeline-icon ${iconData.cls}`}>
                        {iconData.icon}
                      </div>
                      <div className="timeline-content">
                        <h3>{iconData.title}</h3>
                        <span className="timeline-date">{formatDate(log.timestamp)}</span>
                        <div className="timeline-details">
                          Document: {log.document} {log.type === 'Completed' ? 'marked as Paid/Completed' : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                <Clock size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <h3>No History Found</h3>
                <p>Your past document requests and activity will appear here.</p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
