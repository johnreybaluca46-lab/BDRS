import React, { useEffect, useState } from 'react';
import SkeletonCardGrid from '../../../components/SkeletonCardGrid';
import { useLocation } from 'react-router-dom';
import ResidentSidebar from '../../../components/ResidentSidebar';
import ResidentProfileDropdown from '../../../components/ResidentProfileDropdown';
import ResidentNotificationBell from '../../../components/ResidentNotificationBell';
import RequestDetailsModal from '../../../components/RequestDetailsModal';
import '../../../lib/admin-layout.css';
import '../../../lib/my-requests.css';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../database/firebase';
import Swal from 'sweetalert2';
import { Eye, Clock, CheckCircle, Hourglass, FileText, Home, Store, FileCheck, CheckCircle2, Trash2, Download } from 'lucide-react';
import NetworkCheckModal from '../../../components/NetworkCheckModal';

export default function CompletedRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterType, setFilterType] = useState('All Type Documents');
  const [deliveryTab, setDeliveryTab] = useState('All');
  const [seenTabs, setSeenTabs] = useState(new Set(['All']));

  useEffect(() => {
    setSeenTabs(prev => new Set(prev).add(deliveryTab));
  }, [deliveryTab]);
  const [flashingCardId, setFlashingCardId] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const highlight = params.get('highlight');
    if (highlight) {
      setFlashingCardId(highlight);
      setTimeout(() => {
        const el = document.getElementById(`request-card-${highlight}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      const timer = setTimeout(() => {
        setFlashingCardId(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [location.search, requests]);

  const [autoDownloadRequest, setAutoDownloadRequest] = useState(null);
  const [pendingDownloadReq, setPendingDownloadReq] = useState(null);

  useEffect(() => {
    document.title = "Resident | Completed Requests";
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const q = query(
        collection(db, 'requests'),
        where('userId', '==', user.uid)
      );

      const unsubscribeSnapshot = onSnapshot(q, (querySnapshot) => {
        const reqs = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            dateRequested: doc.data().timestamp?.seconds 
              ? new Date(doc.data().timestamp.seconds * 1000)
              : new Date()
          }))
          .filter(req => req.status?.toLowerCase() === 'completed' && !req.hiddenByUser);
        
        reqs.sort((a, b) => b.dateRequested - a.dateRequested);
        setRequests(reqs);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching requests:", error);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, []);

  const getThemeByStatus = (status) => 'theme-completed';

  const getIconByType = (type) => {
    if (type?.toLowerCase().includes('indigency')) return <FileCheck size={32} />;
    if (type?.toLowerCase().includes('residency')) return <Home size={32} />;
    if (type?.toLowerCase().includes('business')) return <Store size={32} />;
    return <FileText size={32} />;
  };

  const getBannerMessage = (request) => {
    if (request?.deliveryMethod === 'Online PDF') {
      return { title: 'Paid Successfully', desc: 'Thank you for your payment. Your PDF is ready inside View Details.' };
    }
    return { title: 'Paid Successfully', desc: 'Thank you for your payment. Your transaction is complete.' };
  };

  const handleHide = async (id) => {
    const result = await Swal.fire({
      title: 'Remove Completed Request?',
      text: 'Are you sure you want to remove this request from your view?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#e53e3e',
      cancelButtonColor: '#a0aec0',
      confirmButtonText: 'Yes, remove it!'
    });

    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, 'requests', id), { hiddenByUser: true });
        Swal.fire('Removed!', 'The request has been removed from your view.', 'success');
        setRequests(prev => prev.filter(req => req.id !== id));
      } catch (error) {
        console.error('Error hiding document:', error);
        Swal.fire('Error', 'Failed to hide the request.', 'error');
      }
    }
  };

  const isNew = (timestamp) => {
    if (!timestamp) return false;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const tenMinsInMs = 10 * 60 * 1000;
    return diffInMs < tenMinsInMs;
  };

  return (
      <div className="admin-dashboard-container">
        <ResidentSidebar />
  
        <main className="admin-main">
          <header className="admin-header resident-header">
            <h1>Completed Requests</h1>
            <div className="header-right">
              <ResidentNotificationBell />
              <ResidentProfileDropdown />
            </div>
          </header>
  
          <div className="dashboard-content">
    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
            <div className="delivery-tabs-container" style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <button 
                onClick={() => setDeliveryTab('All')} 
                style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', color: deliveryTab === 'All' ? '#3182ce' : '#718096', borderBottom: deliveryTab === 'All' ? '3px solid #3182ce' : 'none', position: 'relative' }}>
                All
                {!seenTabs.has('All') && requests.some(req => isNew(req.completedAt || req.dateRequested)) && <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', backgroundColor: '#e53e3e', borderRadius: '50%' }}></span>}
              </button>
              <button 
                onClick={() => setDeliveryTab('Barangay Pick up')} 
                style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', color: deliveryTab === 'Barangay Pick up' ? '#3182ce' : '#718096', borderBottom: deliveryTab === 'Barangay Pick up' ? '3px solid #3182ce' : 'none', position: 'relative' }}>
                Barangay Pick up
                {!seenTabs.has('Barangay Pick up') && requests.some(req => isNew(req.completedAt || req.dateRequested) && (!req.deliveryMethod || req.deliveryMethod === 'Barangay Pick up' || req.deliveryMethod === 'Barangay Pickup')) && <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', backgroundColor: '#e53e3e', borderRadius: '50%' }}></span>}
              </button>
              <button 
                onClick={() => setDeliveryTab('Online Pick up')} 
                style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', color: deliveryTab === 'Online Pick up' ? '#3182ce' : '#718096', borderBottom: deliveryTab === 'Online Pick up' ? '3px solid #3182ce' : 'none', position: 'relative' }}>
                Online Pick up
                {!seenTabs.has('Online Pick up') && requests.some(req => isNew(req.completedAt || req.dateRequested) && (req.deliveryMethod === 'Online Pick up' || req.deliveryMethod === 'Online PDF')) && <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', backgroundColor: '#e53e3e', borderRadius: '50%' }}></span>}
              </button>
            </div>
            <div>
            <select 
              className="form-select"
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              style={{ minWidth: '200px' }}
            >
              <option value="All Type Documents">All Type Documents</option>
              <option value="Barangay Clearance">Barangay Clearance</option>
              <option value="Business Permit">Business Permit</option>
              <option value="Certificate of Indigency">Certificate of Indigency</option>
              <option value="Certificate of Residency">Certificate of Residency</option>
            </select>
            </div>
          </div>

          {loading ? <SkeletonCardGrid /> : requests.length === 0 ? (
            <div className="empty-requests">
              <CheckCircle2 size={48} />
              <h3>No Completed Requests</h3>
              <p>You don't have any completed document requests at the moment.</p>
            </div>
          ) : (
            <div className="my-requests-grid">
              {requests.filter(req => {
                const matchType = filterType === 'All Type Documents' || req.type === filterType || (filterType === 'Business Permit' && req.type === 'Business Clearance');
                const normMethod = (req.deliveryMethod === 'Online PDF' || req.deliveryMethod === 'Online Pick up') ? 'Online Pick up' : 'Barangay Pick up';
                const matchTab = deliveryTab === 'All' || normMethod === deliveryTab;
                return matchType && matchTab;
              }).map(request => (
                <div 
                  id={`request-card-${request.id}`}
                  key={request.id} 
                  className={`request-card ${getThemeByStatus(request.status)} ${flashingCardId === request.id ? 'flashing-blue' : ''}`}
                >
                  {isNew(request.completedAt || request.dateRequested) && <div className="new-request-badge">New</div>}
                  <div className="request-card-content">
                    <div className="request-icon-container">
                      {getIconByType(request.type)}
                    </div>
                    <div className="request-details">
                      <div className="request-header-row">
                        <div>
                          <h3 className="request-title">{request.type}</h3>
                          <p className="request-id">Request #{request.id}</p>
                        </div>
                        <div className="request-status-badge">
                          <CheckCircle size={14} /> Paid
                        </div>
                      </div>
                      <div className="request-meta">
                        <div className="request-meta-item">
                          <Clock size={14} /> Requested on: {request.dateRequested.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="request-meta-item">
                          <FileText size={14} /> For: {request.purpose || 'Not specified'}
                        </div>
                        <div className="request-meta-item">
                          <span style={{fontWeight: 600, marginLeft: '4px'}}>Method:</span> <span style={{marginLeft: '4px'}}>{request.deliveryMethod === 'Barangay Pickup' ? 'Barangay Pick up' : (request.deliveryMethod === 'Online PDF' ? 'Online Pick up' : (request.deliveryMethod || 'Not specified'))}</span>
                        </div>
                      </div>
                      <div className="completed-message-box">
                        <strong>Paid Successfully</strong>
                        {request.deliveryMethod === 'Online PDF' 
                          ? 'Your PDF is ready inside at the view details.' 
                          : 'Transaction complete.'}
                      </div>
                    </div>
                  </div>
                  <div className="request-banner">
                    <div className="request-banner-text">
                      <h4>{getBannerMessage(request).title}</h4>
                      <p>{getBannerMessage(request).desc}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {request.deliveryMethod === 'Online PDF' && !request.pdfDownloaded && (
                        <button 
                          className="btn-view-details"
                          style={{ color: '#3182ce', borderColor: '#3182ce', padding: '8px 12px' }}
                          onClick={() => setPendingDownloadReq(request)}
                          title="Download PDF"
                        >
                          <Download size={16} />
                        </button>
                      )}
                      <button 
                        className="btn-view-details"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <Eye size={14} /> View Details
                      </button>
                      <button 
                        className="btn-view-details"
                        style={{ color: '#e53e3e', borderColor: '#e53e3e', padding: '8px 12px' }}
                        onClick={() => handleHide(request.id)}
                        title="Remove Request"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      

      {autoDownloadRequest && (
        <div style={{ display: 'none' }}>
          <RequestDetailsModal 
            request={{ ...autoDownloadRequest, autoDownload: true }} 
            onClose={() => setAutoDownloadRequest(null)} 
          />
        </div>
      )}

      <NetworkCheckModal 
        isOpen={!!pendingDownloadReq} 
        onClose={() => setPendingDownloadReq(null)} 
        onProceed={() => {
          setAutoDownloadRequest(pendingDownloadReq);
        }}
      />

      {selectedRequest && (
        <RequestDetailsModal 
          request={selectedRequest} 
          onClose={() => setSelectedRequest(null)} 
        />
      )}
      </main>
    </div>
  );
}