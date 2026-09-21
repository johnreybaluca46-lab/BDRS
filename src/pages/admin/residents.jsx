import React, { useState, useEffect } from 'react';
import SkeletonTable from '../../components/SkeletonTable';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  LayoutDashboard, 
  FileText, 
  Users,
  UserPlus, 
  BarChart2, 
  CheckCircle, 
  UserCircle, 
  LogOut,
  Settings,
  Search,
  Eye,
  Trash2,
  Mail,
  Edit,
  Lock,
  Unlock
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../database/firebase';
import { collection, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';

import '../../lib/admin-layout.css';
import AdminHeaderRight from '../../components/AdminHeaderRight';
import Logo from '../../assets/logo/barangay buluan seal.png';
import AdminSidebar from '../../components/AdminSidebar';

import PaginationControl from '../../components/PaginationControl';
import EmptyState from '../../components/EmptyState';

export default function Residents() {
  useEffect(() => {
    document.title = "Admin | Residents";
  }, []);

  const [residentsList, setResidentsList] = useState([]);
  const [lockoutsData, setLockoutsData] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const lockoutsQ = collection(db, 'lockouts');
    const unsubscribeLockouts = onSnapshot(lockoutsQ, (snapshot) => {
      const lockoutsMap = {};
      snapshot.forEach(doc => {
        lockoutsMap[doc.id.toLowerCase()] = doc.data();
      });
      setLockoutsData(lockoutsMap);
    });

    const q = collection(db, 'residents');
    const unsubscribeResidents = onSnapshot(q, (snapshot) => {
      const reqs = [];

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const status = data.status || 'Registered';
        
        let formattedDate = 'N/A';
        if (data.timestamp) {
          const date = data.timestamp.toDate();
          formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }

        let isOnline = false;
        if (data.login_status === 'Active' && data.last_seen) {
          const lastSeenTime = data.last_seen.toMillis ? data.last_seen.toMillis() : (data.last_seen.seconds ? data.last_seen.seconds * 1000 : Date.now());
          // Timeout of 5 minutes (300000 ms)
          if (Date.now() - lastSeenTime < 300000) {
            isOnline = true;
          }
        }

        if (status !== 'Pending' && status !== 'Rejected') {
          reqs.push({
            id: docSnap.id,
            resNumber: data.resNumber || null,
            name: data.fullName || 'N/A',
            emailAddress: data.emailAddress ? data.emailAddress.trim() : '',
            photoURL: data.photo2x2 || data.photoURL || null,
            date: formattedDate,
            status: status,
            isOnline: isOnline,
            rawTimestamp: data.timestamp || null,
            failedAttempts: data.failed_attempts || 0
          });
        }
      });
      
      reqs.sort((a, b) => {
        const timeA = a.rawTimestamp && a.rawTimestamp.toMillis ? a.rawTimestamp.toMillis() : (a.rawTimestamp && a.rawTimestamp.seconds ? a.rawTimestamp.seconds * 1000 : 0);
        const timeB = b.rawTimestamp && b.rawTimestamp.toMillis ? b.rawTimestamp.toMillis() : (b.rawTimestamp && b.rawTimestamp.seconds ? b.rawTimestamp.seconds * 1000 : 0);
        return timeB - timeA; // Descending
      });
      
      setResidentsList(reqs);
      setLoading(false);
    });

    return () => {
      unsubscribeLockouts();
      unsubscribeResidents();
    };
  }, []);

  const handleLogout = () => {
    Swal.fire({
      title: 'Confirm Logout',
      text: 'Are you sure you want to logout of the admin dashboard?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Logout'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await signOut(auth);
          navigate('/login', { state: { loggedOut: true } });
        } catch (error) {
          console.error('Failed to log out', error);
        }
      }
    });
  };

  const handleDeleteResident = (id, name) => {
    Swal.fire({
      title: 'Delete Resident?',
      text: `Are you sure you want to delete ${name}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, 'residents', id));
          Swal.fire('Deleted!', 'The resident has been deleted.', 'success');
        } catch (error) {
          console.error("Error deleting resident:", error);
          Swal.fire('Error!', 'There was an error deleting the resident.', 'error');
        }
      }
    });
  };

  const handleUnlock = (id, name) => {
    Swal.fire({
      title: 'Unlock Account?',
      text: `Are you sure you want to unlock ${name}'s account?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dd6b20',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Yes, unlock it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await updateDoc(doc(db, 'residents', id), {
             failed_attempts: 0,
             locked_until: null
          });
          Swal.fire('Unlocked!', 'The resident account has been unlocked.', 'success');
        } catch (error) {
          console.error("Error unlocking resident:", error);
          Swal.fire('Error!', 'There was an error unlocking the account.', 'error');
        }
      }
    });
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'registered': return 'status-approved';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  };

  const filteredRequests = residentsList.filter(req => {
    const matchesSearch = !searchQuery || (req.resNumber && req.resNumber.toLowerCase().includes(searchQuery.toLowerCase())) || (req.name && req.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage));
  const currentItems = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="admin-dashboard-container">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <h1>Residents</h1>
          <div className="header-right">
            <AdminHeaderRight />
          </div>
        </header>

        {/* Content Area */}
        <div className="document-request-container">
          <div className="doc-controls">
            <div className="doc-search" style={{ border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: 'white', padding: '0 16px', width: '300px', display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#4a5568', fontWeight: '500', fontSize: '0.95rem' }}>RES-</span>
              <input 
                type="text" 
                placeholder="****-****" 
                value={searchQuery}
                onChange={(e) => { 
                   let val = e.target.value.replace(/[^0-9]/g, '');
                   if (val.length > 4) {
                     val = val.slice(0, 4) + '-' + val.slice(4, 8);
                   }
                   setSearchQuery(val); 
                   setCurrentPage(1); 
                }}
                maxLength={9}
                style={{ border: 'none', outline: 'none', background: 'transparent', flexGrow: 1, padding: '12px 0', fontSize: '0.95rem', width: '100%' }}
              />
              <Search className="search-icon" size={18} style={{position: 'static', marginLeft: 'auto', color: '#a0aec0'}} />
            </div>
          </div>

          {loading ? <SkeletonTable /> : filteredRequests.length === 0 ? (
            <EmptyState 
              icon={Users} 
              title="No Residents Found" 
              subtitle={searchQuery !== '' ? "No results match your current filters." : "No resident records match your current filters."}
            />
          ) : (
            <div className="doc-table-wrapper">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Resident</th>
                    <th>Resident ID</th>
                    <th style={{ textAlign: 'center' }}>Account Status</th>
                    <th style={{ textAlign: 'center' }}>Login Status</th>
                    <th>Lockout</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((req, index) => {
                    const residentLockout = req.emailAddress ? lockoutsData[req.emailAddress.toLowerCase()] : null;
                    let lockedUntilMs = null;
                    if (residentLockout && residentLockout.locked_until) {
                      lockedUntilMs = typeof residentLockout.locked_until === 'number' ? residentLockout.locked_until : 
                                     (residentLockout.locked_until.toMillis ? residentLockout.locked_until.toMillis() : 
                                     (residentLockout.locked_until.seconds ? residentLockout.locked_until.seconds * 1000 : null));
                    }
                    
                    const isLocked = lockedUntilMs && lockedUntilMs > currentTime;
                    const wasLocked = lockedUntilMs && lockedUntilMs <= currentTime;
                    const remainingSecs = isLocked ? Math.ceil((lockedUntilMs - currentTime) / 1000) : 0;
                    
                    return (
                    <tr key={req.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {req.photoURL ? (
                            <img
                              src={req.photoURL}
                              alt={req.name}
                              style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0', flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem', fontWeight: 700, color: '#718096' }}>
                              {req.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>{req.name}</span>
                            <span style={{ fontSize: '11px', color: '#718096' }}>{req.emailAddress || 'No Email'}</span>
                          </div>
                        </div>
                      </td>
                      <td>{req.resNumber || req.residentId || (req.id.startsWith('RES') ? req.id : `RES-2026-${req.id.substring(0, 5).toUpperCase()}`)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-badge ${getStatusClass(req.status)}`}>
                          {req.status === 'Approved' ? 'Registered' : req.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {req.isOnline ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#38a169', fontWeight: '500', fontSize: '0.9rem' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#48bb78', display: 'inline-block' }}></span>
                            Active
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#718096', fontWeight: '500', fontSize: '0.9rem' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid #a0aec0', display: 'inline-block' }}></span>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td>
                        {isLocked ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#e53e3e', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Lock size={14} /> Locked Out
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#718096' }}>
                              {Math.floor(remainingSecs / 60)}:{(remainingSecs % 60).toString().padStart(2, '0')} remaining
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#38a169', fontWeight: '500' }}>Not Locked</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <Link to={`/admin/residents/${req.id}`} className="action-btn view-btn" title="View Resident">
                            <Eye size={18} />
                          </Link>
                          <button className="action-btn delete-btn" title="Delete Resident" onClick={() => handleDeleteResident(req.id, req.name)}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
              
              <PaginationControl 
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                totalItems={filteredRequests.length}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

