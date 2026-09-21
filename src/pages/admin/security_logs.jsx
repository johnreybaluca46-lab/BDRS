import React, { useState, useEffect } from 'react';
import SkeletonTable from '../../components/SkeletonTable';
import Swal from 'sweetalert2';
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../database/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Shield, Search, RefreshCw, AlertTriangle, Database, Settings, ShieldCheck, User, Activity, LogIn, Lock, FileText, Calendar, ChevronLeft, ChevronRight, CheckCircle, Trash2, Edit, Globe, Monitor, MapPin, Info, X, Eye } from 'lucide-react';
import '../../lib/security_logs.css';
import '../../lib/admin-layout.css';
import AdminSidebar from '../../components/AdminSidebar';
import AdminHeaderRight from '../../components/AdminHeaderRight';

export default function SecurityLogs() {
  const [activeTab, setActiveTab] = useState('activity');
  
  const [isCustomTimeout, setIsCustomTimeout] = useState(false);
  const [customTimeoutValue, setCustomTimeoutValue] = useState('');
  const [customTimeoutUnit, setCustomTimeoutUnit] = useState('seconds');
  const [customTimeoutError, setCustomTimeoutError] = useState('');
  
  const [rawActivityLogs, setRawActivityLogs] = useState([]);
  const [rawLoginLogs, setRawLoginLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [adminRole, setAdminRole] = useState(sessionStorage.getItem('adminRole') || 'admin');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterDate, setFilterDate] = useState('7');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    document.title = "Security & Audit Logs | BDRS";
    
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      }
    });
    
    const auditRef = collection(db, 'activity_logs');
    const qAudit = query(auditRef, orderBy('timestamp', 'desc'));
    const unsubAudit = onSnapshot(qAudit, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawActivityLogs(logs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching activity logs:", error);
      setLoading(false);
    });

    const loginRef = collection(db, 'login_logs');
    const qLogin = query(loginRef, orderBy('timestamp', 'desc'));
    const unsubLogin = onSnapshot(qLogin, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRawLoginLogs(logs);
    }, (error) => {
      console.error("Error fetching login logs:", error);
    });

    return () => {
      unsubAuth();
      unsubAudit();
      unsubLogin();
    };
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const getIpVersion = (ip) => {
    if (!ip || ip === 'Unknown' || ip === 'Unavailable') return 'Unknown';
    if (ip.includes(':')) return 'IPv6';
    if (ip.includes('.')) return 'IPv4';
    return 'Unknown';
  };

  const formatTableIp = (ip) => {
    if (!ip || ip === 'Unknown' || ip === 'Unavailable') return 'Unavailable';
    const version = getIpVersion(ip);
    if (version === 'IPv6' && ip.length > 20) {
      const parts = ip.split(':');
      if (parts.length >= 4) {
        return `${parts.slice(0, 4).join(':')}:...`;
      }
      return `${ip.substring(0, 20)}...`;
    }
    return ip;
  };

  const isLoginEvent = (log) => {
    const typeStr = (log.type || '').toLowerCase();
    const eventStr = (log.event || log.actionTitle || log.action || '').toLowerCase();
    return typeStr.includes('login') || typeStr.includes('logout') || eventStr.includes('login') || eventStr.includes('logout');
  };

  const auditLogs = rawActivityLogs.filter(log => !isLoginEvent(log));
  let loginLogs = [...rawLoginLogs, ...rawActivityLogs.filter(isLoginEvent)]
    .sort((a, b) => {
      const timeA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate().getTime() : a.timestamp) : 0;
      const timeB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate().getTime() : b.timestamp) : 0;
      return timeB - timeA;
    });

  if (adminRole !== 'superadmin' && currentUser) {
    loginLogs = loginLogs.filter(log => {
      return log.actorId === currentUser.uid || (!log.actorId && log.email === currentUser.email);
    });
  }

  const getTypeBadge = (log) => {
    const action = (log.action || log.actionTitle || log.event || '').toLowerCase();
    const type = (log.targetType || log.type || '').toLowerCase();
    if (action.includes('login') || action.includes('logout') || type.includes('login')) return { label: 'Login', class: 'login' };
    if (action.includes('setting') || type.includes('settings')) return { label: 'Settings', class: 'settings' };
    if (action.includes('backup') || type.includes('backup')) return { label: 'Backup', class: 'backup' };
    if (action.includes('restore') || type.includes('restore')) return { label: 'Restore', class: 'restore' };
    if (action.includes('request') || type.includes('request')) return { label: 'Request', class: 'request' };
    if (action.includes('account') || action.includes('profile')) return { label: 'Account', class: 'account' };
    return { label: 'System', class: 'system' };
  };

  const getActionIcon = (log) => {
    const action = (log.action || log.actionTitle || log.event || '').toLowerCase();
    if (action.includes('setting')) return <Settings size={16} color="#f97316" />;
    if (action.includes('backup') || action.includes('restore')) return <Database size={16} color="#a855f7" />;
    if (action.includes('approve')) return <CheckCircle size={16} color="#22c55e" />;
    if (action.includes('reject') || action.includes('delete')) return <Trash2 size={16} color="#ef4444" />;
    if (action.includes('login') || action.includes('logout')) return <LogIn size={16} color="#3b82f6" />;
    if (action.includes('account') || action.includes('profile')) return <User size={16} color="#06b6d4" />;
    return <Edit size={16} color="#64748b" />;
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchTerm('');
    setFilterType('all');
    setFilterUser('all');
    setSelectedLog(null);
  };

  const getFilteredLogs = (logs) => {
    return logs.filter(log => {
      const searchStr = `${log.action || log.actionTitle || log.event} ${log.actorEmail || log.email} ${log.description || log.actionDetails || log.details} ${log.ipAddress || ''} ${log.location || ''} ${log.method || ''}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
      
      let matchesType = true;
      if (filterType !== 'all') {
        if (activeTab === 'login') {
          const isSuccess = log.result === 'success' || log.type === 'login' || (log.actionTitle && log.actionTitle.toLowerCase().includes('success'));
          const reqType = filterType.toLowerCase() === 'success';
          matchesType = isSuccess === reqType;
        } else {
          const badge = getTypeBadge(log);
          matchesType = badge.label.toLowerCase() === filterType.toLowerCase();
        }
      }

      let matchesUser = true;
      if (filterUser !== 'all') {
        if (activeTab === 'login') {
          if (adminRole === 'superadmin') {
            matchesUser = (log.actorRole || log.role || 'Unknown').toLowerCase() === filterUser.toLowerCase();
          } else {
            matchesUser = (log.method || 'Unknown').toLowerCase() === filterUser.toLowerCase();
          }
        } else {
          matchesUser = (log.actorEmail || log.email || '').toLowerCase() === filterUser.toLowerCase();
        }
      }

      let matchesDate = true;
      if (filterDate !== 'all' && log.timestamp) {
        const date = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
        const now = new Date();
        const diffDays = (now - date) / (1000 * 60 * 60 * 24);
        matchesDate = diffDays <= parseInt(filterDate);
      }

      return matchesSearch && matchesType && matchesUser && matchesDate;
    });
  };

  const allLogs = [...auditLogs, ...loginLogs].sort((a, b) => {
    const timeA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate().getTime() : a.timestamp) : 0;
    const timeB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate().getTime() : b.timestamp) : 0;
    return timeB - timeA;
  });

  const currentList = activeTab === 'activity' ? auditLogs : activeTab === 'login' ? loginLogs : [];
  const filteredList = getFilteredLogs(currentList);
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const uniqueUsersActivity = [...new Set(auditLogs.map(l => l.actorEmail || l.email).filter(Boolean))];
  const uniqueLoginUsersCount = new Set(loginLogs.map(l => l.actorEmail || l.email).filter(Boolean)).size;

  const [sessionTimeout, setSessionTimeout] = useState(() => {
    return localStorage.getItem('adminSessionTimeout') || '1800';
  });

  useEffect(() => {
    const fetchTimeout = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'security'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          let fetchedVal = data.sessionTimeoutSeconds;
          
          // Migrate old setting if new setting is not present
          if (fetchedVal === undefined && data.sessionTimeout) {
            fetchedVal = data.sessionTimeout === 'disabled' 
              ? 'disabled' 
              : String(parseInt(data.sessionTimeout, 10) * 60);
          }
          
          if (fetchedVal !== undefined) {
            const valStr = fetchedVal.toString();
            setSessionTimeout(valStr);
            localStorage.setItem('adminSessionTimeout', valStr);
            if (!['disabled', '900', '1800', '3600'].includes(valStr)) {
              setIsCustomTimeout(true);
              setCustomTimeoutValue(valStr);
              setCustomTimeoutUnit('seconds');
            }
          }
        }
      } catch (err) {
        console.error("Error fetching session timeout", err);
      }
    };
    fetchTimeout();
  }, []);

  const saveTimeoutSetting = async (val) => {
    setSessionTimeout(val);
    localStorage.setItem('adminSessionTimeout', val);
    try {
      await setDoc(doc(db, 'settings', 'security'), { 
        sessionTimeoutSeconds: val === 'disabled' ? 'disabled' : parseInt(val, 10) 
      }, { merge: true });
      
      let text = 'Session Timeout updated.';
      if (val === 'disabled') {
        text = 'Session Timeout is now disabled.';
      } else {
        const secs = parseInt(val, 10);
        text = `Session Timeout is now ${secs} seconds.`;
      }

      Swal.fire({
        icon: 'success',
        title: 'Settings Saved',
        text,
        confirmButtonColor: '#3b82f6'
      });
    } catch (err) {
      console.error("Error saving session timeout", err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save settings. Please try again.',
        confirmButtonColor: '#3b82f6'
      });
    }
  };

  const handleDropdownChange = async (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setIsCustomTimeout(true);
      if (sessionTimeout !== 'disabled') {
        setCustomTimeoutValue(sessionTimeout);
        setCustomTimeoutUnit('seconds');
      }
    } else {
      setIsCustomTimeout(false);
      setCustomTimeoutError('');
      await saveTimeoutSetting(val);
    }
  };

  const applyCustomTimeout = async () => {
    let multiplier = 1;
    if (customTimeoutUnit === 'minutes') multiplier = 60;
    if (customTimeoutUnit === 'hours') multiplier = 3600;
    
    const parsedValue = parseInt(customTimeoutValue, 10);
    if (isNaN(parsedValue) || parsedValue < 0) {
      setCustomTimeoutError('Value must be a valid positive number.');
      return;
    }
    
    const totalSeconds = parsedValue * multiplier;
    if (totalSeconds < 5) {
      setCustomTimeoutError('Minimum timeout is 5 seconds.');
      return;
    }
    
    setCustomTimeoutError('');
    await saveTimeoutSetting(totalSeconds.toString());
  };


  const renderActivityStatsCards = () => (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon blue"><FileText size={24} /></div>
        <div className="stat-content">
          <h3>{auditLogs.length}</h3>
          <p className="stat-title">Total Logs</p>
          <p className="stat-sub">All activities in the system</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon green"><User size={24} /></div>
        <div className="stat-content">
          <h3>{loginLogs.length}</h3>
          <p className="stat-title">Login Activities</p>
          <p className="stat-sub">Successful & failed logins</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon purple"><Shield size={24} /></div>
        <div className="stat-content">
          <h3>{auditLogs.filter(l => l.targetType !== 'settings' && l.targetType !== 'backup' && l.type !== 'settings').length}</h3>
          <p className="stat-title">Admin Actions</p>
          <p className="stat-sub">Request approvals, settings, etc.</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon orange"><Settings size={24} /></div>
        <div className="stat-content">
          <h3>{auditLogs.filter(l => l.targetType === 'settings' || (l.actionTitle && l.actionTitle.toLowerCase().includes('setting'))).length}</h3>
          <p className="stat-title">Settings Changes</p>
          <p className="stat-sub">System configuration updates</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon red"><Database size={24} /></div>
        <div className="stat-content">
          <h3>{auditLogs.filter(l => l.targetType === 'backup' || (l.actionTitle && l.actionTitle.toLowerCase().includes('backup'))).length}</h3>
          <p className="stat-title">Backup / Restore</p>
          <p className="stat-sub">Database operations</p>
        </div>
      </div>
    </div>
  );

  const getSuccessLoginCount = () => loginLogs.filter(l => l.result === 'success' || l.type === 'login' || (l.actionTitle && l.actionTitle.toLowerCase().includes('success'))).length;
  const getFailedLoginCount = () => loginLogs.filter(l => l.result === 'failed' || l.type === 'failed_login' || (l.actionTitle && l.actionTitle.toLowerCase().includes('fail'))).length;

  const renderLoginStatsCards = () => (
    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      <div className="stat-card">
        <div className="stat-icon blue"><Monitor size={24} /></div>
        <div className="stat-content">
          <h3>{loginLogs.length}</h3>
          <p className="stat-title">Total Login Attempts</p>
          <p className="stat-sub">All login events (success & failed)</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon green"><CheckCircle size={24} /></div>
        <div className="stat-content">
          <h3>{getSuccessLoginCount()}</h3>
          <p className="stat-title">Successful Logins</p>
          <p className="stat-sub">Valid credentials</p>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon red"><AlertTriangle size={24} /></div>
        <div className="stat-content">
          <h3>{getFailedLoginCount()}</h3>
          <p className="stat-title">Failed Logins</p>
          <p className="stat-sub">Invalid credentials or other issues</p>
        </div>
      </div>
      {adminRole === 'superadmin' ? (
        <div className="stat-card">
          <div className="stat-icon purple"><User size={24} /></div>
          <div className="stat-content">
            <h3>{uniqueLoginUsersCount}</h3>
            <p className="stat-title">Unique Users</p>
            <p className="stat-sub">Accounts that logged in</p>
          </div>
        </div>
      ) : (
        <div className="stat-card" title={loginLogs.length > 0 ? (loginLogs[0].location || 'Unknown') : 'N/A'}>
          <div className="stat-icon purple"><MapPin size={24} /></div>
          <div className="stat-content">
            <h3 style={{ fontSize: '0.85rem', lineHeight: '1.2', wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {loginLogs.length > 0 ? (loginLogs[0].location || 'Unknown') : 'N/A'}
            </h3>
            <p className="stat-title">Recent Location</p>
            <p className="stat-sub">Last login location</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderActivityTable = () => (
    <div className="logs-table-wrapper">
      <table className="logs-table">
      <thead>
        <tr>
          <th>Date & Time</th>
          <th>User</th>
          <th>Action</th>
          <th>Details</th>
          <th>IP Address</th>
          <th style={{ textAlign: 'center' }}>Type</th>
        </tr>
      </thead>
      <tbody>
        {paginatedList.map((log, idx) => {
          const badge = getTypeBadge(log);
          return (
            <tr key={log.id || idx}>
              <td className="table-date">{formatDate(log.timestamp)}</td>
              <td>
                <div className="table-user">
                  <User size={16} className="user-icon" />
                  <div className="table-user-details">
                    <strong>{log.actorRole || log.role || 'Admin'}</strong>
                    <span>{log.actorEmail || log.email || 'Unknown'}</span>
                  </div>
                </div>
              </td>
              <td>
                <div className="table-action">
                  {getActionIcon(log)}
                  {log.action || log.actionTitle || log.event || 'Unknown Action'}
                </div>
              </td>
              <td className="table-details" title={log.description || log.actionDetails || log.details}>
                {log.description || log.actionDetails || log.details || 'No additional details'}
              </td>
              <td className="table-ip" title={log.ipAddress || 'Unknown'}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{formatTableIp(log.ipAddress)}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{getIpVersion(log.ipAddress)}</span>
                </div>
              </td>
              <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                <span className={`badge ${badge.class}`}>
                  {badge.label}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );

  const renderLoginTable = () => (
    <div className="logs-table-wrapper">
      <table className="logs-table">
      <thead>
        <tr>
          <th>Date & Time</th>
          <th>User</th>
          <th>Method</th>
          <th>Event</th>
          <th style={{ textAlign: 'center' }}>Result</th>
          <th>IP Address</th>
          <th>Location</th>
          <th style={{ textAlign: 'center' }}>Details</th>
        </tr>
      </thead>
      <tbody>
        {paginatedList.map((log, idx) => {
          const isSuccess = log.result === 'success' || log.type === 'login' || (log.actionTitle && log.actionTitle.toLowerCase().includes('success'));
          return (
            <tr key={log.id || idx}>
              <td className="table-date">{formatDate(log.timestamp)}</td>
              <td>
                <div className="table-user">
                  <User size={16} className="user-icon" />
                  <div className="table-user-details">
                    <strong>{log.actorEmail || log.email || 'Unknown'}</strong>
                    <span>{log.actorRole || log.role || 'Unknown'}</span>
                  </div>
                </div>
              </td>
              <td style={{ whiteSpace: 'nowrap', paddingLeft: '12px' }}>
                <span className="badge system">
                  {log.method || 'Email/Password'}
                </span>
              </td>
              <td className="text-gray-700 font-medium">
                {log.event || log.actionTitle || log.type || 'Login Event'}
              </td>
              <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                <span className={`badge ${isSuccess ? 'request' : 'badge-danger'}`}>
                  {isSuccess ? 'Success' : 'Failed'}
                </span>
              </td>
              <td className="table-ip" title={log.ipAddress || 'Unknown'}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{formatTableIp(log.ipAddress)}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{getIpVersion(log.ipAddress)}</span>
                </div>
              </td>
              <td>
                <div className="table-user-details">
                  <strong>{log.location || 'Unknown'}</strong>
                  {log.lat && log.lon ? (
                    <a href={`https://www.google.com/maps?q=${log.lat},${log.lon}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontSize: '0.75rem', textDecoration: 'none', marginTop: '2px' }} title={`Lat: ${log.lat}, Lon: ${log.lon}`}>
                      <MapPin size={12} /> View on Map (GPS)
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.isp || 'IP-based Location'}</span>
                  )}
                </div>
              </td>
              <td style={{ textAlign: 'center' }}>
                <button className="view-icon-btn" onClick={() => setSelectedLog(log)} title="View Details">
                  <Eye size={18} />
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="security-settings-content">
      <h2><Lock size={20} color="#3b82f6" /> Enforceable Security Policies</h2>
      <p className="desc">Configure actual security mechanisms enforced by the application frontend. Note: Backend security is strictly enforced by Firestore Security Rules.</p>

      <div className="settings-section">
        <h3>Session Timeout</h3>
        <p className="sub-desc">Automatically logs out inactive users after a specific duration.</p>
        <div className="settings-select-group">
          <select value={isCustomTimeout ? "custom" : sessionTimeout} onChange={handleDropdownChange}>
            <option value="disabled">Disabled (Requires manual logout)</option>
            <option value="900">15 Minutes</option>
            <option value="1800">30 Minutes</option>
            <option value="3600">1 Hour</option>
            <option value="custom">Custom</option>
          </select>
          <span className="settings-note">Frontend-enforced only</span>
        </div>
        {isCustomTimeout && (
          <div className="custom-timeout-inputs" style={{ display: 'flex', gap: '10px', marginTop: '10px', alignItems: 'center' }}>
            <input 
              type="number" 
              min="1"
              value={customTimeoutValue} 
              onChange={(e) => setCustomTimeoutValue(e.target.value)} 
              style={{ width: '80px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            />
            <select 
              value={customTimeoutUnit} 
              onChange={(e) => setCustomTimeoutUnit(e.target.value)}
              style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
            >
              <option value="seconds">Seconds</option>
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
            </select>
            <button 
              onClick={applyCustomTimeout} 
              style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Apply
            </button>
          </div>
        )}
        {customTimeoutError && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '5px' }}>{customTimeoutError}</p>}
      </div>

      <div className="settings-section">
        <h3>Failed Login Monitoring</h3>
        <p className="sub-desc">The system automatically records failed login attempts to the Login Logs.</p>
        <div className="settings-alert">
          <Shield size={20} /> 
          <span>Failed login tracking is <strong>Always Active</strong> and enforced globally.</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard-container">
      <AdminSidebar />
      <main className="admin-main">
        <header className="admin-header">
          <h1>Security & Audit Logs</h1>
          <div className="header-right">
            <AdminHeaderRight />
          </div>
        </header>

        <div className="security-logs-container flex gap-6">
          <div className="flex-1" style={{ width: '100%' }}>
            <div className="security-tabs">
              <button 
                className={`security-tab ${activeTab === 'activity' ? 'active' : ''}`}
                onClick={() => handleTabChange('activity')}
              >
                <FileText size={18} /> Activity Logs
              </button>
              <button 
                className={`security-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => handleTabChange('login')}
              >
                <Monitor size={18} /> Login Logs
              </button>
              <button 
                className={`security-tab ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => handleTabChange('settings')}
              >
                <ShieldCheck size={18} /> Security Settings
              </button>
              <button 
                className={`security-tab ${activeTab === 'account' ? 'active' : ''}`}
                onClick={() => handleTabChange('account')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Settings size={18} /> Account Security
                <span style={{ fontSize: '0.65rem', backgroundColor: '#e2e8f0', color: '#4a5568', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', marginLeft: '4px' }}>Coming Soon</span>
              </button>
            </div>

            {activeTab === 'activity' && renderActivityStatsCards()}
            {activeTab === 'login' && renderLoginStatsCards()}

            {activeTab === 'account' ? (
              <div className="empty-state">
                <Settings size={48} />
                <h3>Account Security</h3>
                <p>Advanced security settings, two-factor authentication, and active session management will be available in a future update. (Coming Soon)</p>
              </div>
            ) : activeTab === 'settings' ? (
              renderSecuritySettings()
            ) : (
              <div className="logs-content">
                <div className="filters-row">
                  <div className="filter-group">
                    <label>{activeTab === 'login' ? 'Event Type' : 'Log Type'}</label>
                    <div className="filter-dropdown">
                      <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}>
                        <option value="all">{activeTab === 'login' ? 'All Events' : 'All'}</option>
                        {activeTab === 'login' ? (
                          <>
                            <option value="success">Success</option>
                            <option value="failed">Failed</option>
                          </>
                        ) : (
                          <>
                            <option value="settings">Settings</option>
                            <option value="backup">Backup</option>
                            <option value="restore">Restore</option>
                            <option value="request">Request</option>
                            <option value="account">Account</option>
                            <option value="system">System</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="filter-group">
                    <label>{activeTab === 'login' ? (adminRole === 'superadmin' ? 'Role' : 'Method') : 'User'}</label>
                    <div className="filter-dropdown">
                      <select value={filterUser} onChange={(e) => { setFilterUser(e.target.value); setCurrentPage(1); }}>
                        {activeTab === 'login' ? (
                          adminRole === 'superadmin' ? (
                            <>
                              <option value="all">All Roles</option>
                              <option value="admin">Admin</option>
                              <option value="resident">Resident</option>
                            </>
                          ) : (
                            <>
                              <option value="all">All Methods</option>
                              <option value="email/password">Email/Password</option>
                              <option value="google">Google Auth</option>
                            </>
                          )
                        ) : (
                          <>
                            <option value="all">All Users</option>
                            {uniqueUsersActivity.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="filter-group">
                    <label>Date Range</label>
                    <div className="filter-dropdown">
                      <Calendar size={14} className="dropdown-icon-left" />
                      <select value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }} style={{ paddingLeft: '32px' }}>
                        <option value="all">All Time</option>
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="search-bar">
                    <Search size={16} className="search-icon" />
                    <input 
                      type="text" 
                      placeholder={activeTab === 'login' ? "Search login logs..." : "Search logs..."}
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                  </div>
                </div>

                {loading ? <SkeletonTable /> : paginatedList.length === 0 ? (
                  <div className="empty-state">
                    <Shield size={48} />
                    <h3>No Logs Found</h3>
                    <p>There are no logs matching your current filters.</p>
                  </div>
                ) : activeTab === 'activity' ? (
                  renderActivityTable()
                ) : (
                  renderLoginTable()
                )}

                {filteredList.length > 0 && (
                  <div className="pagination">
                    <div className="pagination-info">
                      Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredList.length)} of {filteredList.length} logs
                    </div>
                    <div className="pagination-controls">
                      <button 
                        className="page-btn"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                        let pageNum = currentPage;
                        if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;
                        
                        if (pageNum < 1 || pageNum > totalPages) return null;

                        return (
                          <button 
                            key={pageNum}
                            className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                      <button 
                        className="page-btn"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar Details Pane */}
          {selectedLog && (
            <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
              <div className="details-pane" onClick={(e) => e.stopPropagation()}>
                <div className="details-header">
                <h3>Login Details</h3>
                <button className="close-btn" onClick={() => setSelectedLog(null)}><X size={18} /></button>
              </div>
              
              <div className="details-content">
                <div className="detail-item">
                  <User size={18} className="detail-icon blue" />
                  <div>
                    <span className="detail-label">User</span>
                    <strong className="detail-value">{selectedLog.actorEmail || selectedLog.email || 'Unknown'}</strong>
                  </div>
                </div>
                
                <div className="detail-item">
                  <Shield size={18} className="detail-icon purple" />
                  <div>
                    <span className="detail-label">Role</span>
                    <span className={`badge ${(selectedLog.actorRole || selectedLog.role) === 'Admin' ? 'backup' : 'system'} mt-1`}>
                      {selectedLog.actorRole || selectedLog.role || 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="detail-item">
                  <Lock size={18} className="detail-icon blue" />
                  <div>
                    <span className="detail-label">Login Method</span>
                    <strong className="detail-value font-normal text-sm">{selectedLog.method || 'Email/Password'}</strong>
                  </div>
                </div>

                <div className="detail-item">
                  <Activity size={18} className="detail-icon blue" />
                  <div>
                    <span className="detail-label">Event</span>
                    <span className={`badge ${selectedLog.result === 'success' || selectedLog.type === 'login' || (selectedLog.actionTitle && selectedLog.actionTitle.toLowerCase().includes('success')) ? 'request' : 'badge-danger'} mt-1`}>
                      {selectedLog.event || selectedLog.actionTitle || selectedLog.type || 'Login Event'}
                    </span>
                  </div>
                </div>

                <div className="detail-item">
                  <Calendar size={18} className="detail-icon blue" />
                  <div>
                    <span className="detail-label">Date & Time</span>
                    <strong className="detail-value font-normal text-sm">{formatDate(selectedLog.timestamp)}</strong>
                  </div>
                </div>

                <div className="detail-item">
                  <ShieldCheck size={18} className="detail-icon blue" />
                  <div>
                    <span className="detail-label">IP Address</span>
                    <strong className="detail-value font-normal text-sm" style={{ wordBreak: 'break-all' }}>{selectedLog.ipAddress || 'Unknown'}</strong>
                  </div>
                </div>

                <div className="detail-item">
                  <Globe size={18} className="detail-icon blue" />
                  <div>
                    <span className="detail-label">IP Version</span>
                    <strong className="detail-value font-normal text-sm">{getIpVersion(selectedLog.ipAddress)}</strong>
                  </div>
                </div>

                <div className="detail-item">
                  <MapPin size={18} className="detail-icon blue" />
                  <div>
                    <span className="detail-label">{selectedLog.locationType === 'Precise' ? 'Precise Location (GPS)' : 'Approximate Location'}</span>
                    <strong className="detail-value font-normal text-sm">{selectedLog.location || 'Unknown'}</strong>
                    {selectedLog.lat && selectedLog.lon && (
                      <a href={`https://www.google.com/maps?q=${selectedLog.lat},${selectedLog.lon}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: '#2563eb', fontSize: '0.85rem', marginTop: '4px', textDecoration: 'none' }}>
                        View exact location on Google Maps (Lat: {selectedLog.lat.toFixed(5)}, Lon: {selectedLog.lon.toFixed(5)})
                      </a>
                    )}
                  </div>
                </div>

                <div className="detail-item">
                  <Activity size={18} className="detail-icon blue" />
                  <div>
                    <span className="detail-label">ISP / Organization</span>
                    <strong className="detail-value font-normal text-sm">{selectedLog.isp || 'Unknown'}</strong>
                  </div>
                </div>

                <div className="detail-item">
                  <Monitor size={18} className="detail-icon blue" />
                  <div>
                    <span className="detail-label">Device / Browser</span>
                    <strong className="detail-value font-normal text-sm">{selectedLog.browser || 'Unknown'} ({selectedLog.device || 'Unknown'})</strong>
                  </div>
                </div>

                <div className="detail-item" style={{ alignItems: 'flex-start' }}>
                  <Info size={18} className="detail-icon blue mt-1" />
                  <div>
                    <span className="detail-label">Additional Details</span>
                    <p className="detail-desc">{selectedLog.description || selectedLog.details || selectedLog.actionDetails || 'No additional details provided.'}</p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedLog(null)}
                  style={{ 
                    marginTop: '20px', 
                    padding: '12px', 
                    background: '#f8fafc', 
                    border: '1px solid #e2e8f0',
                    color: '#475569', 
                    borderRadius: '8px', 
                    fontWeight: '600', 
                    width: '100%', 
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
                >
                  Close Details
                </button>
              </div>
            </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

