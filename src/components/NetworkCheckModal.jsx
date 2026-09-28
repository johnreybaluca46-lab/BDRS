import React, { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';
import '../lib/admin-layout.css';

export default function NetworkCheckModal({ isOpen, onClose, onProceed }) {
  const [status, setStatus] = useState('checking'); // 'checking', 'green', 'yellow', 'red'
  const [pingResult, setPingResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const timeoutRef = useRef(null);
  const proceedTimeoutRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      // Cleanup on close
      setStatus('checking');
      setPingResult(null);
      setErrorMsg('');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (proceedTimeoutRef.current) clearTimeout(proceedTimeoutRef.current);
      return;
    }

    let isMounted = true;

    const performCheck = async () => {
      setStatus('checking');
      setPingResult(null);
      setErrorMsg('');

      if (!navigator.onLine) {
        if (isMounted) {
          setStatus('red');
          setErrorMsg('You appear to be offline.');
        }
        return;
      }

      const pings = [];
      const testCount = 3;
      const timeoutMs = 2000;

      for (let i = 0; i < testCount; i++) {
        if (!navigator.onLine) {
          if (isMounted) {
            setStatus('red');
            setErrorMsg('Network disconnected during test.');
          }
          return;
        }

        const start = Date.now();
        try {
          // Using a cache-busting query parameter and cache: 'no-store'
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeoutMs);
          
          // Fetch a small file (favicon) to check latency
          const isNativeApp = window.Capacitor !== undefined || window.electron !== undefined || navigator.userAgent.toLowerCase().includes('electron');
          const pingUrl = isNativeApp ? `https://bdrs-five.vercel.app/favicon.ico?cb=${Date.now()}_${Math.random()}` : `/favicon.ico?cb=${Date.now()}_${Math.random()}`;
          await fetch(pingUrl, {
            method: 'HEAD',
            cache: 'no-store',
            signal: controller.signal
          });
          
          clearTimeout(id);
          const end = Date.now();
          pings.push(end - start);
        } catch (err) {
          // Individual test failed (e.g. timeout)
          // we continue with the remaining attempts unless offline
          if (err.name === 'AbortError') {
             // Timeout implies very high latency
             pings.push(timeoutMs);
          } else {
             // Other error implies high latency or failure
             pings.push(timeoutMs);
          }
        }
      }

      if (!isMounted) return;

      const avgPing = Math.floor(pings.reduce((a, b) => a + b, 0) / pings.length);
      setPingResult(avgPing);

      if (avgPing < 150) {
        setStatus('green');
      } else if (avgPing <= 300) {
        setStatus('yellow');
        setErrorMsg('Your connection is slightly delayed.');
      } else {
        setStatus('red');
        setErrorMsg('Your connection is lagging or unstable.');
      }
    };

    // Add a slight delay before starting to show the UI nicely
    timeoutRef.current = setTimeout(() => {
      performCheck();
    }, 500);

    return () => {
      isMounted = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (proceedTimeoutRef.current) clearTimeout(proceedTimeoutRef.current);
    };
  }, [isOpen]); // Added onClose, onProceed if they change, but usually they are stable.

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 10005 }}>
      <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px 20px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', color: '#2d3748' }}>Network Check</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '150px', justifyContent: 'center' }}>
          {status === 'checking' && (
            <>
              <div style={{ marginBottom: '15px' }}>
                <Loader2 size={48} color="#3182ce" className="spin-animation" style={{ animation: 'spin 1s linear infinite' }} />
                <style>{`
                  @keyframes spin { 100% { transform: rotate(360deg); } }
                `}</style>
              </div>
              <p style={{ color: '#718096', fontSize: '0.95rem' }}>Testing your connection speed...</p>
            </>
          )}

          {status === 'green' && (
            <>
              <div style={{ marginBottom: '15px', color: '#38a169', animation: 'pulse 1.5s ease-in-out infinite' }}>
                <Wifi size={56} />
                <style>{`
                  @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
                `}</style>
              </div>
              <h3 style={{ color: '#276749', margin: '0 0 10px 0' }}>Connection Good</h3>
              <p style={{ color: '#4a5568', fontSize: '0.9rem', marginBottom: '5px' }}>Latency: {pingResult}ms</p>
              <p style={{ color: '#718096', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '20px' }}>Your network is fast and stable.</p>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', width: '100%' }}>
                <button 
                  onClick={onClose}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e0', background: 'white', color: '#4a5568', cursor: 'pointer', flex: 1, fontWeight: '500' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => { onProceed(); onClose(); }}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#38a169', color: 'white', cursor: 'pointer', flex: 1, fontWeight: '500' }}
                >
                  Proceed
                </button>
              </div>
            </>
          )}

          {status === 'yellow' && (
            <>
              <div style={{ marginBottom: '15px', color: '#d69e2e' }}>
                <AlertTriangle size={56} />
              </div>
              <h3 style={{ color: '#975a16', margin: '0 0 10px 0' }}>Connection Delayed</h3>
              <p style={{ color: '#4a5568', fontSize: '0.9rem', marginBottom: '5px' }}>Latency: {pingResult}ms</p>
              <p style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '20px' }}>{errorMsg}</p>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', width: '100%' }}>
                <button 
                  onClick={onClose}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e0', background: 'white', color: '#4a5568', cursor: 'pointer', flex: 1, fontWeight: '500' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => { onProceed(); onClose(); }}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#d69e2e', color: 'white', cursor: 'pointer', flex: 1, fontWeight: '500' }}
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {status === 'red' && (
            <>
              <div style={{ marginBottom: '15px', color: '#e53e3e' }}>
                {navigator.onLine ? <AlertTriangle size={56} /> : <WifiOff size={56} />}
              </div>
              <h3 style={{ color: '#9b2c2c', margin: '0 0 10px 0' }}>Connection Lagging</h3>
              <p style={{ color: '#4a5568', fontSize: '0.9rem', marginBottom: '5px' }}>
                {pingResult ? `Latency: ${pingResult >= 2000 ? '>2000' : pingResult}ms` : 'Offline'}
              </p>
              <p style={{ color: '#718096', fontSize: '0.9rem', marginBottom: '20px' }}>{errorMsg}</p>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', width: '100%' }}>
                <button 
                  onClick={onClose}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e0', background: 'white', color: '#4a5568', cursor: 'pointer', width: '100%', fontWeight: '500' }}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
