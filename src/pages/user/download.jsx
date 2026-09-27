import React, { useEffect } from 'react';
import Navbar from '../../components/Navbar';
import { Download, Info, ShieldCheck, Monitor, Smartphone } from 'lucide-react';
import '../../lib/download.css';

// Import images
import BannerImg from '../../assets/image/banner 2.png';
import HallImg from '../../assets/icon/hall.png';
import WindowImg from '../../assets/illustraion/window download.png';
import AndroidImg from '../../assets/illustraion/android download.png';

export default function DownloadPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="download-page">
      <Navbar />
      
      {/* Hero Section */}
      <section className="download-hero" style={{ backgroundImage: `url("${BannerImg}")` }}>
        <div className="download-hero-overlay"></div>
        <div className="download-hero-content">
          <div className="download-hero-badge">BDRS Download</div>
          <h1>Download BDRS</h1>
          <p>Choose your device and install the Barangay Document Request System.</p>
          <div className="version-badge">
            <Info size={16} />
            Latest version: 1.0.0
          </div>
        </div>
        <div className="download-hero-image">
          <img src={HallImg} alt="Barangay Hall" />
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
              
              <button className="download-btn">
                <Download size={20} />
                Download .EXE
              </button>
              
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
              
              <button className="download-btn">
                <Download size={20} />
                Download .APK
              </button>
              
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

      {/* Simple Footer */}
      <footer className="simple-footer">
        <span>Barangay Buluan</span>
        <div className="simple-footer-divider"></div>
        <span>Modern Services for a Better Community</span>
      </footer>
    </div>
  );
}
