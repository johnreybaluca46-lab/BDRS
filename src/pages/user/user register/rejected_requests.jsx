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
import { auth, db } from '../../../database/firebase';
import Swal from 'sweetalert2';
import { Eye, Clock, XCircle, Hourglass, FileText, Home, Store, FileCheck, FileX, Trash2 } from 'lucide-react';

export default function RejectedRequests() {
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
    document.title = 'Resident | Rejected Requests';

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
        .map(d => ({
          id: d.id,
          ...d.data(),
          dateRequested: d.data().timestamp?.seconds
            ? new Date(d.data().timestamp.seconds * 1000)
            : new Date()
        }))
        .filter(req => {
          const s = req.status?.toLowerCase();
          return (s === 'rejected' || s === 'trashed' || s === 'expired') && !req.hiddenByUser;
        });

      reqs.sort((a, b) => b.dateRequested - a.dateRequested);
      setRequests(reqs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching requests:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getThemeByStatus = (status) => {
    const s = status?.toLowerCase();
    if (s === 'trashed' || s === 'expired') return 'theme-trashed';
    return 'theme-rejected';
  };

  const getIconByType = (type) => {
    if (type?.toLowerCase().includes('indigency')) return <FileCheck size={32} />;
    if (type?.toLowerCase().includes('residency')) return <Home size={32} />;
    if (type?.toLowerCase().includes('business')) return <Store size={32} />;
    return <FileText size={32} />;
  };

  const getBannerMessage = (req) => {
    const s = req.status?.toLowerCase();
    if (s === 'trashed' || s === 'expired') {
      return {
        title: 'Request Expired',
        desc: req.trashReason || 'This request has expired and was moved to trash.'
      };
    }
    return {
      title: 'Request Rejected',
      desc: req.rejectionReason || 'Your request has been rejected by the barangay.'
    };
  };

  const getStatusLabel = (status) => {
    const s = status?.toLowerCase();
    if (s === 'trashed' || s === 'expired') return 'Expired';
    return 'Rejected';
  };

  const isNew = (timestamp) => {
    if (!timestamp) return false;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffInMs = now - date;
    const tenMinsInMs = 10 * 60 * 1000;
    return diffInMs < tenMinsInMs;
  };

  const handleHide = async (id) => {
    const result = await Swal.fire({
      title: 'Remove Request?',
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

  return (
    <div className="admin-dashboard-container">
      <ResidentSidebar />

      <main className="admin-main">
        <header className="admin-header">
          <h1>Rejected / Expired</h1>
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
                {!seenTabs.has('All') && requests.some(req => isNew(req.rejectedAt || req.timestamp)) && <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', backgroundColor: '#e53e3e', borderRadius: '50%' }}></span>}
              </button>
              <button
                onClick={() => setDeliveryTab('Barangay Pick up')}
                style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', color: deliveryTab === 'Barangay Pick up' ? '#3182ce' : '#718096', borderBottom: deliveryTab === 'Barangay Pick up' ? '3px solid #3182ce' : 'none', position: 'relative' }}>
                Barangay Pick up
                {!seenTabs.has('Barangay Pick up') && requests.some(req => isNew(req.rejectedAt || req.timestamp) && (!req.deliveryMethod || req.deliveryMethod === 'Barangay Pick up' || req.deliveryMethod === 'Barangay Pickup')) && <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', backgroundColor: '#e53e3e', borderRadius: '50%' }}></span>}
              </button>
              <button
                onClick={() => setDeliveryTab('Online Pick up')}
                style={{ background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem', color: deliveryTab === 'Online Pick up' ? '#3182ce' : '#718096', borderBottom: deliveryTab === 'Online Pick up' ? '3px solid #3182ce' : 'none', position: 'relative' }}>
                Online Pick up
                {!seenTabs.has('Online Pick up') && requests.some(req => isNew(req.rejectedAt || req.timestamp) && (req.deliveryMethod === 'Online Pick up' || req.deliveryMethod === 'Online PDF')) && <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', backgroundColor: '#e53e3e', borderRadius: '50%' }}></span>}
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
              <FileX size={48} />
              <h3>No Rejected Requests</h3>
              <p>You don't have any rejected or expired document requests.</p>
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
                  {isNew(request.rejectedAt || request.timestamp) && <div className="new-request-badge">New</div>}
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
                          <XCircle size={14} /> {getStatusLabel(request.status)}
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
                          <span style={{ fontWeight: 600, marginLeft: '4px' }}>Method:</span> <span style={{ marginLeft: '4px' }}>{request.deliveryMethod === 'Barangay Pickup' ? 'Barangay Pick up' : (request.deliveryMethod === 'Online PDF' ? 'Online Pick up' : (request.deliveryMethod || 'Not specified'))}</span>
                        </div>
                      </div>
                      <div className="rejected-message-box">
                        <strong>{getBannerMessage(request).title}</strong>
                        <br />
                        {getBannerMessage(request).desc}
                      </div>
                    </div>
                  </div>
                  <div className="request-banner">
                    <div className="request-banner-text">
                      <h4>{getBannerMessage(request).title}</h4>
                      <p>{getBannerMessage(request).desc}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
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
