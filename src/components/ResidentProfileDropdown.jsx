import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { confirmLogoutAlert } from '../utils/sweetAlerts';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../database/firebase';
import { collection, query, where, onSnapshot, getDocs, updateDoc, serverTimestamp, doc } from 'firebase/firestore';
import { logAdminActivity as logActivity } from '../utils/activityLogger';

export default function ResidentProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [residentInfo, setResidentInfo] = useState(() => {
    const cached = sessionStorage.getItem('residentProfileData');
    return cached ? JSON.parse(cached) : { name: 'Resident', photoURL: null };
  });
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribeQuery = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const residentsRef = collection(db, 'residents');
        const q = query(residentsRef, where("userId", "==", user.uid));
        
        unsubscribeQuery = onSnapshot(q, (querySnapshot) => {
          if (!querySnapshot.empty) {
            const data = querySnapshot.docs[0].data();
            const newData = { 
              name: data.fullName || 'Resident', 
              photoURL: data.photo2x2 || null 
            };
            setResidentInfo(newData);
            sessionStorage.setItem('residentProfileData', JSON.stringify(newData));
          }
        });
      } else {
        setResidentInfo({ name: 'Resident', photoURL: null });
        if (unsubscribeQuery) unsubscribeQuery();
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeQuery) unsubscribeQuery();
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
        sessionStorage.removeItem('isResident');
        await signOut(auth);
        navigate('/user-login', { state: { loggedOut: true } });
      } catch (error) {
        console.error('Failed to log out', error);
      }
    });
  };

  const navigateTo = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div className="admin-profile-container" ref={dropdownRef}>
      <div className="admin-profile-trigger" onClick={() => setIsOpen(!isOpen)}>
        {residentInfo.photoURL ? (
          <img src={residentInfo.photoURL} alt="Resident" className="admin-avatar" style={{ objectFit: 'cover' }} />
        ) : (
          <div className="admin-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e2e8f0', borderRadius: '50%', width: '36px', height: '36px' }}>
             <User size={20} color="#718096" />
          </div>
        )}
        <span className="admin-name">{residentInfo.name}</span>
        <ChevronDown size={16} color="#4a5568" style={{marginLeft: '4px'}} />
      </div>

      {isOpen && (
        <div className="admin-profile-menu">
          <button className="profile-menu-item" onClick={() => navigateTo('/user-profile')}>
            <User size={16} /> Profile
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
