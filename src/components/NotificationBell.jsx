import React, { useState, useEffect, useRef } from 'react';
import { Bell, FileText, Check, X, Clock, Trash2, Mail, Users, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../database/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [cachedUnread, setCachedUnread] = useState(() => {
    return parseInt(sessionStorage.getItem('adminUnreadCount') || '0', 10);
  });
  const [lastReadTime, setLastReadTime] = useState(0);
  const [deletedIds, setDeletedIds] = useState([]);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const handleNotificationClick = (req) => {
    const type = (req.type || '').toUpperCase();
    if (type === 'NEW_MESSAGE') {
      navigate('/admin/inbox', { state: { selectedMessageId: req.messageId } });
    } else if (type === 'NEW_RESIDENT') {
      const targetId = req.requestId || req.residentId;
      if (targetId) {
        navigate(`/admin/residents/${targetId}`, { state: { from: 'approval' } });
      } else {
        navigate('/admin/resident-approval');
      }
    } else if (type === 'RESIDENT_PROFILE_UPDATE' || type === 'PROFILE_UPDATE' || type === 'RESIDENT_UPDATED') {
      if (req.residentId) {
        navigate(`/admin/residents/${req.residentId}`);
      } else {
        navigate('/admin/residents');
      }
    } else {
      const targetId = req.requestId || (req.id && req.id.startsWith('BLN-') ? req.id : null);
      
      let fromState = undefined;
      if (type === 'COMPLETED') fromState = '/admin/completed';
      else if (type === 'APPROVED') fromState = '/admin/payment';
      else if (type === 'TRASHED' || type === 'REJECTED' || type === 'DELETED') fromState = '/admin/trash';

      if (targetId) {
        navigate(`/admin/document-requests/${targetId}`, { state: { from: fromState } });
      } else {
        navigate('/admin/document-requests', { state: { from: fromState } });
      }
    }
    setIsOpen(false);
  };

  useEffect(() => {
    // Listen for recent notifications
    const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(15));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = [];
      let latestTime = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Ignore notifications that are strictly meant for the resident's bell
        if (['SUBMITTED', 'PAYMENT_PROOF_SENT', 'PAYMENT_REJECTED', 'TRASHED_EXPIRED'].includes(data.type)) return;

        if (data.timestamp) {
            const time = data.timestamp.toMillis();
            if (time > latestTime) latestTime = time;
        }
        reqs.push({ id: doc.id, ...data });
      });
      
      setNotifications(reqs);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribeDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const docRef = doc(db, 'admin_profiles', user.uid);
        unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
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
    // Close dropdown on click outside
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
    
    // Ensure we always save a time, even if current notifications don't have timestamp
    if (latestTime === 0) {
        latestTime = Date.now();
    }
    
    if (auth.currentUser) {
      setDoc(doc(db, 'admin_profiles', auth.currentUser.uid), {
        notification_lastReadTime: latestTime
      }, { merge: true }).catch(err => console.error('Failed to mark as read', err));
    }
  };

  const handleDeleteAll = () => {
    const currentIds = notifications.map(n => n.id);
    const newDeleted = [...new Set([...deletedIds, ...currentIds])];
    
    if (auth.currentUser) {
      setDoc(doc(db, 'admin_profiles', auth.currentUser.uid), {
        notification_deletedIds: newDeleted
      }, { merge: true }).catch(err => console.error('Failed to delete all', err));
    }
  };

  const handleDelete = (id) => {
    const newDeleted = [...deletedIds, id];
    
    if (auth.currentUser) {
      setDoc(doc(db, 'admin_profiles', auth.currentUser.uid), {
        notification_deletedIds: newDeleted
      }, { merge: true }).catch(err => console.error('Failed to delete', err));
    }
  };

  const getNotificationDetails = (notif) => {
    const type = (notif.type || '').toUpperCase();
    const name = notif.residentName || 'Unknown';
    const reqId = notif.requestId || (notif.id && notif.id.startsWith('BLN-') ? notif.id : null) || name;
    const docType = notif.documentType || 'Document';
    
    switch (type) {
      case 'NEW':
        return {
          icon: <FileText size={16} />,
          iconClass: 'icon-new',
          title: 'New Document Request',
          desc: `${reqId} requested a ${docType}`
        };
      case 'NEW_RESIDENT':
        return {
          icon: <Users size={16} />,
          iconClass: 'icon-new',
          title: 'New Resident Registration',
          desc: `${name} submitted a new resident registration`
        };
      case 'RESIDENT_PROFILE_UPDATE':
      case 'PROFILE_UPDATE':
      case 'RESIDENT_UPDATED':
        return {
          icon: <Users size={16} />,
          iconClass: 'icon-pending',
          title: 'Profile Updated',
          desc: `${notif.residentName || name !== 'Unknown' ? name : (notif.residentId || 'A resident')} has changed their profile`
        };
      case 'NEW_MESSAGE':
        return {
          icon: <Mail size={16} />,
          iconClass: 'icon-new',
          title: 'New Message',
          desc: `${name} sent a message: ${docType}`
        };
      case 'APPROVED':
        return {
          icon: <Check size={16} />,
          iconClass: 'icon-approved',
          title: 'Request Approved',
          desc: `Request ${reqId} (${docType}) was approved.`
        };
      case 'REJECTED':
        return {
          icon: <X size={16} />,
          iconClass: 'icon-rejected',
          title: 'Request Rejected',
          desc: `Request ${reqId} (${docType}) was rejected.`
        };
      case 'TRASHED':
        return {
          icon: <Trash2 size={16} />,
          iconClass: 'icon-rejected',
          title: 'Request Trashed',
          desc: `Request ${reqId} (${docType}) was moved to trash.`
        };
      case 'RESTORED':
        return {
          icon: <Clock size={16} />,
          iconClass: 'icon-pending',
          title: 'Request Restored',
          desc: `Request ${reqId} (${docType}) was restored.`
        };
      case 'DELETED':
        return {
          icon: <Trash2 size={16} />,
          iconClass: 'icon-rejected',
          title: 'Request Deleted',
          desc: `Request ${reqId} (${docType}) was permanently deleted.`
        };
      case 'SECURITY_ALERT':
        return {
          icon: <ShieldAlert size={16} />,
          iconClass: 'icon-rejected',
          title: notif.title || 'Security Alert',
          desc: notif.message || 'A security event occurred.'
        };
      case 'PAYMENT_PROOF':
        return {
          icon: <FileText size={16} />,
          iconClass: 'icon-new',
          title: notif.title || 'Payment Proof Submitted',
          desc: notif.message || `${name} submitted payment proof for ${docType}.`
        };
      default:
        return {
          icon: <Bell size={16} />,
          iconClass: 'icon-new',
          title: 'System Notification',
          desc: `Update on request ${reqId} (${docType})`
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
  const unreadCount = visibleNotifications.filter(r => {
    const notifTime = r.timestamp ? r.timestamp.toMillis() : 0;
    return notifTime > lastReadTime;
  }).length;
  
  const displayUnreadCount = notifications.length > 0 ? unreadCount : cachedUnread;

  useEffect(() => {
    if (notifications.length > 0) {
      sessionStorage.setItem('adminUnreadCount', unreadCount.toString());
    }
  }, [unreadCount, notifications.length]);

  return (
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
            {notifications.filter(n => !deletedIds.includes(n.id)).length > 0 && (
                <div className="notification-actions">
                  <button className="delete-all-btn" onClick={handleDeleteAll}>
                    Delete All
                  </button>
                </div>
            )}
          </div>
          <div className="notification-content">
            {notifications.filter(n => !deletedIds.includes(n.id)).length > 0 ? (
              <div className="notification-list">
                {notifications.filter(n => !deletedIds.includes(n.id)).map(req => {
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
  );
}

const NotificationItem = ({ req, details, formatTime, onDelete, onClick }) => {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e) => {
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    if (diff < 0 && diff >= -80) { // max swipe 80px
      setOffset(diff);
    } else if (diff < -80) {
      setOffset(-80);
    }
  };
  const handleTouchEnd = () => {
    if (offset < -40) {
      setOffset(-80); // snap to reveal delete
    } else {
      setOffset(0); // snap back
    }
  };

  return (
    <div className="notification-item-container">
      <div className="notification-delete-bg">
        <button className="notification-delete-btn" onClick={() => onDelete(req.id)}>
          <Trash2 size={20} />
        </button>
      </div>
      <div 
        className="notification-item-surface"
        style={{ transform: `translateX(${offset}px)`, cursor: 'pointer' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={onClick}
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
