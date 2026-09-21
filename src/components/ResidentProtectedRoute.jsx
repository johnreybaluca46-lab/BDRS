import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../database/firebase';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const ResidentProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('isResident') === 'true' ? true : null;
  });
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const residentDocRef = doc(db, 'residents', user.uid);
          let docSnap = await getDoc(residentDocRef);
          
          if (!docSnap.exists() && user.email) {
            const residentsRef = collection(db, 'residents');
            let qEmail = query(residentsRef, where("emailAddress", "==", user.email));
            let querySnapshot = await getDocs(qEmail);
            if (querySnapshot.empty) {
              qEmail = query(residentsRef, where("email", "==", user.email));
              querySnapshot = await getDocs(qEmail);
            }
            if (!querySnapshot.empty) {
              docSnap = querySnapshot.docs[0];
            }
          }

          if (docSnap.exists() || (user.email && user.email.toLowerCase() !== 'mcmae123@gmail.com')) {
            sessionStorage.setItem('isResident', 'true');
            setIsAuthenticated(true);
          } else {
            sessionStorage.removeItem('isResident');
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error("Error checking resident profile", error);
          if (user.email && user.email.toLowerCase() !== 'mcmae123@gmail.com') {
            sessionStorage.setItem('isResident', 'true');
            setIsAuthenticated(true);
          } else {
            sessionStorage.removeItem('isResident');
            setIsAuthenticated(false);
          }
        }
      } else {
        sessionStorage.removeItem('isResident');
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
        localStorage.setItem('lastResidentActivity', now.toString());
        lastUpdate = now;
      }
    };

    let lastSettingFetch = 0;
    let cachedTimeoutSetting = '1800'; // 30 minutes default in seconds
    let lastHeartbeatUpdate = 0;

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

      const SESSION_TIMEOUT_MS = parseInt(cachedTimeoutSetting, 10) * 1000;
      const lastActivity = parseInt(localStorage.getItem('lastResidentActivity') || '0', 10);
      const currentTime = Date.now();
      
      if (currentTime - lastActivity > SESSION_TIMEOUT_MS) {
        // Session expired
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
              console.error("Error updating inactive status", updateErr);
            }
          }

          await signOut(auth);
          sessionStorage.removeItem('isResident');
          sessionStorage.setItem('sessionWasExpired', 'true');
          setIsAuthenticated(false);
        } catch (error) {
          console.error("Logout error on session expiration", error);
        }
      } else {
        // Heartbeat: If user was active recently, update last_seen in Firestore
        // Throttle this to once a minute to prevent excessive writes
        if (currentTime - lastActivity < 65000 && currentTime - lastHeartbeatUpdate > 60000) {
          const user = auth.currentUser;
          if (user) {
            try {
              const residentDocRef = doc(db, 'residents', user.uid);
              await updateDoc(residentDocRef, {
                last_seen: serverTimestamp()
              });
              lastHeartbeatUpdate = currentTime;
            } catch (err) {
              console.error("Error updating heartbeat", err);
            }
          }
        }
      }
    };

    // Initialize activity on mount
    updateActivity();

    window.addEventListener('mousemove', updateActivity, { passive: true });
    window.addEventListener('keydown', updateActivity, { passive: true });
    window.addEventListener('click', updateActivity, { passive: true });
    window.addEventListener('scroll', updateActivity, { passive: true });
    window.addEventListener('touchstart', updateActivity, { passive: true });

    // Check every 5 seconds instead of 1 minute to support custom timeouts
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
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!isAuthenticated) {
    // Check if it was a session expiration
    let isExpired = sessionStorage.getItem('sessionWasExpired') === 'true';
    if (isExpired) {
      sessionStorage.removeItem('sessionWasExpired');
    } else {
      const lastActivity = parseInt(localStorage.getItem('lastResidentActivity') || '0', 10);
      const timeoutSetting = localStorage.getItem('adminSessionTimeout') || '1800';
      let SESSION_TIMEOUT_MS_FROM_LOCAL = parseInt(timeoutSetting, 10) * 1000;
      if (['15', '30', '60'].includes(timeoutSetting)) {
        SESSION_TIMEOUT_MS_FROM_LOCAL *= 60;
      }
      isExpired = lastActivity > 0 && (Date.now() - lastActivity > SESSION_TIMEOUT_MS_FROM_LOCAL);
    }

    return <Navigate to="/user-login" state={{ from: location, sessionExpired: isExpired }} replace />;
  }

  return children ? children : <Outlet />;
};

export default ResidentProtectedRoute;
