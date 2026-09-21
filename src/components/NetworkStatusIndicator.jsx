import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function NetworkStatusIndicator() {
  const [ping, setPing] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let isMounted = true;
    
    const measurePing = async () => {
      if (!navigator.onLine) {
        if (isMounted) setPing(0);
        return;
      }
      try {
        const start = performance.now();
        await fetch(`/favicon.ico?cb=${Date.now()}_${Math.random()}`, { 
          method: 'HEAD', 
          cache: 'no-store' 
        });
        const end = performance.now();
        if (isMounted) setPing(Math.round(end - start));
      } catch (err) {
        if (isMounted) setPing(0);
        setIsOnline(false);
      }
    };

    // Initial check
    measurePing();
    
    // Check every 10 seconds to avoid spamming network
    const interval = setInterval(measurePing, 10000);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const getStatus = () => {
    if (!isOnline || ping === 0) return { color: '#e53e3e', text: 'Offline', icon: <WifiOff size={18} /> }; // Red
    if (ping < 150) return { color: '#38a169', text: `${ping}ms`, icon: <Wifi size={18} /> }; // Green
    if (ping <= 300) return { color: '#d69e2e', text: `${ping}ms`, icon: <Wifi size={18} /> }; // Yellow
    return { color: '#e53e3e', text: `${ping}ms`, icon: <Wifi size={18} /> }; // Red
  };

  const status = getStatus();

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '6px', 
      color: status.color, 
      fontSize: '0.85rem', 
      fontWeight: 600, 
      padding: '4px 10px', 
      borderRadius: '20px', 
      backgroundColor: `${status.color}15`,
      marginRight: '0px'
    }} 
    title={`Network Latency: ${status.text}`}
    className="responsive-header-pill"
    >
      {status.icon}
      <span>{status.text}</span>
    </div>
  );
}
