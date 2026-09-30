import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../database/firebase';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

const PinVerificationScreen = ({ residentData, onVerifySuccess, onLogout }) => {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [isCreating, setIsCreating] = useState(!residentData?.pinCodeHash);
  const [step, setStep] = useState(1); 
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const isNativeApp = window.Capacitor !== undefined || window.electron !== undefined || navigator.userAgent.toLowerCase().includes('electron');
  const API_BASE_URL = import.meta.env.VITE_VERCEL_API_URL || (isNativeApp ? 'https://bdrs-five.vercel.app' : '');
  
  const hashPin = async (pinStr) => {
    const msgBuffer = new TextEncoder().encode(pinStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleInputChange = (index, value) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    if (sanitized === '' && value !== '') return;
    
    const newPin = [...pin];
    newPin[index] = sanitized;
    setPin(newPin);
    setError('');
    
    if (sanitized && index < 5) {
      document.getElementById(`pin-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      document.getElementById(`pin-${index - 1}`)?.focus();
    }
  };

  const handleConfirm = async () => {
    const currentPinStr = pin.join('');
    if (currentPinStr.length !== 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setIsProcessing(true);
    if (isCreating) {
      if (step === 1) {
        setFirstPin(currentPinStr);
        setPin(['', '', '', '', '', '']);
        setStep(2);
        setTimeout(() => document.getElementById('pin-0')?.focus(), 50);
        setIsProcessing(false);
      } else {
        if (currentPinStr === firstPin) {
          try {
            const hashedPin = await hashPin(currentPinStr);
            await updateDoc(doc(db, 'residents', auth.currentUser.uid), { pinCodeHash: hashedPin });
            onVerifySuccess();
          } catch (e) {
            setError('Failed to save PIN.');
            setIsProcessing(false);
          }
        } else {
          setError('PINs do not match. Try again.');
          setPin(['', '', '', '', '', '']);
          setStep(1);
          setFirstPin('');
          setTimeout(() => document.getElementById('pin-0')?.focus(), 50);
          setIsProcessing(false);
        }
      }
    } else {
      const hashedPin = await hashPin(currentPinStr);
      if (hashedPin === residentData?.pinCodeHash) {
        onVerifySuccess();
      } else {
        setError('Incorrect PIN.');
        setPin(['', '', '', '', '', '']);
        setTimeout(() => document.getElementById('pin-0')?.focus(), 50);
        setIsProcessing(false);
      }
    }
  };

  const handleForgotPin = async () => {
    if (!auth.currentUser || !auth.currentUser.email) return;
    const email = auth.currentUser.email;

    const { isConfirmed } = await Swal.fire({
      title: 'Reset PIN',
      text: `Send a verification code to ${email}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Send Code',
      cancelButtonText: 'Cancel'
    });

    if (isConfirmed) {
      setIsProcessing(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/request-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, type: 'pin' })
        });
        const data = await res.json();
        
        if (data.success) {
          setIsProcessing(false);
          const { value: otpValue } = await Swal.fire({
            title: 'Enter Verification Code',
            html: `
              <div style="font-size: 14px; color: #6b7280; margin-bottom: 15px;">Code sent to ${email}</div>
              <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 10px;">
                ${Array.from({length: 6}, (_, i) => `<input id="swal-otp-${i}" type="password" inputmode="numeric" maxlength="1" style="width: 45px; height: 55px; font-size: 24px; text-align: center; border-radius: 8px; border: 1px solid #d1d5db; outline: none; background-color: #f9fafb; transition: border-color 0.2s;" />`).join('')}
              </div>
            `,
            didOpen: () => {
              const inputs = Array.from({length: 6}, (_, i) => document.getElementById(`swal-otp-${i}`));
              inputs[0].focus();
              
              inputs.forEach((el, idx) => {
                 el.addEventListener('focus', () => el.style.borderColor = '#3b82f6');
                 el.addEventListener('blur', () => el.style.borderColor = '#d1d5db');
                 el.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                    if (pastedData) {
                       pastedData.split('').forEach((char, i) => {
                          if (inputs[idx + i]) inputs[idx + i].value = char;
                       });
                       const nextIdx = Math.min(idx + pastedData.length, 5);
                       inputs[nextIdx].focus();
                    }
                 });
                 el.addEventListener('keydown', (e) => {
                    if (e.key === 'Backspace' && !el.value && idx > 0) {
                        inputs[idx - 1].focus();
                        inputs[idx - 1].value = '';
                    } else if (e.key >= '0' && e.key <= '9' && el.value) {
                        el.value = '';
                    }
                 });
                 el.addEventListener('input', (e) => {
                    if (el.value && idx < 5) inputs[idx + 1].focus();
                 });
              });
            },
            showCancelButton: true,
            confirmButtonText: 'Verify',
            preConfirm: async () => {
              const otp = Array.from({length: 6}, (_, i) => document.getElementById(`swal-otp-${i}`).value).join('');
              if (!otp || otp.length !== 6) {
                Swal.showValidationMessage('Please enter a 6-digit code');
                return false;
              }
              try {
                const verifyRes = await fetch(`${API_BASE_URL}/api/verify-otp`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ requestId: data.requestId, otp })
                });
                const verifyData = await verifyRes.json();
                if (!verifyData.success) {
                  Swal.showValidationMessage('Invalid or expired code');
                  return false;
                }
                return true;
              } catch (e) {
                Swal.showValidationMessage('Verification failed');
                return false;
              }
            }
          });

          if (otpValue) {
            await updateDoc(doc(db, 'residents', auth.currentUser.uid), { pinCodeHash: null });
            Swal.fire({
              title: 'PIN Removed',
              text: 'Your PIN has been reset. Please set a new one in your profile.',
              icon: 'success',
              timer: 4000,
              showConfirmButton: false
            });
            onVerifySuccess(); // Immediately log them in
          }
        } else {
          setIsProcessing(false);
          Swal.fire('Error', data.message || 'Failed to send OTP.', 'error');
        }
      } catch (err) {
        setIsProcessing(false);
        Swal.fire('Error', 'Service temporarily unavailable.', 'error');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
        <h2 style={{ marginBottom: '10px', color: '#1f2937', marginTop: 0 }}>
          {isCreating ? (step === 1 ? 'Create PIN' : 'Confirm PIN') : 'Enter PIN'}
        </h2>
        <p style={{ color: '#6b7280', marginBottom: '25px', fontSize: '0.95rem' }}>
          {isCreating 
            ? (step === 1 ? 'Enter a 6-digit PIN to secure your account.' : 'Re-enter your 6-digit PIN to confirm.')
            : 'Please enter your 6-digit PIN to access your dashboard.'}
        </p>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '25px' }}>
          {pin.map((digit, idx) => (
            <input
              key={idx}
              id={`pin-${idx}`}
              type="password"
              inputMode="numeric"
              maxLength="1"
              value={digit}
              onChange={(e) => handleInputChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              style={{ width: '45px', height: '55px', fontSize: '24px', textAlign: 'center', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          ))}
        </div>
        
        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '20px', marginTop: '-10px' }}>{error}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button onClick={handleConfirm} disabled={isProcessing} style={{ padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: isProcessing ? 'not-allowed' : 'pointer', fontSize: '1rem', opacity: isProcessing ? 0.7 : 1 }}>
            {isProcessing ? 'Processing...' : (isCreating && step === 1 ? 'Next' : 'Confirm')}
          </button>
          <button onClick={onLogout} disabled={isProcessing} style={{ padding: '12px', backgroundColor: 'transparent', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: 'bold', cursor: isProcessing ? 'not-allowed' : 'pointer', fontSize: '1rem' }}>
            Logout
          </button>
        </div>

        {!isCreating && (
          <div style={{ marginTop: '20px' }}>
            <button onClick={handleForgotPin} disabled={isProcessing} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}>
              Forgot PIN?
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ResidentProtectedRoute = ({ children }) => {
  const { userRole, loading, sessionExpired, logoutSession } = useAuth();
  const location = useLocation();
  const [isPinVerified, setIsPinVerified] = useState(sessionStorage.getItem('pinVerified') === 'true');
  const [residentData, setResidentData] = useState(null);
  const [checkingPinStatus, setCheckingPinStatus] = useState(true);

  // Fetch resident data for PIN check
  useEffect(() => {
    const fetchResident = async () => {
      if (userRole === 'resident' && auth.currentUser) {
        try {
          const snap = await getDoc(doc(db, 'residents', auth.currentUser.uid));
          if (snap.exists()) {
            setResidentData(snap.data());
          }
        } catch (e) {
          console.error(e);
        }
      }
      setCheckingPinStatus(false);
    };
    
    if (!loading && userRole === 'resident') {
      fetchResident();
    } else if (!loading) {
      setCheckingPinStatus(false);
    }
  }, [userRole, loading]);

  // Session expiration logic
  useEffect(() => {
    if (loading || userRole !== 'resident') return;

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
          await logoutSession();
        } catch (error) {
          console.error("Logout error on session expiration", error);
        }
      } else {
        // Heartbeat
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

  if (loading || checkingPinStatus) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (userRole !== 'resident') {
    return <Navigate to="/user-login" state={{ from: location, sessionExpired: sessionExpired }} replace />;
  }

  if (!isPinVerified) {
    return (
      <PinVerificationScreen 
        residentData={residentData} 
        onVerifySuccess={() => {
          sessionStorage.setItem('pinVerified', 'true');
          setIsPinVerified(true);
        }} 
        onLogout={logoutSession} 
      />
    );
  }

  return children ? children : <Outlet />;
};

export default ResidentProtectedRoute;
