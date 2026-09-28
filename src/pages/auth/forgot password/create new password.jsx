import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ArrowLeft, Send, Check, ShieldCheck, Lock, Eye, EyeOff, Phone, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { db } from '../../../database/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import '../../../lib/login.css';
import LoginBg from '../../../assets/image/login bg.png';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Use environment variable for the Vercel Backend URL, fallback to local relative path
  const isNativeApp = window.Capacitor !== undefined || window.electron !== undefined || navigator.userAgent.toLowerCase().includes('electron');
  const API_BASE_URL = import.meta.env.VITE_VERCEL_API_URL || (isNativeApp ? 'https://bdrs-five.vercel.app' : '');

  // Step 1: Email
  const [email, setEmail] = useState('');
  
  // Step 2 (Removed, skipping directly to OTP)
  const [requestId, setRequestId] = useState('');

  // Step 3: OTP
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [resetToken, setResetToken] = useState('');

  // Step 4: New Password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
      score: 'BAD',
      criteria: { length: false, upper: false, lower: false, number: false, special: false, notCommon: false }
  });

  useEffect(() => { document.title = "Forgot Password - BDRS"; }, []);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const calculatePasswordStrength = (pwd) => {
      const criteria = {
          length: pwd.length >= 12,
          upper: /[A-Z]/.test(pwd),
          lower: /[a-z]/.test(pwd),
          number: /[0-9]/.test(pwd),
          special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
          notCommon: !/^(password|123456|qwerty|admin|password123|12345678|123456789|1234567890)$/i.test(pwd) && pwd.length > 0
      };
      const metCount = Object.values(criteria).filter(Boolean).length;
      let score = 'BAD';
      if (metCount === 6) score = 'EXCELLENT';
      else if (metCount >= 4 && criteria.length && criteria.notCommon) score = 'GOOD';
      if (pwd.length === 0) score = 'BAD';
      setPasswordStrength({ score, criteria });
  };

  const handlePasswordChange = (e) => {
      setPassword(e.target.value);
      calculatePasswordStrength(e.target.value);
  };

  const handleRequestOTP = async (e) => {
    e?.preventDefault();
    if (!email) {
      return Swal.fire({ title: 'Missing Email', text: 'Please enter your email address.', icon: 'warning', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
    }
    if (countdown > 0) {
      return Swal.fire({ title: 'Please Wait', text: `You can resend in ${countdown}s`, icon: 'info', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
    }

    setLoading(true);
    try {
      // Check if email exists in Firestore (Residents or Admin)
      const emailToCheck = email.trim();
      const residentsRef = collection(db, "residents");
      const qRes = query(residentsRef, where("emailAddress", "==", emailToCheck));
      const resSnapshot = await getDocs(qRes);

      let emailExists = !resSnapshot.empty;

      if (!emailExists) {
        const adminsRef = collection(db, "admin_profiles");
        const qAdmin = query(adminsRef, where("email", "==", emailToCheck));
        const adminSnapshot = await getDocs(qAdmin);
        emailExists = !adminSnapshot.empty;
      }

      if (!emailExists) {
        setLoading(false);
        return Swal.fire({ title: 'Email Not Found', text: 'This gmail does not exist in our records.', icon: 'error', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      }

      const res = await fetch(`${API_BASE_URL}/api/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCheck })
      });
      const data = await res.json();
      
      if (data.success) {
        setRequestId(data.requestId);
        setStep(3);
        setCountdown(60);
        Swal.fire({ title: 'OTP Sent', text: data.message, icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 5000 });
      } else {
        Swal.fire({ title: 'Notice', text: data.message || 'Something went wrong.', icon: 'info', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      }
    } catch (err) {
      Swal.fire({ title: 'Error', text: `Service temporarily unavailable. Please try again later.`, icon: 'error', toast: true, position: 'top-end', showConfirmButton: false, timer: 8000 });
    }
    setLoading(false);
  };



  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      return Swal.fire({ title: 'Invalid OTP', text: 'Please enter a 6-digit OTP.', icon: 'warning', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, otp })
      });
      const data = await res.json();
      
      if (data.success) {
        setResetToken(data.resetToken);
        setStep(4);
        Swal.fire({ title: 'Verified', text: 'OTP verified. Please create a new password.', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      } else {
        Swal.fire({ title: 'Verification Failed', text: data.message || 'Incorrect OTP.', icon: 'error', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
      }
    } catch (err) {
      Swal.fire({ title: 'Error', text: 'Service temporarily unavailable.', icon: 'error', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (passwordStrength.score !== 'EXCELLENT') {
      return Swal.fire({ title: 'Weak Password', text: 'Please fulfill all password criteria.', icon: 'warning', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
    }
    if (password !== confirmPassword) {
      return Swal.fire({ title: 'Mismatch', text: 'Passwords do not match.', icon: 'warning', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword: password })
      });
      const data = await res.json();
      
      if (data.success) {
        Swal.fire({ title: 'Success', text: 'Password reset successfully.', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        navigate('/user-login');
      } else {
        Swal.fire({ title: 'Reset Failed', text: data.message || 'Failed to reset password.', icon: 'error', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        if (data.message.includes('expired') || data.message.includes('used') || data.message.includes('invalid')) {
           setStep(1);
        }
      }
    } catch (err) {
      Swal.fire({ title: 'Error', text: 'Service temporarily unavailable.', icon: 'error', toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <style>{`
        @keyframes btn-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-icon {
          animation: btn-spin 1s linear infinite;
        }
      `}</style>
      <div className="login-background" style={{ backgroundImage: `url("${LoginBg}")` }}>
        <div className="login-overlay"></div>
      </div>
      
      <div className="login-content">
        <div className="login-header">
          <h1>Forgot Password</h1>
          <p>
            {step === 1 && "Enter your email address to recover your account."}
            {step === 3 && (
              <>
                Enter the 6-digit code sent to<br/>
                <strong>{email && email.includes('@') ? `${email.charAt(0)}***@${email.split('@')[1]}` : ''}</strong>
              </>
            )}
            {step === 4 && "Create a secure new password for your account."}
          </p>
        </div>

        <div className="login-card">
          {step === 1 && (
            <form className="login-form" onSubmit={handleRequestOTP}>
              <div className="form-group">
                <label>Email</label>
                <div className="input-wrapper">
                  <User className="input-icon" size={20} />
                  <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn-login" disabled={loading}>
                {loading ? <Loader2 className="spin-icon" size={18} /> : <Check size={18} />}
                {loading ? 'Sending OTP...' : 'Continue'}
              </button>
            </form>
          )}

          {step === 3 && (
            <form className="login-form" onSubmit={handleVerifyOTP}>
              <div className="form-group">
                <label>OTP Code</label>
                <div className="input-wrapper">
                  <ShieldCheck className="input-icon" size={20} />
                  <input type="text" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
                </div>
              </div>
              <button type="submit" className="btn-login" disabled={loading || otp.length !== 6}>
                {loading ? <Loader2 className="spin-icon" size={18} /> : <Check size={18} />} {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <div style={{ marginTop: '15px', textAlign: 'center' }}>
                <button type="button" onClick={handleRequestOTP} disabled={countdown > 0 || loading} style={{ background: 'none', border: 'none', color: countdown > 0 ? '#aaa' : '#007bff', cursor: countdown > 0 ? 'not-allowed' : 'pointer', fontSize: '14px' }}>
                  {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                </button>
              </div>
            </form>
          )}

          {step === 4 && (
            <form className="login-form" onSubmit={handleResetPassword}>
                <div className="form-group">
                    <label>New Password</label>
                    <div className="input-wrapper">
                        <Lock className="input-icon" size={20} />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Create strong password"
                            value={password}
                            onChange={handlePasswordChange}
                            required
                        />
                        <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    
                    <div className="password-strength-container" style={{ marginTop: '10px' }}>
                        <div className="strength-meter">
                            <div className={`strength-bar ${passwordStrength.score.toLowerCase()}`} style={{ height: '4px', background: passwordStrength.score === 'EXCELLENT' ? '#10b981' : passwordStrength.score === 'GOOD' ? '#f59e0b' : '#ef4444', transition: 'all 0.3s' }}></div>
                        </div>
                        <span className={`strength-text ${passwordStrength.score.toLowerCase()}`} style={{ fontSize: '12px', fontWeight: 'bold', color: passwordStrength.score === 'EXCELLENT' ? '#10b981' : passwordStrength.score === 'GOOD' ? '#f59e0b' : '#ef4444' }}>
                            {passwordStrength.score}
                        </span>
                        
                        <div className="password-requirements" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginTop: '10px', fontSize: '11px', color: '#666' }}>
                            <div className={`req-item ${passwordStrength.criteria.length ? 'met' : ''}`} style={{ color: passwordStrength.criteria.length ? '#10b981' : '#ef4444' }}><Check size={12}/> 12+ Characters</div>
                            <div className={`req-item ${passwordStrength.criteria.upper ? 'met' : ''}`} style={{ color: passwordStrength.criteria.upper ? '#10b981' : '#ef4444' }}><Check size={12}/> Uppercase</div>
                            <div className={`req-item ${passwordStrength.criteria.lower ? 'met' : ''}`} style={{ color: passwordStrength.criteria.lower ? '#10b981' : '#ef4444' }}><Check size={12}/> Lowercase</div>
                            <div className={`req-item ${passwordStrength.criteria.number ? 'met' : ''}`} style={{ color: passwordStrength.criteria.number ? '#10b981' : '#ef4444' }}><Check size={12}/> Number</div>
                            <div className={`req-item ${passwordStrength.criteria.special ? 'met' : ''}`} style={{ color: passwordStrength.criteria.special ? '#10b981' : '#ef4444' }}><Check size={12}/> Special Char</div>
                            <div className={`req-item ${passwordStrength.criteria.notCommon ? 'met' : ''}`} style={{ color: passwordStrength.criteria.notCommon ? '#10b981' : '#ef4444' }}><Check size={12}/> Not Common</div>
                        </div>
                    </div>
                </div>

                <div className="form-group" style={{ marginTop: '15px' }}>
                    <label>Confirm Password</label>
                    <div className="input-wrapper">
                        <Lock className="input-icon" size={20} />
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

              <button type="submit" className="btn-login" disabled={loading} style={{ marginTop: '20px' }}>
                <Check size={18} /> {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          <div className="divider" style={{ marginTop: '20px' }}>
            <span>or</span>
          </div>

          <button type="button" className="btn-staff" style={{ width: '100%' }} onClick={() => navigate('/user-login')}>
            <ArrowLeft size={18} /> Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
