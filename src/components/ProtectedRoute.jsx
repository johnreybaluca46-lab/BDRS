import React, { useEffect } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../database/firebase';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { userRole, loading, sessionExpired, logoutSession } = useAuth();
  const location = useLocation();

  // Session expiration logic
  useEffect(() => {
    if (loading || userRole !== 'admin') return;

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
          await logoutSession();
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

    // Check every 5 seconds
    timeoutInterval = setInterval(checkInactivity, 5000);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      clearInterval(timeoutInterval);
    };
  }, [loading, userRole, logoutSession]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (userRole !== 'admin') {
    return <Navigate to="/login" state={{ from: location, sessionExpired: sessionExpired }} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
