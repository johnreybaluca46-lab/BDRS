import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Lock, Unlock, EyeOff, Eye, Home, ShieldCheck } from 'lucide-react';
import { auth, db } from '../../database/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { logLoginEvent, getLocationWithConsent } from '../../utils/auditLogger';
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
  showGmailDoesNotExistAlert
} from '../../utils/sweetAlerts';
import '../../lib/login.css';
import LoginBg from '../../assets/image/login bg.png';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithSession } = useAuth();

  useEffect(() => {
    document.title = "BDRS Administrator portal";
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const [lockedUntilTime, setLockedUntilTime] = useState(null);
  const [justUnlocked, setJustUnlocked] = useState(false);

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
      navigate('/login', { replace: true, state: {} });
    } else if (location.state?.sessionExpired) {
      showSessionExpiredAlert();
      navigate('/login', { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
      if (!email || !password) {
      showMissingInformationAlert();
      return;
    }

    if (justUnlocked) setJustUnlocked(false);

    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      let userCredential;

      // Require GPS location for admins
      const locationOverride = await getLocationWithConsent();
      if (!locationOverride) {
        setLoading(false);
        return;
      }

      // Pre-login check for Admin Lockout
      const adminLockoutRef = doc(db, 'lockouts', 'admin');
      let adminLockoutDoc = null;
      try {
        const lockoutSnap = await getDoc(adminLockoutRef);
        if (lockoutSnap.exists()) {
          adminLockoutDoc = lockoutSnap.data();
          if (adminLockoutDoc.locked_until) {
            const lockedUntilMs = adminLockoutDoc.locked_until;
            if (Date.now() < lockedUntilMs) {
              setIsLocked(true);
              setLockedUntilTime(lockedUntilMs);
              setLockoutRemaining(Math.ceil((lockedUntilMs - Date.now()) / 1000));
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Error reading admin lockout state:", err);
      }

      try {
        const { inMemoryPersistence } = await import('firebase/auth');
        await setPersistence(auth, inMemoryPersistence);
        userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);

      } catch (authErr) {
        console.log('Admin auth error:', authErr.code, authErr.message);

        await logLoginEvent({ 
          event: 'Admin Login Failed', 
          result: 'failed', 
          details: authErr.message || authErr.code, 
          email: trimmedEmail, 
          role: 'Admin',
          method: 'Email/Password',
          locationOverride
        });
        
        let recentlyLocked = false;
        if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
          const currentAttempts = (adminLockoutDoc?.failed_attempts || 0) + 1;
          const updates = { failed_attempts: currentAttempts };
          
          if (currentAttempts >= 3) {
            const lockoutDuration = getLockoutDuration(currentAttempts);
            if (lockoutDuration > 0) {
              const lockedUntilMs = Date.now() + lockoutDuration;
              updates.locked_until = lockedUntilMs;
              setIsLocked(true);
              setLockedUntilTime(lockedUntilMs);
              setLockoutRemaining(Math.ceil(lockoutDuration / 1000));
              recentlyLocked = true;
            }
          }
          try {
            await setDoc(adminLockoutRef, updates, { merge: true });
          } catch (updateErr) {
            console.error("Error updating failed attempts", updateErr);
          }
        }

        if (authErr.code === 'auth/user-not-found') {
          showGmailDoesNotExistAlert();
          setLoading(false);
          return;
        } else if (authErr.code === 'auth/wrong-password' || authErr.code === 'auth/invalid-credential') {
          if (!recentlyLocked) {
            showLoginFailedAlert('Invalid email or password.');
          }
          setLoading(false);
          return;
        } else if (authErr.code === 'auth/user-disabled') {
          showAccountDisabledAlert();
          setLoading(false);
          return;
        } else {
          showLoginFailedAlert(authErr.message || 'Invalid email or password.');
          setLoading(false);
          return;
        }
      }

      const user = userCredential.user;

      if (user.emailVerified === false && import.meta.env.VITE_REQUIRE_EMAIL_VERIFICATION === 'true') {
        await signOut(auth);
        showEmailNotVerifiedAlert();
        setLoading(false);
        return;
      }

      // Verify and initialize admin profile in Firestore
      const adminDocRef = doc(db, 'admin_profiles', user.uid);
      let adminDocSnap = await getDoc(adminDocRef);

      if (!adminDocSnap.exists()) {
        await signOut(auth);
        showLoginFailedAlert('Access Denied: You are not authorized to access the Administrator Portal.');
        setLoading(false);
        return;
      }

      const adminData = adminDocSnap.data();
      if (adminData.status === 'Disabled' || adminData.status === 'Disabled Account') {
        await signOut(auth);
        showAccountDisabledAlert();
        setLoading(false);
        return;
      }

      // Reset attempts
      try {
        await setDoc(adminLockoutRef, { failed_attempts: 0, locked_until: null }, { merge: true });
      } catch (err) {}

      // Secure Session Cookie Login
      try {
        const idToken = await user.getIdToken();
        await loginWithSession(idToken);
      } catch (sessionErr) {
        console.error('Session creation failed:', sessionErr);
        await signOut(auth);
        showLoginFailedAlert(sessionErr.message || 'Failed to create secure session.');
        setLoading(false);
        return;
      }

      logLoginEvent({ event: 'Login Successful', result: 'success', details: 'Successfully authenticated', email: user.email, role: 'Admin', method: 'Email/Password' }).catch(console.error);
      showLoginSuccessAlert();
      redirectUser(user.email);
    } catch (err) {
      console.log('Login error:', err);
      showLoginFailedAlert(err.message || 'Invalid email or password.');
    }
    setLoading(false);
  };

  const redirectUser = (userEmail) => {
    navigate('/admin/dashboard');
  };

  return (
    <div className="login-page">
      <div className="login-background" style={{ backgroundImage: `url("${LoginBg}")` }}>
        <div className="login-overlay"></div>
      </div>
      
      <div className="login-content">
        <div className="login-header">
          <h1>Welcome Administrator</h1>
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
                  autoComplete="off"
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
                  autoComplete="new-password"
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
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
