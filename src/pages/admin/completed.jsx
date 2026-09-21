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
  Bell,
  Search,
  Eye,
  Trash2,
  Mail,
  Info
} from 'lucide-react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../database/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';

import '../../lib/admin-layout.css';
import AdminHeaderRight from '../../components/AdminHeaderRight';
import Logo from '../../assets/logo/barangay buluan seal.png';
import AdminSidebar from '../../components/AdminSidebar';

import PaginationControl from '../../components/PaginationControl';
import EmptyState from '../../components/EmptyState';

export default function CompletedRequests() {
  useEffect(() => {
    document.title = "Admin | Completed";
  }, []);

  const [documentRequests, setDocumentRequests] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All Type Documents');
  const location = useLocation();
  const [activeDeliveryTab, setActiveDeliveryTab] = useState(location.state?.activeTab || 'Barangay Pick up');
  const [tabInitialized, setTabInitialized] = useState(!!location.state?.activeTab);

  const [seenOnlineRequests, setSeenOnlineRequests] = useState(() => {
    try { return JSON.parse(localStorage.getItem('seenOnlineRequests_Completed')) || []; }
    catch { return []; }
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();



  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const qReq = query(collection(db, 'requests'), orderBy('timestamp', 'desc'));
      const unsubReq = onSnapshot(qReq, (snapshot) => {
        const reqs = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data.status === 'Completed') {
            let formattedDate = 'N/A';
            if (data.timestamp) {
              const date = data.timestamp.toDate();
              formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            }
            reqs.push({
              id: docSnap.id,
              name: data.fullName || data.name || 'N/A',
              type: data.type || 'Unknown',
              date: formattedDate,
              status: data.status,
              deliveryMethod: data.deliveryMethod || 'N/A',
              rawTimestamp: data.timestamp || null,
              pdfDownloaded: data.pdfDownloaded || false,
              isResident: false
            });
          }
        });
        setDocumentRequests(reqs);
        setLoading(false);
        
        // Auto-select the correct tab if not already set by navigation state
        setTabInitialized(prev => {
          if (!prev) {
            const hasBarangay = reqs.some(r => r.deliveryMethod === 'Barangay Pickup');
            const hasOnline = reqs.some(r => r.deliveryMethod === 'Online PDF');
            if (!hasBarangay && hasOnline) {
              setActiveDeliveryTab('Online Pick up');
            } else if (hasBarangay) {
              setActiveDeliveryTab('Barangay Pick up');
            }
            return true;
          }
          return prev;
        });
      }, (error) => {
        console.error("Error fetching admin completed requests:", error);
        setLoading(false);
      });

      return () => unsubReq();
    });

    return () => unsubscribeAuth();
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

  const handleDeleteClick = (id) => {
    Swal.fire({
      title: 'Confirm Delete',
      text: 'Are you sure you want to delete this data permanently? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Delete'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const reqItem = documentRequests.find(r => r.id === id);
          if (reqItem) {
            await deleteDoc(doc(db, 'requests', id));
          }

          if (reqItem) {
            const notifRef = doc(collection(db, "notifications"));
            await setDoc(notifRef, {
              requestId: id,
              userId: reqItem.userId || "",
              type: "DELETED",
              documentType: reqItem.type || "Unknown",
              residentName: reqItem.name || "Unknown",
              timestamp: serverTimestamp(),
            });
          }
          Swal.fire({
            title: 'Deleted Successfully',
            text: 'The request data has been permanently removed.',
            icon: 'success'
          });
        } catch (error) {
          console.error('Error deleting document:', error);
        }
      }
    });
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'completed': return 'status-approved'; // use same as approved or create new? Let's map to approved class for now to be green
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  };

  const filteredRequests = documentRequests.filter(req => {
    const matchesTab = (activeDeliveryTab === 'Barangay Pick up' && req.deliveryMethod === 'Barangay Pickup') || 
                       (activeDeliveryTab === 'Online Pick up' && req.deliveryMethod === 'Online PDF');
    if (filterType === 'All Type Documents') {
      return matchesTab && (!searchQuery || (req.id && req.id.toLowerCase().includes(searchQuery.toLowerCase())) || (req.name && req.name.toLowerCase().includes(searchQuery.toLowerCase())));
    }
    const matchesType = req.type === filterType || (filterType === 'Business Permit' && req.type === 'Business Clearance');
    const matchesSearch = !searchQuery || (req.id && req.id.toLowerCase().includes(searchQuery.toLowerCase())) || (req.name && req.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesType && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage));
  const currentItems = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const hasOnlineRequests = documentRequests.some(req => req.deliveryMethod === 'Online PDF' && !seenOnlineRequests.includes(req.id));

  const handleOnlineTabClick = () => {
    setActiveDeliveryTab('Online Pick up');
    setCurrentPage(1);
    const onlineIds = documentRequests.filter(req => req.deliveryMethod === 'Online PDF').map(req => req.id);
    if (onlineIds.length > 0) {
      const newSeen = Array.from(new Set([...seenOnlineRequests, ...onlineIds]));
      setSeenOnlineRequests(newSeen);
      localStorage.setItem('seenOnlineRequests_Completed', JSON.stringify(newSeen));
    }
  };

  return (
    <div className="admin-dashboard-container">
      {/* Custom Logout Confirmation Modal removed in favor of SweetAlert2 */}

      {/* Delete Confirmation Modal removed in favor of SweetAlert2 */}
      {/* Delete Success Modal removed in favor of SweetAlert2 */}

      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <h1>Completed</h1>
          <div className="header-right">
            <AdminHeaderRight />
          </div>
        </header>

        {/* Content Area */}
        <div className="document-request-container">
          {/* Delivery Method Tabs Navigation */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', gap: '30px' }}>
            <button 
              onClick={() => { setActiveDeliveryTab('Barangay Pick up'); setCurrentPage(1); }}
              style={{
                background: 'none', border: 'none', padding: '10px 5px', fontSize: '1rem', fontWeight: activeDeliveryTab === 'Barangay Pick up' ? '600' : '500', 
                color: activeDeliveryTab === 'Barangay Pick up' ? '#2b6cb0' : '#4a5568', cursor: 'pointer',
                borderBottom: activeDeliveryTab === 'Barangay Pick up' ? '3px solid #3182ce' : '3px solid transparent'
              }}
            >
              Barangay Pick up
            </button>
            <button 
              onClick={handleOnlineTabClick}
              style={{
                position: 'relative',
                background: 'none', border: 'none', padding: '10px 5px', fontSize: '1rem', fontWeight: activeDeliveryTab === 'Online Pick up' ? '600' : '500', 
                color: activeDeliveryTab === 'Online Pick up' ? '#2b6cb0' : '#4a5568', cursor: 'pointer',
                borderBottom: activeDeliveryTab === 'Online Pick up' ? '3px solid #3182ce' : '3px solid transparent'
              }}
            >
              Online Pick up
              {hasOnlineRequests && activeDeliveryTab !== 'Online Pick up' && (
                <span style={{
                  position: 'absolute', top: '5px', right: '-12px', width: '10px', height: '10px', 
                  backgroundColor: '#e53e3e', borderRadius: '50%', boxShadow: '0 0 0 2px white'
                }}></span>
              )}
            </button>
          </div>


          <div className="doc-controls" style={{ flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div className="doc-dropdown">
                <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}>
                  <option>All Type Documents</option>

                  <option>Barangay Clearance</option>
                  <option>Certificate of Residency</option>
                  <option>Business Permit</option>
                  <option>Certificate of Indigency</option>
                </select>
              </div>

              {activeDeliveryTab === 'Online Pick up' && (
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  backgroundColor: '#f0fff4', 
                  border: '1px solid #c6f6d5', 
                  borderRadius: '6px', 
                  padding: '9px 14px', 
                  color: '#276749', 
                  fontSize: '0.85rem', 
                  fontWeight: '500',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}>
                  <Info size={16} color="#38a169" style={{ flexShrink: 0 }} />
                  <span><strong>Note:</strong> Once the resident downloads the PDF, the Request ID will turn green as proof of claim.</span>
                </div>
              )}
            </div>
            
            <div className="doc-search" style={{ border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: 'white', padding: '0 16px', width: '300px', display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#4a5568', fontWeight: '500', fontSize: '0.95rem' }}>BLN-</span>
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
              icon={CheckCircle} 
              title="No Completed Requests Found" 
              subtitle={(searchQuery !== '' || filterType !== 'All Type Documents') ? "No results match your current filters." : "Completed requests will appear here."}
            />
          ) : (
            <div className="doc-table-wrapper">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Request ID</th>
                    <th>Resident</th>
                    <th>Document Type</th>
                    <th>Payment Method</th>
                    <th>Date Requested</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((req, index) => (
                    <tr key={req.id}>
                      <td style={{ 
                        color: (req.deliveryMethod === 'Barangay Pickup' || (req.deliveryMethod === 'Online PDF' && req.pdfDownloaded)) ? '#38a169' : 'inherit', 
                        fontWeight: (req.deliveryMethod === 'Barangay Pickup' || (req.deliveryMethod === 'Online PDF' && req.pdfDownloaded)) ? 'bold' : 'normal' 
                      }}>
                        {req.id}
                      </td>
                      <td>{req.name}</td>
                      <td>{req.type}</td>
                      <td>
                        {req.deliveryMethod !== 'N/A' ? (
                          <span style={{ 
                            display: 'inline-block', padding: '4px 10px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600',
                            backgroundColor: req.deliveryMethod === 'Barangay Pickup' ? '#ebf8ff' : '#faf5ff',
                            color: req.deliveryMethod === 'Barangay Pickup' ? '#3182ce' : '#805ad5',
                            border: req.deliveryMethod === 'Barangay Pickup' ? '1px solid #bee3f8' : '1px solid #e9d8fd'
                          }}>
                            {req.deliveryMethod === 'Barangay Pickup' ? 'Barangay Pick up' : 'Online Pick up'}
                          </span>
                        ) : (
                          <span style={{ color: '#a0aec0' }}>N/A</span>
                        )}
                      </td>
                      <td>{req.date}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-badge ${getStatusClass(req.status)}`}>
                          {req.status === 'Completed' ? 'Paid' : req.status}
                        </span>
                      </td>
                      <td>
                        <Link to={`/admin/document-requests/${req.id}`} state={{ from: '/admin/completed', activeTab: activeDeliveryTab }} style={{ display: 'inline-flex', alignItems: 'center', color: '#3182ce' }} title="View">
                          <Eye size={18} className="action-icon" color="#3182ce" />
                        </Link>
                        <span title="Delete" onClick={() => handleDeleteClick(req.id)} style={{ marginLeft: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', color: '#e53e3e' }}>
                          <Trash2 size={18} className="action-icon" color="#e53e3e" />
                        </span>
                      </td>
                    </tr>
                  ))}
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

