import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { db } from '../../database/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle, ArrowLeft, Loader2, UserSquare2 } from 'lucide-react';
import Navbar from '../../components/Navbar';
import ContactFooter from '../../components/ContactFooter';
import BannerImg from '../../assets/image/banner 2.png';
import Logo from '../../assets/logo/barangay buluan seal.png';
import '../../lib/registerresidentform.css'; // Reuse some form styles

const isNativeApp = window.Capacitor !== undefined || window.electron !== undefined || navigator.userAgent.toLowerCase().includes('electron');

export default function RegistrationStatus() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "BDRS | Registration Status";

    if (!token) {
      setError('No QR token provided. Please scan a valid QR code.');
      setLoading(false);
      return;
    }

    const docRef = doc(db, 'registration_status', token);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setStatusData(docSnap.data());
      } else {
        setError('Invalid or expired QR token. No registration found.');
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching status:", err);
      setError('Error retrieving status. Please try again later.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [token]);

  const renderStatusCard = () => {
    if (loading) {
      return (
        <div className="status-card loading">
          <Loader2 className="spinner-icon" size={48} color="#2563eb" />
          <h3>Checking Status...</h3>
          <p>Please wait while we securely retrieve your registration status.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="status-card error">
          <AlertTriangle size={48} color="#ef4444" />
          <h3>Status Unavailable</h3>
          <p>{error}</p>
          {!isNativeApp && (
            <div style={{ marginTop: '20px' }}>
              <Link to="/" className="btn-outline">
                <ArrowLeft size={18} /> Back to Home
              </Link>
            </div>
          )}
        </div>
      );
    }

    const { resNumber, residentId, status, updatedAt, submittedAt } = statusData;
    const displayId = resNumber || residentId || 'N/A';
    const displayDate = updatedAt || submittedAt;
    
    let Icon = AlertTriangle;
    let color = '#b45309';
    let bgColor = '#fef3c7';
    let title = 'Pending Approval';
    let description = 'Your registration is currently under review by the barangay administration. Please check back later.';

    if (status === 'Approved') {
      Icon = CheckCircle;
      color = '#15803d';
      bgColor = '#f0fdf4';
      title = 'Approved';
      description = 'Your registration has been approved! You can now log in to the resident portal using the email and password you provided during registration.';
    } else if (status === 'Rejected') {
      Icon = XCircle;
      color = '#b91c1c';
      bgColor = '#fef2f2';
      title = 'Rejected';
      description = 'Your registration was not approved. Please contact the barangay hall for more information.';
    }

    return (
      <div className="status-card" style={{ borderColor: color }}>
        <div className="status-header" style={{ backgroundColor: bgColor, color: color }}>
          <Icon size={40} />
          <h2>{title}</h2>
        </div>
        
        <div className="status-body">
          <div className="status-row">
            <span className="status-label">Registration ID</span>
            <span className="status-value">{displayId}</span>
          </div>
          
          <div className="status-row">
            <span className="status-label">Last Updated</span>
            <span className="status-value">
              {displayDate ? new Date(displayDate.toMillis ? displayDate.toMillis() : displayDate.seconds * 1000).toLocaleString() : 'N/A'}
            </span>
          </div>

          <p className="status-description">{description}</p>
        </div>

        <div className="status-actions">
           {status === 'Approved' ? (
             <Link to="/user-login" className="btn-primary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
               Log In Now
             </Link>
           ) : (
             !isNativeApp && (
               <Link to="/" className="btn-outline" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                 Return to Home
               </Link>
             )
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="register-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      
      <main className="register-main" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div className="status-container" style={{ maxWidth: '600px', width: '100%', margin: '0 auto' }}>
          <div className="register-header" style={{ textAlign: 'center', marginBottom: '30px', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{ margin: '0' }}>Registration Status</h1>
            <p style={{ margin: '10px 0 0 0' }}>Track the progress of your resident registration.</p>
          </div>
          
          <style dangerouslySetInnerHTML={{__html: `
            .status-card {
              background: #fff;
              border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              overflow: hidden;
              border: 1px solid #e2e8f0;
              text-align: center;
            }
            .status-card.loading, .status-card.error {
              padding: 40px 20px;
            }
            .spinner-icon {
              animation: spin 1s linear infinite;
              margin-bottom: 20px;
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .status-header {
              padding: 30px 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 15px;
            }
            .status-header h2 {
              margin: 0;
              font-size: 1.5rem;
            }
            .status-body {
              padding: 30px;
              text-align: left;
            }
            .status-row {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid #f1f5f9;
            }
            .status-label {
              color: #64748b;
              font-weight: 500;
            }
            .status-value {
              font-weight: 600;
              color: #1e293b;
            }
            .status-description {
              margin-top: 25px;
              color: #475569;
              line-height: 1.6;
              text-align: center;
              font-size: 0.95rem;
            }
            .status-actions {
              padding: 0 30px 30px 30px;
            }
          `}} />

          {renderStatusCard()}
        </div>
      </main>

      <ContactFooter />
      <footer className="footer">
        <div className="footer-content">
          <img src={Logo} alt="BDRS Icon" className="footer-icon" />
          <span className="footer-logo">BDRS</span>
          <span className="footer-text">&copy; 2026 All Rights Reserved.</span>
        </div>
      </footer>
    </div>
  );
}
