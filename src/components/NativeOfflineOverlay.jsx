import React, { useState, useEffect } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';
import { isNativeApp } from '../utils/platform';

export default function NativeOfflineOverlay() {
  
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    if (!isNativeApp) return;

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Optional: continuous ping to check real internet access in Native App
    let isMounted = true;
    const interval = setInterval(async () => {
      if (!navigator.onLine) {
        if (isMounted) setIsOffline(true);
        return;
      }
      try {
        const pingUrl = `https://bdrs-five.vercel.app/favicon.ico?cb=${Date.now()}_${Math.random()}`;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 5000);
        
        await fetch(pingUrl, { 
          method: 'HEAD', 
          cache: 'no-store',
          signal: controller.signal
        });
        
        clearTimeout(id);
        if (isMounted && isOffline) setIsOffline(false);
      } catch (err) {
        if (isMounted) setIsOffline(true);
      }
    }, 5000); // Check every 5 seconds

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isNativeApp, isOffline]);

  if (!isNativeApp || !isOffline) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      zIndex: 999999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        animation: 'pulse 2s infinite',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <WifiOff size={64} color="#e53e3e" style={{ marginBottom: '20px' }} />
        
        <h2 style={{ color: '#2d3748', margin: '0 0 10px 0', fontSize: '1.5rem' }}>Connection Lost</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Loader2 size={20} color="#3182ce" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#718096', margin: 0, fontSize: '1rem', fontWeight: 500 }}>
            Reconnecting to the server...
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.7; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.7; transform: scale(0.98); }
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
