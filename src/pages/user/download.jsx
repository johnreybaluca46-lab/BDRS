import React, { useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { Download, Info, ShieldCheck, Monitor, Smartphone } from 'lucide-react';
import '../../lib/download.css';

// Import images
import BannerImg from '../../assets/image/banner 2.png';
import Logo from '../../assets/logo/barangay buluan seal.png';
import WindowImg from '../../assets/illustraion/window download.png';
import AndroidImg from '../../assets/illustraion/android download.png';
import ContactFooter from '../../components/ContactFooter';

export default function DownloadPage() {
  useEffect(() => {
    document.title = "BDRS | Download";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="download-page">
      <Navbar />
      
      {/* Hero Section */}
      <section className="download-hero">
        <div className="download-hero-content">
          <div className="download-hero-badge">BDRS Download</div>
          <h1>Download BDRS</h1>
          <p>Choose your device and install the Barangay Document Request System.</p>
          <div className="version-badge">
            <Info size={16} />
            Latest version: 1.0.0
          </div>
        </div>
        
        <div className="download-hero-image-container">
          <img src={BannerImg} alt="Barangay Hall" className="download-hero-banner" />
        </div>
      </section>

      {/* Cards Section */}
      <section className="download-cards-section">
        <div className="download-cards-container">
          
          {/* Windows Card */}
          <div className="download-card windows">
            <div className="card-illustration">
              <img src={WindowImg} alt="Windows Download Illustration" />
            </div>
            <div className="card-content">
              <h2>BDRS for Windows</h2>
              <p>Install BDRS on your Windows PC and get quick access to barangay services, anytime.</p>
              
              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <a href="/downloads/BDRS-Setup.exe" className="download-btn" download style={{ textDecoration: 'none', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Download size={20} />
                  Download .EXE
                </a>
              </div>
              
              <div className="card-footer">
                <div className="footer-item">
                  <Monitor size={16} />
                  Windows 10 / 11
                </div>
                <div className="footer-divider"></div>
                <div className="footer-item">
                  <ShieldCheck size={16} />
                  Safe & Secure
                </div>
              </div>
            </div>
          </div>

          {/* Android Card */}
          <div className="download-card android">
            <div className="card-illustration">
              <img src={AndroidImg} alt="Android Download Illustration" />
            </div>
            <div className="card-content">
              <h2>BDRS for Android</h2>
              <p>Install BDRS on your Android phone and stay connected to barangay services.</p>
              
              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <a href="/downloads/BDRS-Android.apk" className="download-btn" download style={{ textDecoration: 'none', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#10b981', color: 'white', borderColor: '#10b981' }}>
                  <Download size={20} />
                  Download .APK
                </a>
              </div>
              
              <div className="card-footer">
                <div className="footer-item">
                  <Smartphone size={16} />
                  Android 8.0+
                </div>
                <div className="footer-divider"></div>
                <div className="footer-item">
                  <ShieldCheck size={16} />
                  Safe & Secure
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

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
