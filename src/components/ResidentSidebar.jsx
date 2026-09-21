import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import ResidentMaintenanceModal from './ResidentMaintenanceModal';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { confirmLogoutAlert } from '../utils/sweetAlerts';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, getDocs, updateDoc, serverTimestamp, doc } from 'firebase/firestore';
import { auth, db } from '../database/firebase';
import { logAdminActivity as logActivity } from '../utils/activityLogger';
import { 
  LayoutDashboard, FileText, ClipboardList, Clock, 
  UserCircle, LogOut, CheckSquare, CheckCircle, XCircle, Menu, X, User,
  ChevronLeft, ChevronRight, CreditCard, Info
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import '../lib/app-sidebar.css';
import DefaultLogo from '../assets/logo/barangay buluan seal.png';

export default function ResidentSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, loading } = useSettings();
  const [isOpen, setIsOpen] = useState(false); // For mobile overlay
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed_resident') === 'true';
  });

  const navRef = useRef(null);

  useLayoutEffect(() => {
    const savedScroll = sessionStorage.getItem('residentSidebarScroll');
    if (savedScroll && navRef.current) {
      navRef.current.scrollTop = parseInt(savedScroll, 10);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add('resident-sidebar-collapsed');
    } else {
      document.body.classList.remove('resident-sidebar-collapsed');
    }
    
    // Cleanup on unmount
    return () => document.body.classList.remove('resident-sidebar-collapsed');
  }, [isCollapsed]);

  const handleNavScroll = (e) => {
    sessionStorage.setItem('residentSidebarScroll', e.target.scrollTop);
  };
  
  const [residentData, setResidentData] = useState(() => {
    const cached = sessionStorage.getItem('residentSidebarData');
    return cached ? JSON.parse(cached) : {
      fullName: 'Resident',
      photo2x2: null,
      status: 'Active',
      id: '---'
    };
  });

  // Close sidebar overlay when window resizes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsOpen(false);
      } else {
        // Always show expanded on mobile menu open
        setIsCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    let unsubscribeQuery = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, 'residents'), where("userId", "==", user.uid));
        unsubscribeQuery = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
             const data = snapshot.docs[0].data();
             const docId = snapshot.docs[0].id;
             const fallbackId = docId.startsWith('RES') ? docId : `RES-2026-${docId.substring(0, 5).toUpperCase()}`;
             
             const newData = {
               fullName: data.fullName || 'Resident',
               photo2x2: data.photo2x2 || null,
               status: (data.status?.toLowerCase() === 'approved') ? 'Active' : (data.status || 'Active'),
               id: data.resNumber || fallbackId
             };
             setResidentData(newData);
             sessionStorage.setItem('residentSidebarData', JSON.stringify(newData));
          }
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeQuery) unsubscribeQuery();
    };
  }, []);

  const handleLogout = () => {
    confirmLogoutAlert(async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          try {
            const residentDocRef = doc(db, 'residents', user.uid);
            await updateDoc(residentDocRef, {
              login_status: 'Inactive',
              last_logout: serverTimestamp()
            });
          } catch (updateErr) {
            console.error('Error updating logout status', updateErr);
          }
        }
        await logActivity('Logged out', 'Resident session ended', 'logout', null, 'user');
        await signOut(auth);
        navigate('/user-login', { state: { loggedOut: true } });
      } catch (error) {
        console.error('Failed to log out', error);
      }
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'registered':
      case 'active':
      case 'approved':
        return 'status-active';
      case 'rejected':
      case 'trash':
      case 'inactive':
      case 'expired':
        return 'status-inactive';
      default:
        return 'status-active';
    }
  };

  return (
    <>
      <ResidentMaintenanceModal />
      <button className="mobile-toggle" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle Menu">
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      
      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      <aside className={`app-sidebar ${isCollapsed ? 'collapsed' : ''} ${isOpen ? 'open' : ''}`}>
        
        {/* Top Toggle Section */}
        <div className="as-top-actions">
          <div className="as-logo-container">
            <img src={settings?.logoUrl || DefaultLogo} alt="Logo" className="as-logo" />
            <div className="as-title-group">
              <span className="as-logo-title">BDRS</span>
              <span className="as-logo-subtitle">{settings?.barangayName || 'Barangay'}</span>
            </div>
          </div>
          
          {window.innerWidth > 768 && (
            <button 
              className="as-toggle-btn" 
              onClick={() => {
                const newState = !isCollapsed;
                setIsCollapsed(newState);
                localStorage.setItem('sidebar_collapsed_resident', newState);
              }}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          )}
        </div>
        
        <nav className="as-nav" ref={navRef} onScroll={handleNavScroll}>
          <div className="as-nav-section">MAIN</div>
          <Link to="/user-dashboard" onClick={closeSidebar} className={`as-nav-item ${location.pathname === '/user-dashboard' ? 'active' : ''}`} title="Dashboard">
            <div className="as-nav-icon"><LayoutDashboard size={20} /></div>
            <span className="as-nav-label">Dashboard</span>
          </Link>
          <Link to="/user-request-documents" onClick={closeSidebar} className={`as-nav-item ${(location.pathname.includes('/user-request-documents') || location.pathname.includes('/barangay-clearance') || location.pathname.includes('/certificate-of-residency') || location.pathname.includes('/certificate-of-indigency') || location.pathname.includes('/business-clearance')) ? 'active' : ''}`} title="Request documents">
            <div className="as-nav-icon"><FileText size={20} /></div>
            <span className="as-nav-label">Request documents</span>
          </Link>
          <Link to="/user-instruction" onClick={closeSidebar} className={`as-nav-item ${location.pathname === '/user-instruction' ? 'active' : ''}`} title="Instruction">
            <div className="as-nav-icon"><Info size={20} /></div>
            <span className="as-nav-label">Instruction</span>
          </Link>

          <div className="as-nav-section">MY REQUESTS</div>
          <Link to="/user-my-requests" onClick={closeSidebar} className={`as-nav-item ${location.pathname.includes('/user-my-requests') ? 'active' : ''}`} title="My request">
            <div className="as-nav-icon"><ClipboardList size={20} /></div>
            <span className="as-nav-label">My request</span>
          </Link>
          <Link to="/user-approved-requests" onClick={closeSidebar} className={`as-nav-item ${location.pathname.includes('/user-approved-requests') ? 'active' : ''}`} title="Approval request">
            <div className="as-nav-icon"><CheckSquare size={20} /></div>
            <span className="as-nav-label">Approval request</span>
          </Link>
          <Link to="/user-payment-processing" onClick={closeSidebar} className={`as-nav-item ${location.pathname.includes('/user-payment-processing') ? 'active' : ''}`} title="Online Payment">
            <div className="as-nav-icon"><CreditCard size={20} /></div>
            <span className="as-nav-label">Online Payment</span>
          </Link>
          <Link to="/user-completed-requests" onClick={closeSidebar} className={`as-nav-item ${location.pathname.includes('/user-completed-requests') ? 'active' : ''}`} title="Completed">
            <div className="as-nav-icon"><CheckCircle size={20} /></div>
            <span className="as-nav-label">Completed</span>
          </Link>
          <Link to="/user-rejected-requests" onClick={closeSidebar} className={`as-nav-item ${location.pathname.includes('/user-rejected-requests') ? 'active' : ''}`} title="Reject / Expire">
            <div className="as-nav-icon"><XCircle size={20} /></div>
            <span className="as-nav-label">Reject / Expire</span>
          </Link>
          <Link to="/user-history" onClick={closeSidebar} className={`as-nav-item ${location.pathname.includes('/user-history') ? 'active' : ''}`} title="Request history">
            <div className="as-nav-icon"><Clock size={20} /></div>
            <span className="as-nav-label">Request history</span>
          </Link>

          <div className="as-nav-section">ACCOUNT</div>
          <Link to="/user-profile" onClick={closeSidebar} className={`as-nav-item ${location.pathname.includes('/user-profile') ? 'active' : ''}`} title="Profile">
            <div className="as-nav-icon"><UserCircle size={20} /></div>
            <span className="as-nav-label">Profile</span>
          </Link>
          <button className="as-nav-item" onClick={handleLogout} title="Logout">
            <div className="as-nav-icon"><LogOut size={20} /></div>
            <span className="as-nav-label">Logout</span>
          </button>
        </nav>

        {/* Bottom Profile Section */}
        <div className="as-profile-section" title={isCollapsed ? residentData.fullName : ""}>
          <div className="as-avatar-container">
            {residentData.photo2x2 ? (
              <img src={residentData.photo2x2} alt="Profile" className="as-avatar" />
            ) : (
              <User size={24} color="#a0aec0" />
            )}
          </div>
          
          <div className="as-profile-info">
            <div className="as-profile-name">
              {residentData.fullName}
            </div>
            <div className="as-profile-badges">
              <span className="as-badge id">
                {residentData.id}
              </span>
              <span className={`as-badge ${getStatusBadgeClass(residentData.status)}`}>
                {residentData.status}
              </span>
            </div>
          </div>
        </div>
        
      </aside>
    </>
  );
}
