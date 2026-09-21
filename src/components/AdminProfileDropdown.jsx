import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logLoginEvent, getLocationWithConsent } from '../utils/auditLogger';
import { User, Lock, LogOut, ChevronDown } from 'lucide-react';
import { confirmLogoutAlert } from '../utils/sweetAlerts';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../database/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { logAdminActivity } from '../utils/activityLogger';
import Logo from '../assets/logo/barangay buluan seal.png';

export default function AdminProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [adminInfo, setAdminInfo] = useState(() => {
    const cached = sessionStorage.getItem('adminProfileData');
    return cached ? JSON.parse(cached) : { name: 'Admin', photoURL: null };
  });
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribeDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const docRef = doc(db, 'admin_profiles', user.uid);
        unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const newData = { 
              name: data.fullName || data.username || 'Admin', 
              photoURL: data.photoURL || null 
            };
            setAdminInfo(newData);
            sessionStorage.setItem('adminProfileData', JSON.stringify(newData));
          }
        });
      } else {
        setAdminInfo({ name: 'Admin', photoURL: null });
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

  const handleLogout = () => {
    setIsOpen(false);
    confirmLogoutAlert(async () => {
      try {
        if (auth.currentUser?.email) {
          const locationOverride = await getLocationWithConsent(true);
          await logLoginEvent({ event: 'Logout Successful', result: 'success', email: auth.currentUser.email, role: 'Admin', locationOverride });
        }
        sessionStorage.removeItem('isAdmin');
        await signOut(auth);
        navigate('/login', { state: { loggedOut: true } });
      } catch (error) {
        console.error('Failed to log out', error);
      }
    });
  };

  const navigateTo = (path, state) => {
    setIsOpen(false);
    navigate(path, { state });
  };

  return (
    <div className="admin-profile-container" ref={dropdownRef}>
      <div className="admin-profile-trigger" onClick={() => setIsOpen(!isOpen)}>
        {adminInfo.photoURL ? (
          <img src={adminInfo.photoURL} alt="Admin" className="admin-avatar" style={{ objectFit: 'cover' }} />
        ) : (
          <img src={Logo} alt="Admin" className="admin-avatar" />
        )}
        <span className="admin-name">{adminInfo.name}</span>
        <ChevronDown size={16} color="#4a5568" style={{marginLeft: '4px'}} />
      </div>

      {isOpen && (
        <div className="admin-profile-menu">
          <button className="profile-menu-item" onClick={() => navigateTo('/admin/profile', { tab: 'personal' })}>
            <User size={16} /> Profile
          </button>
          <button className="profile-menu-item" onClick={() => navigateTo('/admin/profile', { tab: 'password' })}>
            <Lock size={16} /> Change Password
          </button>
          <div className="profile-menu-divider"></div>
          <button className="profile-menu-item" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
