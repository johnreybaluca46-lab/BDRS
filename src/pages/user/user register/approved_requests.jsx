import React, { useEffect, useState } from 'react';
import SkeletonCardGrid from '../../../components/SkeletonCardGrid';
import { useLocation } from 'react-router-dom';
import ResidentSidebar from '../../../components/ResidentSidebar';
import ResidentProfileDropdown from '../../../components/ResidentProfileDropdown';
import ResidentNotificationBell from '../../../components/ResidentNotificationBell';
import RequestDetailsModal from '../../../components/RequestDetailsModal';
import '../../../lib/admin-layout.css';
import '../../../lib/my-requests.css';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../../database/firebase';
import { Eye, Clock, CheckCircle, Hourglass, FileText, Home, Store, FileCheck, CheckSquare } from 'lucide-react';

export default function ApprovedRequests() {
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

  useEffect(() => {
    document.title = "Resident | Approved Requests";
    
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'requests'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const reqs = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          dateRequested: doc.data().timestamp?.seconds 
            ? new Date(doc.data().timestamp.seconds * 1000)
            : new Date()
        }))
        .filter(req => req.status?.toLowerCase() === 'approved');
      
      reqs.sort((a, b) => b.dateRequested - a.dateRequested);
      setRequests(reqs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching requests:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getThemeByStatus = (status) => 'theme-approved';

  const getIconByType = (type) => {
    if (type?.toLowerCase().includes('indigency')) return <FileCheck size={32} />;
    if (type?.toLowerCase().includes('residency')) return <Home size={32} />;
    if (type?.toLowerCase().includes('business')) return <Store size={32} />;
    return <FileText size={32} />;
  };

  const getBannerMessage = (req) => {
    if (req.deliveryMethod === 'Online Pick up' || req.deliveryMethod === 'Online PDF') {
      return { 
        title: 'Your document is approved for online processing.', 
        desc: 'Please click View Details to proceed with your online payment.' 
      };
    }
    return { title: 'Your documents is ready come and visit at barangay hall.', desc: 'Please bring your polling number to claim the document.' };
  };

  const isNew = (approvedAt) => {
    if (!approvedAt) return false;
    const date = approvedAt.toDate ? approvedAt.toDate() : new Date(approvedAt.seconds * 1000);
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
            <h1>Approved Requests</h1>
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
                {!seenTabs.has('All') && requests.some(req => isNew(req.approvedAt)) && <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', backgroundColor: '#e53e3e', borderRadius: '50%' }}></span>}
              </button>
              <button 
                onClick={() => setDeliveryTab('Barangay Pick up')} 
                style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', color: deliveryTab === 'Barangay Pick up' ? '#3182ce' : '#718096', borderBottom: deliveryTab === 'Barangay Pick up' ? '3px solid #3182ce' : 'none', position: 'relative' }}>
                Barangay Pick up
                {!seenTabs.has('Barangay Pick up') && requests.some(req => isNew(req.approvedAt) && (!req.deliveryMethod || req.deliveryMethod === 'Barangay Pick up' || req.deliveryMethod === 'Barangay Pickup')) && <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', backgroundColor: '#e53e3e', borderRadius: '50%' }}></span>}
              </button>
              <button 
                onClick={() => setDeliveryTab('Online Pick up')} 
                style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', color: deliveryTab === 'Online Pick up' ? '#3182ce' : '#718096', borderBottom: deliveryTab === 'Online Pick up' ? '3px solid #3182ce' : 'none', position: 'relative' }}>
                Online Pick up
                {!seenTabs.has('Online Pick up') && requests.some(req => isNew(req.approvedAt) && (req.deliveryMethod === 'Online Pick up' || req.deliveryMethod === 'Online PDF')) && <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', backgroundColor: '#e53e3e', borderRadius: '50%' }}></span>}
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
              <CheckSquare size={48} />
              <h3>No Approved Requests</h3>
              <p>You don't have any approved document requests at the moment.</p>
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
                  {isNew(request.approvedAt) && <div className="new-request-badge">New</div>}
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
                          <CheckCircle size={14} /> Approved
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
                      <div className="approved-message-box">
                        <strong>
                          {request.deliveryMethod === 'Online Pick up' || request.deliveryMethod === 'Online PDF'
                            ? 'Your request is approved. Please proceed to payment.'
                            : 'Your documents is ready. Come and visit at barangay hall.'}
                        </strong>
                        <br/>
                        Expires on: {request.approvedAt ? new Date(request.approvedAt.seconds * 1000 + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'}
                      </div>
                    </div>
                  </div>
                  <div className="request-banner">
                    <div className="request-banner-text">
                      <h4>{getBannerMessage(request).title}</h4>
                      <p>{getBannerMessage(request).desc}</p>
                    </div>
                    <button 
                      className="btn-view-details"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <Eye size={14} /> View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedRequest && (
            <RequestDetailsModal 
              request={selectedRequest} 
              onClose={() => setSelectedRequest(null)} 
            />
          )}
        </div>
      </main>
    </div>
  );
}