import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { confirmLogoutAlert } from '../utils/sweetAlerts';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../database/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { logLoginEvent } from '../utils/auditLogger';
import { 
  LayoutDashboard, FileText, Users, UserPlus, BarChart2, 
  CheckCircle, UserCircle, LogOut, Settings, Trash2, Mail,
  CreditCard, FileCheck, ShieldCheck, Menu, X, ChevronLeft, ChevronRight, User
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import DefaultLogo from '../assets/logo/barangay buluan seal.png';
import '../lib/app-sidebar.css';
import '../lib/stars.css';

export default function AdminSidebar({ className }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed_admin') === 'true';
  });
  const navRef = useRef(null);

  useLayoutEffect(() => {
    if (navRef.current) {
      const savedScroll = sessionStorage.getItem('adminSidebarScroll');
      if (savedScroll) {
        navRef.current.scrollTop = parseInt(savedScroll, 10);
      }
    }
  }, []);

  const handleNavScroll = (e) => {
    sessionStorage.setItem('adminSidebarScroll', e.target.scrollTop.toString());
  };
  
  const [adminData, setAdminData] = useState(() => {
    const cachedRole = localStorage.getItem('cachedAdminRole') || 'System Administrator';
    const cachedName = localStorage.getItem('cachedAdminName') || 'Administrator';
    const cachedPhoto = localStorage.getItem('cachedAdminPhoto') || null;
    return {
      fullName: cachedName,
      photoUrl: cachedPhoto,
      status: 'Active',
      role: cachedRole
    };
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsOpen(false);
      } else {
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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, 'admin_profiles', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const role = data.role || 'System Administrator';
            const name = data.fullName || 'Administrator';
            const photo = data.profilePicture || data.photoURL || null;
            const status = data.status || 'Active';
            
            localStorage.setItem('cachedAdminRole', role);
            localStorage.setItem('cachedAdminName', name);
            if (photo) localStorage.setItem('cachedAdminPhoto', photo);
            
            setAdminData({
              fullName: name,
              photoUrl: photo,
              status: status,
              role: role
            });
          }
        } catch (error) {
          console.error("Error fetching admin profile for sidebar:", error);
        }
      } else {
        localStorage.removeItem('cachedAdminRole');
        localStorage.removeItem('cachedAdminName');
        localStorage.removeItem('cachedAdminPhoto');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    confirmLogoutAlert(async () => {
      try {
        if (auth.currentUser?.email) {
          await logLoginEvent({ 
            event: 'Logout Successful', 
            result: 'success', 
            email: auth.currentUser.email, 
            role: 'Admin',
            locationOverride: { ip: 'Skipped', location: 'Skipped', isp: 'Skipped', locationType: 'Skipped' }
          });
        }
        await signOut(auth);
        navigate('/login', { state: { loggedOut: true } });
      } catch (error) {
        console.error('Failed to log out', error);
      }
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'status-active';
      case 'disabled':
      case 'inactive':
        return 'status-inactive';
      default:
        return 'status-active';
    }
  };

  return (
    <>
      <label className="hamburger mobile-toggle" aria-label="Toggle Menu">
        <input 
          className="checkbox" 
          type="checkbox" 
          checked={isOpen} 
          onChange={() => setIsOpen(!isOpen)} 
        />
        <svg fill="none" viewBox="0 0 50 50" height="40" width="40">
          <path className="lineTop line" strokeLinecap="round" strokeWidth="4" stroke="black" d="M6 11L44 11"></path>
          <path className="lineMid line" strokeLinecap="round" strokeWidth="4" stroke="black" d="M6 24H43"></path>
          <path className="lineBottom line" strokeLinecap="round" strokeWidth="4" stroke="black" d="M6 37H43"></path>
        </svg>
      </label>
      
      {isOpen && <div className="sidebar-overlay" onClick={closeSidebar}></div>}

      <aside className={`app-sidebar ${isCollapsed ? 'collapsed' : ''} ${isOpen ? 'open' : ''} hide-on-print ${className || ''}`}>
        
        <div className="sidebar-background">
          <div id="stars"></div>
          <div id="stars2"></div>
          <div id="stars3"></div>
        </div>

        <div className="as-top-actions">
          <div className="as-logo-container">
            <img src={settings?.logoUrl || DefaultLogo} alt="Logo" className="as-logo" />
            <div className="as-title-group">
              <span className="as-logo-title">BDRS</span>
              <span className="as-logo-subtitle">{settings?.barangayName || 'Barangay Buluan'}</span>
            </div>
          </div>
          
          <label 
            className="hamburger as-toggle-btn" 
            title={isCollapsed && window.innerWidth > 768 ? "Expand sidebar" : "Collapse sidebar"}
            style={{ width: '40px', height: '40px', padding: 0, background: 'transparent', border: 'none' }}
          >
            <input 
              className="checkbox" 
              type="checkbox" 
              checked={window.innerWidth > 768 ? !isCollapsed : isOpen}
              onChange={() => {
                if (window.innerWidth > 768) {
                  const newState = !isCollapsed;
                  setIsCollapsed(newState);
                  localStorage.setItem('sidebar_collapsed_admin', newState);
                } else {
                  setIsOpen(false);
                }
              }} 
            />
            <svg fill="none" viewBox="0 0 50 50" height="32" width="32">
              <path className="lineTop line" strokeLinecap="round" strokeWidth="4" stroke="currentColor" d="M6 11L44 11"></path>
              <path className="lineMid line" strokeLinecap="round" strokeWidth="4" stroke="currentColor" d="M6 24H43"></path>
              <path className="lineBottom line" strokeLinecap="round" strokeWidth="4" stroke="currentColor" d="M6 37H43"></path>
            </svg>
          </label>
        </div>
        
        <nav className="as-nav" ref={navRef} onScroll={handleNavScroll}>
          <div className="as-nav-section">MAIN</div>
          <Link to="/admin/dashboard" onClick={closeSidebar} className={`as-nav-item ${location.pathname === '/admin/dashboard' ? 'active' : ''}`} title="Dashboard">
            <div className="as-nav-icon"><LayoutDashboard size={20} /></div>
            <span className="as-nav-label">Dashboard</span>
          </Link>
          <Link to="/admin/document-requests" onClick={closeSidebar} className={`as-nav-item ${(location.pathname.includes('/admin/document-requests') && location.state?.from !== '/admin/payment' && location.state?.from !== '/admin/completed' && location.state?.from !== '/admin/trash') ? 'active' : ''}`} title="Document Requests">
            <div className="as-nav-icon"><FileText size={20} /></div>
            <span className="as-nav-label">Document Requests</span>
          </Link>
          <Link to="/admin/payment" onClick={closeSidebar} className={`as-nav-item ${(location.pathname.includes('/admin/payment') || (location.pathname.includes('/admin/document-requests') && location.state?.from === '/admin/payment')) ? 'active' : ''}`} title="Payment">
            <div className="as-nav-icon"><CreditCard size={20} /></div>
            <span className="as-nav-label">Payment</span>
          </Link>
          <Link to="/admin/completed" onClick={closeSidebar} className={`as-nav-item ${(location.pathname.includes('/admin/completed') || (location.pathname.includes('/admin/document-requests') && location.state?.from === '/admin/completed')) ? 'active' : ''}`} title="Completed">
            <div className="as-nav-icon"><CheckCircle size={20} /></div>
            <span className="as-nav-label">Completed</span>
          </Link>
          <Link to="/admin/trash" onClick={closeSidebar} className={`as-nav-item ${(location.pathname.includes('/admin/trash') || (location.pathname.includes('/admin/document-requests') && location.state?.from === '/admin/trash')) ? 'active' : ''}`} title="Trash">
            <div className="as-nav-icon"><Trash2 size={20} /></div>
            <span className="as-nav-label">Trash</span>
          </Link>
          <Link to="/admin/document-validation" onClick={closeSidebar} className={`as-nav-item ${location.pathname.includes('/admin/document-validation') ? 'active' : ''}`} title="Document Validation">
            <div className="as-nav-icon"><FileCheck size={20} /></div>
            <span className="as-nav-label">Document Validation</span>
          </Link>

          <div className="as-nav-section">RESIDENTS</div>
          <Link to="/admin/resident-approval" onClick={closeSidebar} className={`as-nav-item ${(location.pathname.includes('/admin/resident-approval') || (location.pathname.includes('/admin/residents') && location.state?.from === 'approval')) ? 'active' : ''}`} title="Registration Approval">
            <div className="as-nav-icon"><UserPlus size={20} /></div>
            <span className="as-nav-label">Registration Approval</span>
          </Link>
          <Link to="/admin/residents" onClick={closeSidebar} className={`as-nav-item ${(location.pathname.includes('/admin/residents') && location.state?.from !== 'approval') ? 'active' : ''}`} title="Register Residents">
            <div className="as-nav-icon"><Users size={20} /></div>
            <span className="as-nav-label">Register Residents</span>
          </Link>
          <Link to="/admin/inbox" onClick={closeSidebar} className={`as-nav-item ${location.pathname.includes('/admin/inbox') ? 'active' : ''}`} title="Inbox">
            <div className="as-nav-icon"><Mail size={20} /></div>
            <span className="as-nav-label">Inbox</span>
          </Link>

          <div className="as-nav-section">MANAGEMENT</div>
          <Link to="/admin/reports" onClick={closeSidebar} className={`as-nav-item ${location.pathname.includes('/admin/reports') ? 'active' : ''}`} title="Reports">
            <div className="as-nav-icon"><BarChart2 size={20} /></div>
            <span className="as-nav-label">Reports</span>
          </Link>
          <Link to="/admin/settings" onClick={closeSidebar} className={`as-nav-item ${location.pathname.includes('/admin/settings') ? 'active' : ''}`} title="System Settings">
            <div className="as-nav-icon"><Settings size={20} /></div>
            <span className="as-nav-label">System Settings</span>
          </Link>
          <Link to="/admin/security-logs" onClick={closeSidebar} className={`as-nav-item ${location.pathname.includes('/admin/security-logs') ? 'active' : ''}`} title="Security Logs">
            <div className="as-nav-icon"><ShieldCheck size={20} /></div>
            <span className="as-nav-label">Security Logs</span>
          </Link>

          <div className="as-nav-section">ACCOUNT</div>
          <Link to="/admin/profile" onClick={closeSidebar} className={`as-nav-item ${location.pathname.includes('/admin/profile') ? 'active' : ''}`} title="Profile">
            <div className="as-nav-icon"><UserCircle size={20} /></div>
            <span className="as-nav-label">Profile</span>
          </Link>
          <button className="as-nav-item" onClick={handleLogout} title="Logout">
            <div className="as-nav-icon"><LogOut size={20} /></div>
            <span className="as-nav-label">Logout</span>
          </button>
        </nav>

        {/* Bottom Profile Section */}
        <div className="as-profile-section" title={isCollapsed ? adminData.fullName : ""}>
          <div className="as-avatar-container">
            {adminData.photoUrl ? (
              <img src={adminData.photoUrl} alt="Profile" className="as-avatar" />
            ) : (
              <User size={24} color="#a0aec0" />
            )}
          </div>
          
          <div className="as-profile-info">
            <div className="as-profile-name">
              {adminData.fullName}
            </div>
            <div className="as-profile-badges">
              <span className="as-badge id">
                {adminData.role}
              </span>
            </div>
          </div>
        </div>
        
      </aside>
    </>
  );
}
