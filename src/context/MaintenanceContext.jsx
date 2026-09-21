import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../database/firebase';
import { signOut } from 'firebase/auth';

const MaintenanceContext = createContext();

export function MaintenanceProvider({ children }) {
  const [maintenanceData, setMaintenanceData] = useState({ status: 'ended' });
  const [effectiveStatus, setEffectiveStatus] = useState('ended');
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isModalDismissed, setIsModalDismissed] = useState(false);
  const prevStartTimeRef = useRef(null);

  useEffect(() => {
    // 1. Single active Firestore listener
    const unsubscribe = onSnapshot(doc(db, 'settings', 'maintenance'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMaintenanceData(data);
      } else {
        setMaintenanceData({ status: 'ended' });
      }
      setLoading(false);
    }, (error) => {
      console.error("Maintenance Listener Error:", error);
      setLoading(false);
    });

    // Clean up listener on unmount
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkState = () => {
      if (!maintenanceData || !maintenanceData.status) {
        setEffectiveStatus('ended');
        setIsMaintenanceActive(false);
        return;
      }

      const currentStatus = maintenanceData.status;

      if (currentStatus === 'ended') {
        setEffectiveStatus('ended');
        setIsMaintenanceActive(false);
      } else if (currentStatus === 'active') {
        setEffectiveStatus('active');
        setIsMaintenanceActive(true);
      } else if (currentStatus === 'scheduled') {
        const startMillis = maintenanceData.maintenanceStartTime ? 
          (maintenanceData.maintenanceStartTime.toMillis ? maintenanceData.maintenanceStartTime.toMillis() : maintenanceData.maintenanceStartTime) 
          : 0;
        
        if (Date.now() >= startMillis) {
          setEffectiveStatus('active');
          setIsMaintenanceActive(true);
        } else {
          setEffectiveStatus('scheduled');
          setIsMaintenanceActive(false);
        }
      }
    };

    checkState();
    const interval = setInterval(checkState, 1000);
    return () => clearInterval(interval);
  }, [maintenanceData]);

  // Auto-reset dismissed state ONLY when a brand-new maintenance start time is set
  useEffect(() => {
    if (effectiveStatus !== 'scheduled') {
      prevStartTimeRef.current = null;
      return;
    }
    const startTime = maintenanceData?.maintenanceStartTime?.toMillis
      ? maintenanceData.maintenanceStartTime.toMillis()
      : maintenanceData?.maintenanceStartTime;

    if (startTime && startTime !== prevStartTimeRef.current) {
      prevStartTimeRef.current = startTime;
      setIsModalDismissed(false); // only reshow for a genuinely new schedule
    }
  }, [effectiveStatus, maintenanceData?.maintenanceStartTime]);

  // Automatically log out resident users when maintenance becomes active
  useEffect(() => {
    if (effectiveStatus === 'active') {
      const isAdmin = sessionStorage.getItem('isAdmin') === 'true';
      if (!isAdmin && auth.currentUser) {
        signOut(auth).catch(err => console.error('Auto logout error:', err));
      }
    }
  }, [effectiveStatus]);

  if (loading) {
    return <div style={{ display: 'none' }}>Checking system status...</div>; // Minimal hidden loader to prevent flash of content
  }

  return (
    <MaintenanceContext.Provider value={{ isMaintenanceActive, effectiveStatus, maintenanceData, isModalDismissed, setIsModalDismissed }}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export function useMaintenance() {
  return useContext(MaintenanceContext);
}
