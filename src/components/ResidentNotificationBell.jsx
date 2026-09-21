import React, { useState, useEffect, useRef } from 'react';
import { Bell, FileText, Check, X, Clock, Trash2, Mail, Users, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, onSnapshot, updateDoc, getDocs } from 'firebase/firestore';
import { auth, db } from '../database/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useMaintenance } from '../context/MaintenanceContext';
import NetworkStatusIndicator from './NetworkStatusIndicator';

export default function ResidentNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { effectiveStatus, isModalDismissed, setIsModalDismissed, maintenanceData } = useMaintenance();
  const [cachedUnread, setCachedUnread] = useState(() => {
    return parseInt(sessionStorage.getItem('residentUnreadCount') || '0', 10);
  });
  const [lastReadTime, setLastReadTime] = useState(0);
  const [deletedIds, setDeletedIds] = useState([]);
  const [residentDocRef, setResidentDocRef] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const handleNotificationClick = (req) => {
    const type = (req.type || '').toUpperCase();
    const targetId = req.requestId || req.id;
    let path = '/user-my-requests';
    if (type === 'TRASHED' || type === 'TRASHED_EXPIRED' || type === 'REJECTED') {
      path = '/user-rejected-requests';
    } else if (type === 'APPROVED') {
      path = '/user-approved-requests';
    } else if (type === 'COMPLETED') {
      path = '/user-completed-requests';
    } else if (type === 'PAYMENT_PROOF_SENT') {
      path = '/user-payment-processing';
    }
    navigate(`${path}?highlight=${targetId}&t=${Date.now()}`);
    setIsOpen(false);
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    
    // Listen for recent notifications for this specific user
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', auth.currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let reqs = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.type !== 'RESIDENT_PROFILE_UPDATE') {
          reqs.push({ id: doc.id, ...data });
        }
      });
      
      // Sort and limit on the client side to avoid needing a Firestore composite index
      reqs.sort((a, b) => {
        const timeA = a.timestamp ? a.timestamp.toMillis() : 0;
        const timeB = b.timestamp ? b.timestamp.toMillis() : 0;
        return timeB - timeA;
      });
      
      setNotifications(reqs.slice(0, 15));
    }, (error) => {
      console.error("Error fetching notifications:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribeDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const qResident = query(collection(db, 'residents'), where('userId', '==', user.uid));
        unsubscribeDoc = onSnapshot(qResident, (snapshot) => {
          if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            setResidentDocRef(docSnap.ref);
            const data = docSnap.data();
            if (data.notification_lastReadTime) setLastReadTime(data.notification_lastReadTime);
            if (data.notification_deletedIds) setDeletedIds(data.notification_deletedIds);
          }
        });
      } else {
        if (unsubscribeDoc) unsubscribeDoc();
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const markAllAsRead = () => {
    let latestTime = 0;
    notifications.forEach(n => {
        if (n.timestamp && n.timestamp.toMillis() > latestTime) {
            latestTime = n.timestamp.toMillis();
        }
    });
    
    if (latestTime === 0) {
        latestTime = Date.now();
    }
    
    if (residentDocRef) {
      updateDoc(residentDocRef, {
        notification_lastReadTime: latestTime
      }).catch(err => console.error('Failed to mark as read', err));
    }
  };

  const handleDeleteAll = () => {
    const currentIds = notifications.map(n => n.id);
    const newDeleted = [...new Set([...deletedIds, ...currentIds])];
    
    if (residentDocRef) {
      updateDoc(residentDocRef, {
        notification_deletedIds: newDeleted
      }).catch(err => console.error('Failed to delete all', err));
    }
  };

  const handleDelete = (id) => {
    const newDeleted = [...deletedIds, id];
    
    if (residentDocRef) {
      updateDoc(residentDocRef, {
        notification_deletedIds: newDeleted
      }).catch(err => console.error('Failed to delete', err));
    }
  };

  const getNotificationDetails = (notif) => {
    const type = (notif.type || '').toUpperCase();
    const docType = notif.documentType || 'Document';
    
    switch (type) {
      case 'APPROVED':
        return {
          icon: <Check size={16} />,
          iconClass: 'icon-approved',
          title: 'Request Approved',
          desc: `Your request for ${docType} was approved.`
        };
      case 'REJECTED':
      case 'TRASHED':
        return {
          icon: <X size={16} />,
          iconClass: 'icon-rejected',
          title: 'Request Rejected',
          desc: `Your request for ${docType} was rejected.`
        };
      case 'TRASHED_EXPIRED':
        return {
          icon: <Clock size={16} />,
          iconClass: 'icon-rejected',
          title: 'Request Expired',
          desc: `Your request for ${docType} has expired.`
        };
      case 'SUBMITTED':
        return {
          icon: <Check size={16} />,
          iconClass: 'icon-new',
          title: 'Request Submitted',
          desc: `Your request for ${docType} has been successfully submitted.`
        };
      case 'COMPLETED':
        return {
          icon: <CheckCircle size={16} />,
          iconClass: 'icon-approved',
          title: 'Request Paid',
          desc: `Your request for ${docType} has been paid and completed.`
        };
      case 'PAYMENT_PROOF_SENT':
        return {
          icon: <Check size={16} />,
          iconClass: 'icon-new',
          title: notif.title || 'Proof Sent',
          desc: notif.message || `Your proof of payment for ${docType} has been submitted.`
        };
      default:
        return {
          icon: <Bell size={16} />,
          iconClass: 'icon-new',
          title: notif.title || 'System Notification',
          desc: notif.message || `Update on your ${docType}`
        };
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const visibleNotifications = notifications.filter(n => !deletedIds.includes(n.id));
  const unreadCount = visibleNotifications.filter(r => (r.timestamp ? r.timestamp.toMillis() : Date.now()) > lastReadTime).length;
  
  const displayUnreadCount = notifications.length > 0 ? unreadCount : cachedUnread;

  useEffect(() => {
    if (notifications.length > 0) {
      sessionStorage.setItem('residentUnreadCount', unreadCount.toString());
    }
  }, [unreadCount, notifications.length]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {/* Maintenance clock pill — shown when scheduled and modal is dismissed */}
      {effectiveStatus === 'scheduled' && isModalDismissed && (
        <MaintenanceClockPill
          maintenanceData={maintenanceData}
          onOpen={() => setIsModalDismissed(false)}
        />
      )}

      <NetworkStatusIndicator />

      <div className="notification-wrapper" ref={dropdownRef}>
      <button 
        className="notification-btn" 
        onClick={() => {
          if (!isOpen) markAllAsRead();
          setIsOpen(!isOpen);
        }}
        aria-label="Notifications"
      >
        <Bell size={24} />
        {displayUnreadCount > 0 && (
          <span className="notification-badge">
            {displayUnreadCount > 9 ? '9+' : displayUnreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {visibleNotifications.length > 0 && (
                <div className="notification-actions">
                  <button className="delete-all-btn" onClick={handleDeleteAll}>
                    Delete All
                  </button>
                </div>
            )}
          </div>
          <div className="notification-content">
            {visibleNotifications.length > 0 ? (
              <div className="notification-list">
                {visibleNotifications.map(req => {
                  const details = getNotificationDetails(req);
                  return (
                    <NotificationItem 
                      key={req.id} 
                      req={req} 
                      details={details} 
                      formatTime={formatTime} 
                      onDelete={handleDelete} 
                      onClick={() => handleNotificationClick(req)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="notification-empty">
                <p>No recent notifications.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

const NotificationItem = ({ req, details, formatTime, onDelete, onClick }) => {
  const [offset, setOffset] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e) => {
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    if (diff < 0 && diff >= -80) {
      setOffset(diff);
    } else if (diff < -80) {
      setOffset(-80);
    }
  };
  const handleTouchEnd = () => {
    if (offset < -40) {
      setOffset(-80);
    } else {
      setOffset(0);
    }
  };

  const handleItemClick = () => {
    setIsFlashing(true);
    setTimeout(() => {
      onClick();
    }, 150);
  };

  return (
    <div className="notification-item-container">
      <div className="notification-delete-bg">
        <button className="notification-delete-btn" onClick={() => onDelete(req.id)}>
          <Trash2 size={20} />
        </button>
      </div>
      <div 
        className={`notification-item-surface ${isFlashing ? 'flashing-blue' : ''}`}
        style={{ transform: `translateX(${offset}px)`, cursor: 'pointer' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleItemClick}
      >
        <div className={`notification-icon ${details.iconClass}`}>
          {details.icon}
        </div>
        <div className="notification-text">
          <p className="notification-title">{details.title}</p>
          <p className="notification-desc">{details.desc}</p>
          <span className="notification-time">{formatTime(req.timestamp)}</span>
        </div>
        <button className="desktop-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(req.id); }}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// ── Maintenance clock pill ─ shown in header when modal is dismissed ──
function MaintenanceClockPill({ maintenanceData, onOpen }) {
  const [remainingTime, setRemainingTime] = useState('');
  const [totalSeconds, setTotalSeconds] = useState(null);

  useEffect(() => {
    if (!maintenanceData?.maintenanceStartTime) return;

    const startMillis = maintenanceData.maintenanceStartTime.toMillis
      ? maintenanceData.maintenanceStartTime.toMillis()
      : maintenanceData.maintenanceStartTime;

    const update = () => {
      const diff = startMillis - Date.now();
      if (diff <= 0) { setRemainingTime('00:00'); setTotalSeconds(0); return; }
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setTotalSeconds(Math.floor(diff / 1000));
      setRemainingTime(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
    };

    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [maintenanceData]);

  const isUrgent = totalSeconds !== null && totalSeconds <= 60;
  const color = isUrgent ? '#e53e3e' : '#c05621';
  const bg = isUrgent ? '#fed7d7' : '#feebcb';
  const border = isUrgent ? '#feb2b2' : '#fbd38d';

  return (
    <>
      <button
        onClick={onOpen}
        title="View Maintenance Countdown"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          backgroundColor: bg,
          color: color,
          border: `1.5px solid ${border}`,
          borderRadius: '20px',
          padding: '5px 12px 5px 8px',
          marginLeft: '8px',
          cursor: 'pointer',
          fontWeight: 700,
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          letterSpacing: '1px',
          animation: isUrgent ? 'mcp-pulse 1s ease-in-out infinite' : 'mcp-in 0.3s ease',
          whiteSpace: 'nowrap',
        }}
        className="responsive-header-pill"
        onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
        onMouseOut={e => e.currentTarget.style.opacity = '1'}
      >
        <Clock size={15} />
        {remainingTime}
      </button>
      <style>{`
        @keyframes mcp-pulse { 0%,100%{opacity:1} 50%{opacity:0.55} }
        @keyframes mcp-in { from{opacity:0;transform:scale(0.7)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </>
  );
}
