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
  Clock,
  Mail,
  Inbox
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../database/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';

import '../../lib/admin-layout.css';
import AdminHeaderRight from '../../components/AdminHeaderRight';
import Logo from '../../assets/logo/barangay buluan seal.png';
import AdminSidebar from '../../components/AdminSidebar';



import PaginationControl from '../../components/PaginationControl';
import EmptyState from '../../components/EmptyState';

export default function DocumentRequest() {
  useEffect(() => {
    document.title = "Admin | Document Requests";
  }, []);

  const [documentRequests, setDocumentRequests] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All Type Documents');
  const location = useLocation();
  const [activeDeliveryTab, setActiveDeliveryTab] = useState(location.state?.activeTab || 'Barangay Pick up');

  const [seenOnlineRequests, setSeenOnlineRequests] = useState(() => {
    try { return JSON.parse(localStorage.getItem('seenOnlineRequests_DocRequests')) || []; }
    catch { return []; }
  });
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const q = collection(db, 'requests');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = [];

      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const status = data.status || 'Pending';
        
        let formattedDate = 'N/A';
        if (data.timestamp) {
          const date = data.timestamp.toDate();
          formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
        
        // Filter out completed, approved, trashed, rejected, and processing payment requests
        if (status !== 'Completed' && status !== 'Approved' && status !== 'Trash' && status !== 'Rejected' && status !== 'Processing Payment') {
          reqs.push({
            id: docSnap.id,
            name: data.fullName || data.name || 'N/A',
            type: data.type || 'Unknown',
            date: formattedDate,
            status: status === 'Processing' ? 'Pending' : status,
            deliveryMethod: data.deliveryMethod || 'N/A',
            rawTimestamp: data.timestamp || null
          });
        }
      });
      
      reqs.sort((a, b) => {
        const timeA = a.rawTimestamp && a.rawTimestamp.toMillis ? a.rawTimestamp.toMillis() : (a.rawTimestamp && a.rawTimestamp.seconds ? a.rawTimestamp.seconds * 1000 : 0);
        const timeB = b.rawTimestamp && b.rawTimestamp.toMillis ? b.rawTimestamp.toMillis() : (b.rawTimestamp && b.rawTimestamp.seconds ? b.rawTimestamp.seconds * 1000 : 0);
        return timeB - timeA; // Descending
      });
      
      setDocumentRequests(reqs);
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

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  };

  const filteredRequests = documentRequests.filter(req => {
    const matchesTab = (activeDeliveryTab === 'Barangay Pick up' && req.deliveryMethod === 'Barangay Pickup') || 
                       (activeDeliveryTab === 'Online Pick up' && req.deliveryMethod === 'Online PDF');
    const matchesType = filterType === 'All Type Documents' || req.type === filterType || (filterType === 'Business Permit' && req.type === 'Business Clearance');
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
      localStorage.setItem('seenOnlineRequests_DocRequests', JSON.stringify(newSeen));
    }
  };

  return (
    <div className="admin-dashboard-container">
      {/* Custom Logout Confirmation Modal removed in favor of SweetAlert2 */}

      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="admin-main">
        {/* Header */}
        <header className="admin-header">
          <h1>Document Request</h1>
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

          <div className="doc-controls">
            <div className="doc-dropdown">
              <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}>
                <option>All Type Documents</option>
                <option>Barangay Clearance</option>
                <option>Certificate of Residency</option>
                <option>Business Permit</option>
                <option>Certificate of Indigency</option>
              </select>
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
              icon={Inbox} 
              title="No Document Requests Found" 
              subtitle={(searchQuery !== '' || filterType !== 'All Type Documents') ? "No results match your current filters." : "There are no document requests to display."}
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
                      <td>{req.id}</td>
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
                          {req.status}
                        </span>
                      </td>
                      <td>
                          <Link to={`/admin/document-requests/${req.id}`} state={{ activeTab: activeDeliveryTab }} style={{ display: 'inline-flex', alignItems: 'center', color: '#3182ce' }} title="View">
                          <Eye size={18} className="action-icon" color="#3182ce" />
                        </Link>
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

