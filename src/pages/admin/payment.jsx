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
  CreditCard
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../database/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';

import '../../lib/admin-layout.css';
import AdminHeaderRight from '../../components/AdminHeaderRight';
import Logo from '../../assets/logo/barangay buluan seal.png';
import AdminSidebar from '../../components/AdminSidebar';



import PaginationControl from '../../components/PaginationControl';
import EmptyState from '../../components/EmptyState';

export default function AdminPayment() {
  useEffect(() => {
    document.title = "Admin | Approval Requests";
  }, []);

  const [documentRequests, setDocumentRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All Type Documents');
  const location = useLocation();
  const [activeDeliveryTab, setActiveDeliveryTab] = useState(location.state?.activeTab || 'Barangay Pick up');

  const [seenOnlineRequests, setSeenOnlineRequests] = useState(() => {
    try { return JSON.parse(localStorage.getItem('seenOnlineRequests_Payment')) || []; }
    catch { return []; }
  });
  const [itemsPerPage, setItemsPerPage] = useState(10);
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
        
        // Only show Approved and Processing Payment requests
        if (status === 'Approved' || status === 'Processing Payment') {
          let isExpired = false;
          
          if (data.approvedAt) {
            const approvedDate = data.approvedAt.toDate ? data.approvedAt.toDate() : new Date(data.approvedAt.seconds * 1000);
            const expiryDate = new Date(approvedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            if (new Date() > expiryDate) {
              isExpired = true;
              
              // Automatically move to trash if expired
              updateDoc(doc(db, 'requests', docSnap.id), { status: 'Trash', expired: true, expiredAt: serverTimestamp(), trashedAt: serverTimestamp() }).catch(console.error);
              
              const notifRef = doc(collection(db, "notifications"));
              setDoc(notifRef, {
                requestId: docSnap.id,
                userId: data.userId || "",
                type: "TRASHED_EXPIRED",
                documentType: data.type || "Unknown",
                residentName: data.name || data.fullName || "Unknown",
                timestamp: serverTimestamp(),
              }).catch(console.error);
            }
          }
          
          if (!isExpired) {
            reqs.push({
              id: docSnap.id,
              name: data.fullName || data.name || 'N/A',
              type: data.type || 'Unknown',
              date: formattedDate,
              status: status,
              deliveryMethod: data.deliveryMethod || 'N/A',
              rawTimestamp: data.timestamp || null
            });
          }
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

  const handleVerifyPayment = async (requestId) => {
    Swal.fire({
      title: 'Verify Payment',
      text: 'Are you sure you want to verify this payment and mark the request as completed?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#38a169',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Yes, Verify'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const requestData = documentRequests.find(r => r.id === requestId);
          const updates = {
            status: 'Completed',
            completedAt: serverTimestamp()
          };
          if (requestData && !requestData.verificationToken) {
            updates.verificationToken = crypto.randomUUID();
          }
          await updateDoc(doc(db, 'requests', requestId), updates);
          Swal.fire('Verified!', 'The payment has been verified and request is completed.', 'success');
        } catch (error) {
          console.error("Error verifying payment:", error);
          Swal.fire('Error', 'Failed to verify payment.', 'error');
        }
      }
    });
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'processing payment': return 'status-processing-payment';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  };

  const filteredRequests = documentRequests.filter(req => {
    let matchesTab = false;
    if (activeDeliveryTab === 'Barangay Pick up') {
      matchesTab = req.deliveryMethod === 'Barangay Pickup';
    } else if (activeDeliveryTab === 'Online Pick up: waiting') {
      matchesTab = req.deliveryMethod === 'Online PDF' && req.status === 'Approved';
    } else if (activeDeliveryTab === 'Online Pick up: processing') {
      matchesTab = req.deliveryMethod === 'Online PDF' && req.status === 'Processing Payment';
    } else if (activeDeliveryTab === 'Online Pick up') {
      matchesTab = req.deliveryMethod === 'Online PDF';
    }
    const matchesType = filterType === 'All Type Documents' || req.type === filterType || (filterType === 'Business Permit' && req.type === 'Business Clearance');
    const matchesSearch = !searchQuery || (req.id && req.id.toLowerCase().includes(searchQuery.toLowerCase())) || (req.name && req.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesType && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage));
  const currentItems = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const hasWaitingOnlineRequests = documentRequests.some(req => req.deliveryMethod === 'Online PDF' && req.status === 'Approved' && !seenOnlineRequests.includes(req.id));
  const hasProcessingOnlineRequests = documentRequests.some(req => req.deliveryMethod === 'Online PDF' && req.status === 'Processing Payment' && !seenOnlineRequests.includes(req.id));

  const handleOnlineTabClick = (tabName) => {
    setActiveDeliveryTab(tabName);
    setCurrentPage(1);
    const onlineIds = documentRequests.filter(req => req.deliveryMethod === 'Online PDF' && (tabName === 'Online Pick up: waiting' ? req.status === 'Approved' : req.status === 'Processing Payment')).map(req => req.id);
    if (onlineIds.length > 0) {
      const newSeen = Array.from(new Set([...seenOnlineRequests, ...onlineIds]));
      setSeenOnlineRequests(newSeen);
      localStorage.setItem('seenOnlineRequests_Payment', JSON.stringify(newSeen));
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
          <h1>Payment Processing</h1>
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
              onClick={() => handleOnlineTabClick('Online Pick up: waiting')}
              style={{
                position: 'relative',
                background: 'none', border: 'none', padding: '10px 5px', fontSize: '1rem', fontWeight: activeDeliveryTab === 'Online Pick up: waiting' ? '600' : '500', 
                color: activeDeliveryTab === 'Online Pick up: waiting' ? '#2b6cb0' : '#4a5568', cursor: 'pointer',
                borderBottom: activeDeliveryTab === 'Online Pick up: waiting' ? '3px solid #3182ce' : '3px solid transparent'
              }}
            >
              Online Pick up: waiting
              {hasWaitingOnlineRequests && <span className="notification-dot" style={{position: 'absolute', top: '5px', right: '-10px', background: '#e53e3e', width: '8px', height: '8px', borderRadius: '50%'}}></span>}
            </button>
            <button 
              onClick={() => handleOnlineTabClick('Online Pick up: processing')}
              style={{
                position: 'relative',
                background: 'none', border: 'none', padding: '10px 5px', fontSize: '1rem', fontWeight: activeDeliveryTab === 'Online Pick up: processing' ? '600' : '500', 
                color: activeDeliveryTab === 'Online Pick up: processing' ? '#2b6cb0' : '#4a5568', cursor: 'pointer',
                borderBottom: activeDeliveryTab === 'Online Pick up: processing' ? '3px solid #3182ce' : '3px solid transparent'
              }}
            >
              Online Pick up: processing
              {hasProcessingOnlineRequests && <span className="notification-dot" style={{position: 'absolute', top: '5px', right: '-10px', background: '#e53e3e', width: '8px', height: '8px', borderRadius: '50%'}}></span>}
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
              icon={CreditCard} 
              title="No Payment Records Found" 
              subtitle={(searchQuery !== '' || filterType !== 'All Type Documents') ? "No results match your current filters." : "No payment transactions have been recorded yet."}
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
                    <th style={{ textAlign: 'center' }}>Actions</th>
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
                        <span className={`status-badge ${req.deliveryMethod === 'Barangay Pickup' && req.status === 'Processing Payment' ? 'status-approved' : getStatusClass(req.status)}`} style={(req.status === 'Processing Payment' && req.deliveryMethod !== 'Barangay Pickup') ? { backgroundColor: '#ebf8ff', color: '#2b6cb0', border: '1px solid #bee3f8' } : {}}>
                          {req.status === 'Approved' ? 'Waiting' : req.deliveryMethod === 'Barangay Pickup' && req.status === 'Processing Payment' ? 'Waiting' : req.status === 'Processing Payment' ? 'Processing' : req.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                          <Link to={`/admin/document-requests/${req.id}`} state={{ from: '/admin/payment', activeTab: activeDeliveryTab }} style={{ display: 'inline-flex', alignItems: 'center', color: '#3182ce' }} title="View">
                            <Eye size={18} className="action-icon" color="#3182ce" />
                          </Link>
                          {req.status === 'Processing Payment' && req.deliveryMethod !== 'Barangay Pickup' && (
                            <button 
                              onClick={() => handleVerifyPayment(req.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: 0 }}
                              title="Verify Payment"
                            >
                              <CheckCircle size={18} color="#38a169" />
                            </button>
                          )}
                        </div>
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

