import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Lock, Unlock, EyeOff, Eye, Home, ShieldCheck } from 'lucide-react';
import { auth, db } from '../../database/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { 
  showLoginFailedAlert, 
  showLoginSuccessAlert, 
  showAccountNotFoundAlert, 
  showIncorrectPasswordAlert, 
  showMissingInformationAlert, 
  showEmailNotVerifiedAlert, 
  showAccountDisabledAlert, 
  showLogoutSuccessAlert, 
  showSessionExpiredAlert,
  showGmailDoesNotExistAlert,
  showAccountPendingAlert,
  showAccountRejectedAlert
} from '../../utils/sweetAlerts';
import { logAdminActivity as logActivity } from '../../utils/activityLogger';
import { logLoginEvent, getLocationWithConsent } from '../../utils/auditLogger';
import { functions } from '../../database/firebase';
import { httpsCallable } from 'firebase/functions';
import '../../lib/login.css';
import LoginBg from '../../assets/image/login bg.png';
import Swal from 'sweetalert2';

export default function UserLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.title = "BDRS Resident Portal";
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [lockedUntilTime, setLockedUntilTime] = useState(null);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    if (!email) {
      setIsLocked(false);
      setLockoutRemaining(0);
      setLockedUntilTime(null);
      setFailedAttempts(0);
      return;
    }
    const lockDataStr = localStorage.getItem(`resident_lockout_${email.trim().toLowerCase()}`);
    if (lockDataStr) {
      try {
        const lockData = JSON.parse(lockDataStr);
        setFailedAttempts(lockData.attempts || 0);
        const remainingMs = lockData.lockedUntil - Date.now();
        if (remainingMs > 0) {
          setIsLocked(true);
          setLockedUntilTime(lockData.lockedUntil);
          setLockoutRemaining(Math.ceil(remainingMs / 1000));
        } else {
          setIsLocked(false);
          setLockoutRemaining(0);
          setLockedUntilTime(null);
        }
      } catch (e) {}
    } else {
      setFailedAttempts(0);
      setIsLocked(false);
      setLockoutRemaining(0);
    }
  }, [email]);

  useEffect(() => {
    let interval = null;
    if (isLocked && lockedUntilTime) {
      interval = setInterval(() => {
        const remainingMs = lockedUntilTime - Date.now();
        if (remainingMs <= 0) {
          clearInterval(interval);
          setIsLocked(false);
          setLockoutRemaining(0);
          setJustUnlocked(true);
        } else {
          setLockoutRemaining(Math.ceil(remainingMs / 1000));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLocked, lockedUntilTime]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getLockoutDuration = (attempts) => {
    switch (attempts) {
      case 3: return 15 * 1000;
      case 4: return 30 * 1000;
      case 5: return 60 * 1000;
      case 6: return 2 * 60 * 1000;
      case 7: return 5 * 60 * 1000;
      default: return attempts >= 8 ? 30 * 60 * 1000 : 0;
    }
  };

  useEffect(() => {
    if (location.state?.loggedOut) {
      showLogoutSuccessAlert();
      navigate('/user-login', { replace: true, state: {} });
    } else if (location.state?.sessionExpired) {
      showSessionExpiredAlert();
      navigate('/user-login', { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      showMissingInformationAlert();
      return;
    }
    
    // Clear unlock message when attempting a new login
    if (justUnlocked) setJustUnlocked(false);

    if (isLocked) {
      showLoginFailedAlert(`Account temporarily locked. Please try again in ${formatTime(lockoutRemaining)}.`);
      return;
    }

    setLoading(true);

    const locationOverride = await getLocationWithConsent(true);
    if (!locationOverride) {
      setLoading(false);
      return;
    }

    try {
      // Block admin from user portal before database check
      if (email.trim().toLowerCase() === 'mcmae123@gmail.com') {
        await logLoginEvent({ event: 'Admin Blocked', result: 'failed', details: 'Admin attempted to login via resident portal', email: email.trim(), role: 'Admin', method: 'Email/Password', locationOverride });
        showLoginFailedAlert('Admin accounts must log in at the Administrator Portal.');
        setLoading(false);
        return;
      }

      await setPersistence(auth, browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      if (user.emailVerified === false && import.meta.env.VITE_REQUIRE_EMAIL_VERIFICATION === 'true') {
        await signOut(auth);
        showEmailNotVerifiedAlert();
        setLoading(false);
        return;
      }

      // Verify resident record in Firestore via UID
      const residentDocRef = doc(db, 'residents', user.uid);
      const residentDocSnap = await getDoc(residentDocRef);

      if (!residentDocSnap.exists()) {
        await logActivity('Failed Login Attempt', 'Account not found in resident records', 'failed_login', email.trim(), 'user');
        await logLoginEvent({ event: 'Resident Login Blocked', result: 'failed', details: 'Authenticated but no resident profile found', email: user.email, actorId: user.uid, role: 'Resident', method: 'Email/Password', locationOverride });
        await signOut(auth);
        showLoginFailedAlert('Account not found in resident records. Please register as a resident first.');
        setLoading(false);
        return;
      }

      const residentData = residentDocSnap.data();

      if (residentData.status === 'Disabled' || residentData.status === 'Blocked' || residentData.status === 'Disabled Account') {
        await logActivity('Failed Login Attempt', `Account is ${residentData.status}`, 'failed_login', email.trim(), 'user');
        await signOut(auth);
        showAccountDisabledAlert();
        setLoading(false);
        return;
      }
      
      if (residentData.status === 'Pending') {
        await logActivity('Failed Login Attempt', `Account is Pending`, 'failed_login', email.trim(), 'user');
        await signOut(auth);
        showAccountPendingAlert();
        setLoading(false);
        return;
      }

      if (residentData.status === 'Rejected') {
        await logActivity('Failed Login Attempt', `Account is Rejected`, 'failed_login', email.trim(), 'user');
        await signOut(auth);
        showAccountRejectedAlert();
        setLoading(false);
        return;
      }

      // We already verified residentData.status is Approved via Firestore.
      // Firestore rules also use document-based validation (isApprovedResident).
      // We no longer need to enforce custom claims here.

      sessionStorage.setItem('isResident', 'true');

      // Update resident document with login status and reset lockouts
      try {
        await updateDoc(residentDocRef, {
          login_status: 'Active',
          last_login: serverTimestamp(),
          last_seen: serverTimestamp(),
          failed_attempts: 0,
          locked_until: null
        });
      } catch (statusErr) {
        console.error("Error updating resident login status:", statusErr);
      }

      await logActivity('Logged in', 'Resident successfully authenticated', 'login', user.email, 'user');
      await logLoginEvent({ event: 'Resident Login Successful', result: 'success', details: 'Successfully authenticated', email: user.email, role: 'Resident', method: 'Email/Password', locationOverride });
      
      localStorage.removeItem(`resident_lockout_${email.trim().toLowerCase()}`);
      setFailedAttempts(0);
      try {
        await setDoc(doc(db, 'lockouts', email.trim().toLowerCase()), { failed_attempts: 0, locked_until: null }, { merge: true });
      } catch (e) {}
      
      showLoginSuccessAlert();
      navigate('/user-dashboard');
    } catch (err) {
      console.log('Login error code:', err.code);

      await logLoginEvent({ event: 'Resident Login Failed', result: 'failed', details: err.message || err.code, email: email.trim(), role: 'Resident', method: 'Email/Password', locationOverride });
      
      if (err.code === 'auth/user-not-found') {
        showGmailDoesNotExistAlert();
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        
        const lockoutDuration = getLockoutDuration(newAttempts);
        if (lockoutDuration > 0) {
          const lockedUntil = Date.now() + lockoutDuration;
          localStorage.setItem(`resident_lockout_${email.trim().toLowerCase()}`, JSON.stringify({
            attempts: newAttempts,
            lockedUntil
          }));
          try {
            await setDoc(doc(db, 'lockouts', email.trim().toLowerCase()), { failed_attempts: newAttempts, locked_until: lockedUntil }, { merge: true });
          } catch (e) {}
          setIsLocked(true);
          setLockedUntilTime(lockedUntil);
          setLockoutRemaining(Math.ceil(lockoutDuration / 1000));
        } else {
          localStorage.setItem(`resident_lockout_${email.trim().toLowerCase()}`, JSON.stringify({
            attempts: newAttempts,
            lockedUntil: 0
          }));
          try {
            await setDoc(doc(db, 'lockouts', email.trim().toLowerCase()), { failed_attempts: newAttempts, locked_until: null }, { merge: true });
          } catch (e) {}
        }
        
        showLoginFailedAlert('Invalid email or password.');
      } else if (err.code === 'auth/user-disabled') {
        showAccountDisabledAlert();
      } else if (err.code === 'auth/too-many-requests') {
        showLoginFailedAlert('Too many failed login attempts. Please try again later.');
      } else {
        showLoginFailedAlert(`Unexpected Error: ${err.code || err.message || 'Unknown'}`);
      }
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-background" style={{ backgroundImage: `url("${LoginBg}")` }}>
        <div className="login-overlay"></div>
      </div>
      
      <div className="login-content">
        <div className="login-header">
          <h1>Welcome Resident</h1>
          <p>Login to your account to continue<br/>using the Barangay Service System.</p>
        </div>

        <div className="login-card">
          <form className="login-form" onSubmit={handleLogin}>
            
            {isLocked && (
              <div style={{ backgroundColor: '#fed7d7', color: '#c53030', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', border: '1px solid #feb2b2' }}>
                <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '5px' }}>
                  <Lock size={18} /> Account Temporarily Locked
                </div>
                <div style={{ fontSize: '0.9rem', marginBottom: '5px' }}>Too many failed login attempts.</div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Please try again in {formatTime(lockoutRemaining)}.</div>
              </div>
            )}
            
            {justUnlocked && !isLocked && (
              <div style={{ backgroundColor: '#c6f6d5', color: '#2f855a', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', border: '1px solid #9ae6b4' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Unlock size={18} /> Your account is unlocked. You may try logging in again.
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <div className="input-wrapper">
                <User className="input-icon" size={20} />
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              </div>
              <div style={{ textAlign: 'right', marginTop: '8px' }}>
                <span 
                  onClick={() => navigate('/forgot-password')} 
                  style={{ color: '#2563eb', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}
                  onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                >
                  Forgot Password?
                </span>
              </div>
            </div>

            <button type="submit" className="btn-login" disabled={loading || isLocked}>
              <Lock size={18} />
              {loading ? (
                <span className="loading-dots-container">
                  Logging in
                  <span className="loading-dots">
                    <span className="dot dot-1">.</span>
                    <span className="dot dot-2">.</span>
                    <span className="dot dot-3">.</span>
                  </span>
                </span>
              ) : (
                'Login'
              )}
            </button>

            <div className="divider">
              <span>or</span>
            </div>

            <button type="button" className="btn-staff" onClick={() => navigate('/')}>
              <Home size={18} /> Back to Home Page
            </button>
          </form>

          <div className="login-footer">
            <ShieldCheck size={16} /> Secure login. Your information is safe with us.
          </div>
        </div>
      </div>
    </div>
  );
}
