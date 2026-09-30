import React, { useEffect } from 'react';
import ResidentSidebar from '../../components/ResidentSidebar';
import ResidentProfileDropdown from '../../components/ResidentProfileDropdown';
import ResidentNotificationBell from '../../components/ResidentNotificationBell';
import { Sparkles, ShieldCheck, Zap, Smartphone, CheckCircle, RefreshCw, Rocket, FileText } from 'lucide-react';
import '../../lib/admin-layout.css';

export default function WhatsNew() {
  useEffect(() => {
    document.title = "What's New | BDRS";
  }, []);

  return (
    <div className="admin-dashboard-container">
      <ResidentSidebar />
      
      <main className="admin-main">
        <header className="admin-header resident-header">
          <h1>What's New</h1>
          <div className="header-right">
            <ResidentNotificationBell />
            <ResidentProfileDropdown />
          </div>
        </header>

        <div className="whatsnew-content">
          
          <style>{`
            .whatsnew-content {
              padding: 24px;
              max-width: 900px;
              margin: 0 auto;
            }
            .release-card {
              background-color: #ffffff;
              border-radius: 16px;
              padding: 35px 30px;
              box-shadow: 0 4px 15px rgba(0,0,0,0.05);
              border: 1px solid #e2e8f0;
              margin-bottom: 30px;
              position: relative;
              overflow: hidden;
            }

            .release-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 25px;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 20px;
            }
            .release-version {
              font-size: 2rem;
              font-weight: 800;
              color: #0f172a;
              margin: 0;
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .release-badge {
              background-color: #dbeafe;
              color: #1d4ed8;
              font-size: 0.8rem;
              font-weight: 600;
              padding: 4px 12px;
              border-radius: 20px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .release-date {
              color: #64748b;
              font-size: 0.95rem;
              font-weight: 500;
            }
            .feature-list {
              display: flex;
              flex-direction: column;
              gap: 24px;
            }
            .feature-item {
              display: flex;
              gap: 20px;
            }
            .feature-icon {
              width: 48px;
              height: 48px;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .feature-content h3 {
              font-size: 1.15rem;
              color: #1e293b;
              margin: 0 0 6px 0;
              font-weight: 700;
            }
            .feature-content p {
              color: #475569;
              font-size: 0.95rem;
              line-height: 1.6;
              margin: 0;
            }
            
            @media (max-width: 768px) {
              .whatsnew-content {
                padding: 16px;
              }
              .release-card {
                padding: 24px 20px;
              }
              .release-header {
                flex-direction: column;
                gap: 10px;
              }
              .release-version {
                font-size: 1.5rem;
              }
              .feature-icon {
                width: 40px;
                height: 40px;
              }
              .feature-content h3 {
                font-size: 1.05rem;
              }
              .feature-content p {
                font-size: 0.9rem;
              }
            }
          `}</style>

          <div className="release-card">
            <div className="release-header">
              <div>
                <h2 className="release-version">
                  BDRS v1.0.3
                  <span className="release-badge">Latest</span>
                </h2>
                <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>The Security & Polish Update.</p>
              </div>
              <div className="release-date">October 2026</div>
            </div>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                  <ShieldCheck size={24} />
                </div>
                <div className="feature-content">
                  <h3>New PIN Security System</h3>
                  <p>We've unified and streamlined our security features. "Passkey" is now officially "PIN". You can seamlessly secure your account with a 6-digit PIN code.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon" style={{ backgroundColor: '#fdf4ff', color: '#c026d3' }}>
                  <Zap size={24} />
                </div>
                <div className="feature-content">
                  <h3>Forgot PIN & Smooth OTP</h3>
                  <p>Added a new 'Forgot PIN' recovery flow that securely emails you an OTP. The verification screen now features a beautiful 6-box input design that fully supports copy-and-paste!</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  <Sparkles size={24} />
                </div>
                <div className="feature-content">
                  <h3>Admin & Mobile UI Improvements</h3>
                  <p>Resolved layout issues in the Admin Resident Details view for a cleaner experience, and added a helpful scroll indicator for mobile users navigating the profile tabs.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
                  <FileText size={24} />
                </div>
                <div className="feature-content">
                  <h3>Dynamic Documents & Fees</h3>
                  <p>Admins can now easily manage, edit, and create new Document Types directly from the dashboard! Update requirements, prices, and settings on the fly without coding.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="release-card" style={{ opacity: 0.9 }}>
            <div className="release-header">
              <div>
                <h2 className="release-version" style={{ fontSize: '1.6rem' }}>
                  BDRS v1.0.2
                </h2>
                <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>The smart updates & fixes release.</p>
              </div>
              <div className="release-date">October 2026</div>
            </div>

            <div className="feature-list">

              <div className="feature-item">
                <div className="feature-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  <CheckCircle size={24} />
                </div>
                <div className="feature-content">
                  <h3>Seamless Notification Experience</h3>
                  <p>Fixed an annoying bug where the red notification dot would flash or persist even after you already read your messages or navigated to a new page.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon" style={{ backgroundColor: '#fdf4ff', color: '#c026d3' }}>
                  <ShieldCheck size={24} />
                </div>
                <div className="feature-content">
                  <h3>Enhanced Security & Stability</h3>
                  <p>We've enforced stronger server-side validations to ensure that all document requests remain secure and tamper-proof.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="release-card" style={{ opacity: 0.85 }}>
            <div className="release-header">
              <div>
                <h2 className="release-version" style={{ fontSize: '1.6rem' }}>
                  BDRS v1.0.1
                </h2>
                <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>The foundational update.</p>
              </div>
              <div className="release-date">September 2026</div>
            </div>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
                  <Zap size={24} />
                </div>
                <div className="feature-content">
                  <h3>Faster Loading Times</h3>
                  <p>We optimized the dashboard and history pages so your data loads instantly without relying on heavy network requests.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                  <Smartphone size={24} />
                </div>
                <div className="feature-content">
                  <h3>Mobile Responsiveness</h3>
                  <p>The sidebar and main navigation were overhauled to provide a native app-like experience on all mobile devices.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="release-card" style={{ opacity: 0.75 }}>
            <div className="release-header">
              <div>
                <h2 className="release-version" style={{ fontSize: '1.6rem' }}>
                  BDRS v1.0.0
                </h2>
                <p style={{ margin: '8px 0 0 0', color: '#64748b' }}>The grand launch.</p>
              </div>
              <div className="release-date">August 2026</div>
            </div>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon" style={{ backgroundColor: '#fdf4ff', color: '#c026d3' }}>
                  <Rocket size={24} />
                </div>
                <div className="feature-content">
                  <h3>Welcome to BDRS!</h3>
                  <p>The Barangay Document Request System is officially live! Say goodbye to long lines at the barangay hall—you can now request all your essential documents online, track their status in real time, and download digital copies instantly.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                  <FileText size={24} />
                </div>
                <div className="feature-content">
                  <h3>Digital Documents</h3>
                  <p>Request Barangay Clearances, Certificates of Indigency, Certificates of Residency, and Business Clearances completely online.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
