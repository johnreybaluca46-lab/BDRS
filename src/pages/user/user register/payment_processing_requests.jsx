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
import { Eye, Clock, CheckCircle, FileText, Home, Store, FileCheck, CreditCard } from 'lucide-react';

export default function OnlinePaymentRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filterType, setFilterType] = useState('All Type Documents');
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
    document.title = "Resident | Online Payment";
    
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
        .filter(req => req.status?.toLowerCase() === 'processing payment');
      
      reqs.sort((a, b) => b.dateRequested - a.dateRequested);
      setRequests(reqs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching requests:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getThemeByStatus = (status) => 'theme-processing';

  const getIconByType = (type) => {
    if (type?.toLowerCase().includes('indigency')) return <FileCheck size={32} />;
    if (type?.toLowerCase().includes('residency')) return <Home size={32} />;
    if (type?.toLowerCase().includes('business')) return <Store size={32} />;
    return <FileText size={32} />;
  };

  const getBannerMessage = () => {
    return { title: 'Your payment is being verified.', desc: 'Please wait while the administrator verifies your payment proof.' };
  };

  const isNew = (timestamp) => {
    if (!timestamp) return false;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
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
            <h1>Online Payment</h1>
            <div className="header-right">
              <ResidentNotificationBell />
              <ResidentProfileDropdown />
            </div>
          </header>
  
          <div className="dashboard-content">
    
          <div style={{ marginBottom: '20px' }}>
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

          {loading ? <SkeletonCardGrid /> : requests.length === 0 ? (
            <div className="empty-requests">
              <CreditCard size={48} />
              <h3>No Online Payments</h3>
              <p>Requests will appear here for processing after you submit proof of payment.</p>
            </div>
          ) : (
            <div className="my-requests-grid">
              {requests.filter(req => filterType === 'All Type Documents' || req.type === filterType || (filterType === 'Business Permit' && req.type === 'Business Clearance')).map(request => (
                <div 
                  id={`request-card-${request.id}`}
                  key={request.id} 
                  className={`request-card ${getThemeByStatus(request.status)} ${flashingCardId === request.id ? 'flashing-blue' : ''}`}
                >
                  {isNew(request.timestamp) && <div className="new-request-badge">New</div>}
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
                        <div className="request-status-badge" style={{ backgroundColor: '#ebf8ff', color: '#2b6cb0' }}>
                          <Clock size={14} /> Processing
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
                      <div className="approved-message-box" style={{ backgroundColor: '#ebf8ff', borderColor: '#bee3f8', color: '#2b6cb0' }}>
                        {request.deliveryMethod === 'Barangay Pickup' || request.deliveryMethod === 'Barangay Pick up' ? (
                          <>
                            <strong>Please proceed to the barangay hall to pay and claim your document.</strong>
                            <br/>
                            Expires on: {request.approvedAt ? new Date(request.approvedAt.seconds * 1000 + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'}
                          </>
                        ) : (request.totalFee === 'Free' || request.totalFee === '0' || parseFloat(request.totalFee || 0) === 0) ? (
                          <>
                            <strong>Your free online request is being processed.</strong>
                            <br/>
                            Please wait while the administrator prepares your document.
                            <br/>
                            Expires on: {request.approvedAt ? new Date(request.approvedAt.seconds * 1000 + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'}
                          </>
                        ) : (
                          <>
                            <strong>You have successfully sent the proof of payment.</strong>
                            <br/>
                            Your payment is currently being verified.
                            <br/>
                            Expires on: {request.approvedAt ? new Date(request.approvedAt.seconds * 1000 + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="request-banner">
                    <div className="request-banner-text">
                      <h4>{getBannerMessage().title}</h4>
                      <p>{getBannerMessage().desc}</p>
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