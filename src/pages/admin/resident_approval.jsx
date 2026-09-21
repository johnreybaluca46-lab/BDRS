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
  Unlock,
  XCircle,
  UserCheck
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../database/firebase';
import { collection, onSnapshot, doc, deleteDoc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { logActivity } from '../../utils/auditLogger';

import '../../lib/admin-layout.css';
import AdminHeaderRight from '../../components/AdminHeaderRight';
import Logo from '../../assets/logo/barangay buluan seal.png';
import AdminSidebar from '../../components/AdminSidebar';

import PaginationControl from '../../components/PaginationControl';
import EmptyState from '../../components/EmptyState';

export default function ResidentApproval() {
  useEffect(() => {
    document.title = "Admin | Resident Approval";
  }, []);

  const [residentsList, setResidentsList] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
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
    const q = collection(db, 'residents');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = [];

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const status = data.status || 'Registered';
        
        let formattedDate = 'N/A';
        const dateObj = data.registeredAt || data.timestamp;
        if (dateObj) {
          const date = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
          formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        let isOnline = false;
        if (data.login_status === 'Active' && data.last_seen) {
          const lastSeenTime = data.last_seen.toMillis ? data.last_seen.toMillis() : (data.last_seen.seconds ? data.last_seen.seconds * 1000 : Date.now());
          // Timeout of 5 minutes (300000 ms)
          if (Date.now() - lastSeenTime < 300000) {
            isOnline = true;
          }
        }

        let lockedUntilMs = null;
        if (data.locked_until) {
            lockedUntilMs = typeof data.locked_until === 'number' ? data.locked_until : 
                           (data.locked_until.toMillis ? data.locked_until.toMillis() : 
                           (data.locked_until.seconds ? data.locked_until.seconds * 1000 : null));
        }

        if (status === 'Pending' || status === 'Rejected') {
          reqs.push({
            id: docSnap.id,
            name: data.fullName || 'N/A',
            photoURL: data.photo2x2 || data.photoURL || null,
            date: formattedDate,
            status: status,
            isOnline: isOnline,
            rawTimestamp: data.timestamp || null,
            lockedUntilMs: lockedUntilMs,
            failedAttempts: data.failed_attempts || 0,
            resNumber: data.resNumber || null,
            qrToken: data.qrToken || null,
            contactNumber: data.contactNumber || 'N/A'
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

  return () => unsubscribe();
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
          await logActivity({
            action: 'Resident Deleted',
            targetType: 'Resident',
            targetId: id,
            description: `Deleted resident account for ${name}`
          });
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
          await logActivity({
            action: 'Resident Unlocked',
            targetType: 'Resident',
            targetId: id,
            description: `Unlocked account for ${name}`
          });
          Swal.fire('Unlocked!', 'The resident account has been unlocked.', 'success');
        } catch (error) {
          console.error("Error unlocking resident:", error);
          Swal.fire('Error!', 'There was an error unlocking the account.', 'error');
        }
      }
    });
  };

  const handleApprove = (id, name, qrToken) => {
    Swal.fire({
      title: 'Approve Resident?',
      text: `Are you sure you want to approve ${name}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#38a169',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Yes, approve!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const batch = writeBatch(db);
          batch.update(doc(db, 'residents', id), {
            status: 'Approved',
            approvedAt: serverTimestamp()
          });
          if (qrToken) {
            batch.update(doc(db, 'registration_status', qrToken), {
              status: 'Approved',
              updatedAt: serverTimestamp()
            });
          }
          await batch.commit();
          await logActivity({
            action: 'Resident Approved',
            targetType: 'Resident',
            targetId: id,
            description: `Approved registration for ${name}`
          });
          Swal.fire('Approved!', `${name} is now registered.`, 'success');
        } catch (error) {
          console.error("Error approving resident:", error);
          Swal.fire('Error!', 'There was an error approving the resident.', 'error');
        }
      }
    });
  };

  const handleReject = (id, name, qrToken) => {
    Swal.fire({
      title: 'Reject Resident?',
      text: `Are you sure you want to reject ${name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Yes, reject!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const batch = writeBatch(db);
          batch.update(doc(db, 'residents', id), {
            status: 'Rejected',
            rejectedAt: serverTimestamp()
          });
          if (qrToken) {
            batch.update(doc(db, 'registration_status', qrToken), {
              status: 'Rejected',
              updatedAt: serverTimestamp()
            });
          }
          await batch.commit();
          await logActivity({
            action: 'Resident Rejected',
            targetType: 'Resident',
            targetId: id,
            description: `Rejected registration for ${name}`
          });
          Swal.fire('Rejected!', `${name}'s registration has been rejected.`, 'success');
        } catch (error) {
          console.error("Error rejecting resident:", error);
          Swal.fire('Error!', 'There was an error rejecting the resident.', 'error');
        }
      }
    });
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'registered': return 'status-approved';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      case 'pending': return 'status-pending';
      default: return '';
    }
  };

  const filteredRequests = residentsList.filter(req => {
    if (activeTab === 'pending' && req.status !== 'Pending') return false;
    if (activeTab === 'rejected' && req.status !== 'Rejected') return false;

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
          <h1>Resident Approval</h1>
          <div className="header-right">
            <AdminHeaderRight />
          </div>
        </header>

        {/* Content Area */}
        <div className="document-request-container">
          <div className="doc-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div className="tab-navigation" style={{ display: 'flex', gap: '16px' }}>
              <button 
                onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  borderBottom: activeTab === 'pending' ? '2px solid #3182ce' : '2px solid transparent', 
                  color: activeTab === 'pending' ? '#3182ce' : '#718096', 
                  fontWeight: '600', 
                  padding: '8px 12px', 
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}>
                Pending Approvals
              </button>
              <button 
                onClick={() => { setActiveTab('rejected'); setCurrentPage(1); }}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  borderBottom: activeTab === 'rejected' ? '2px solid #e53e3e' : '2px solid transparent', 
                  color: activeTab === 'rejected' ? '#e53e3e' : '#718096', 
                  fontWeight: '600', 
                  padding: '8px 12px', 
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}>
                Rejected Applications
              </button>
            </div>
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
              icon={UserCheck} 
              title={activeTab === 'pending' ? "No Pending Approvals" : "No Rejected Applications"} 
              subtitle={searchQuery !== '' ? "No results match your current filters." : (activeTab === 'pending' ? "There are no pending registration approvals." : "There are no rejected applications.")}
            />
          ) : (
            <div className="doc-table-wrapper">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Resident Name</th>
                    <th>RES Number</th>
                    <th>Contact</th>
                    <th>Registered</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((req, index) => {
                    const isLocked = req.lockedUntilMs && req.lockedUntilMs > currentTime;
                    const wasLocked = req.lockedUntilMs && req.lockedUntilMs <= currentTime;
                    const remainingSecs = isLocked ? Math.ceil((req.lockedUntilMs - currentTime) / 1000) : 0;
                    
                    return (
                    <tr key={req.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {req.photoURL ? (
                            <img
                              src={req.photoURL}
                              alt={req.name}
                              style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #e2e8f0', flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.85rem', fontWeight: 700, color: '#718096' }}>
                              {req.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span>{req.name}</span>
                        </div>
                      </td>
                      <td>{req.resNumber || req.id}</td>
                      <td>{req.contactNumber}</td>
                      <td>{req.date}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-badge ${getStatusClass(req.status)}`}>
                          {req.status === 'Approved' ? 'Registered' : req.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          {req.status === 'Pending' && (
                             <>
                               <button onClick={() => handleApprove(req.id, req.name, req.qrToken)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title="Approve">
                                 <CheckCircle size={18} className="action-icon" color="#38a169" />
                               </button>
                               <button onClick={() => handleReject(req.id, req.name, req.qrToken)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title="Reject">
                                 <XCircle size={18} className="action-icon" color="#e53e3e" />
                               </button>
                             </>
                          )}
                          <Link to={`/admin/residents/${req.resNumber || req.id}`} state={{ from: 'approval' }} style={{ display: 'inline-flex', alignItems: 'center', color: '#3182ce' }} title="View">
                            <Eye size={22} className="action-icon" color="#3182ce" />
                          </Link>
                          
                          <button onClick={() => handleDeleteResident(req.id, req.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: 0 }} title="Delete">
                            <Trash2 size={18} className="action-icon" color="#e53e3e" />
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

