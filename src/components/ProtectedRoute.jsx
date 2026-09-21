import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../database/firebase';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('isAdmin') === 'true' ? true : null;
  });
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, 'admin_profiles', user.uid);
          let docSnap = await getDoc(docRef);

          if (!docSnap.exists()) {
            // Save to database automatically if not present
            await setDoc(docRef, {
              fullName: 'Barangay Administrator',
              username: 'admin',
              email: user.email,
              role: 'System Administrator',
              contactNumber: '09123456789',
              dateJoined: new Date().toISOString().split('T')[0],
              address: 'Barangay Hall, Buluan',
              status: 'Active'
            }, { merge: true });
            docSnap = await getDoc(docRef);
          }

          sessionStorage.setItem('isAdmin', 'true');
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Error checking admin profile", error);
          sessionStorage.removeItem('isAdmin');
          setIsAuthenticated(false);
        }
      } else {
        sessionStorage.removeItem('isAdmin');
        setIsAuthenticated(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Session expiration logic
  useEffect(() => {
    if (!isAuthenticated) return;

    let timeoutInterval;

    let lastUpdate = 0;
    const updateActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 5000) {
        localStorage.setItem('lastAdminActivity', now.toString());
        lastUpdate = now;
      }
    };

    let lastSettingFetch = 0;
    let cachedTimeoutSetting = '1800'; // 30 minutes default in seconds

    const checkInactivity = async () => {
      const now = Date.now();
      if (now - lastSettingFetch > 60000) {
        try {
          const docSnap = await getDoc(doc(db, 'settings', 'security'));
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.sessionTimeoutSeconds !== undefined) {
              cachedTimeoutSetting = data.sessionTimeoutSeconds;
            } else if (data.sessionTimeout) {
              cachedTimeoutSetting = data.sessionTimeout === 'disabled' ? 'disabled' : String(parseInt(data.sessionTimeout, 10) * 60);
            }
          }
          lastSettingFetch = now;
        } catch (err) {
          console.error("Error fetching timeout setting", err);
        }
      }
      
      if (cachedTimeoutSetting === 'disabled') return;
      
      const timeoutMs = parseInt(cachedTimeoutSetting, 10) * 1000;
      const lastActivity = parseInt(localStorage.getItem('lastAdminActivity') || '0', 10);
      const currentTime = Date.now();
      
      if (currentTime - lastActivity > timeoutMs) {
        // Session expired
        try {
          await signOut(auth);
          sessionStorage.removeItem('isAdmin');
          sessionStorage.setItem('sessionWasExpired', 'true');
          setIsAuthenticated(false);
          // Assuming the redirect state handling will take care of showing the alert
          // which is handled in login.jsx on location.state.sessionExpired
        } catch (error) {
          console.error("Logout error on session expiration", error);
        }
      }
    };

    // Initialize activity on mount
    updateActivity();

    // Listeners for activity
    window.addEventListener('mousemove', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });
    window.addEventListener('click', updateActivity, { passive: true });
    window.addEventListener('scroll', updateActivity, { passive: true });
    window.addEventListener('touchstart', updateActivity, { passive: true });

    // Check every 5 seconds instead of 1 minute to support custom timeouts like 15 seconds
    timeoutInterval = setInterval(checkInactivity, 5000);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      clearInterval(timeoutInterval);
    };
  }, [isAuthenticated]);

  if (isAuthenticated === null) {
    // Return a loading spinner or null while checking auth state
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    // Check if it was a session expiration
    const timeoutSetting = localStorage.getItem('adminSessionTimeout') || '30';
    const lastActivity = parseInt(localStorage.getItem('lastAdminActivity') || '0', 10);
    let isExpired = sessionStorage.getItem('sessionWasExpired') === 'true';
    if (isExpired) {
      sessionStorage.removeItem('sessionWasExpired');
    } else if (timeoutSetting !== 'disabled' && lastActivity > 0) {
      let timeoutMs = parseInt(timeoutSetting, 10) * 1000;
      if (['15', '30', '60'].includes(timeoutSetting)) {
        timeoutMs *= 60;
      }
      isExpired = (Date.now() - lastActivity > timeoutMs);
    }
    
    // Redirect to login, but save the location they were trying to go to
    return <Navigate to="/login" state={{ from: location, sessionExpired: isExpired }} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
