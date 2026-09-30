import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import Navbar from '../../components/Navbar';
import { Download, Info, ShieldCheck, Monitor, Smartphone, Users } from 'lucide-react';
import { db } from '../../database/firebase';
import { doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
import '../../lib/download.css';

// Import images
import BannerImg from '../../assets/image/banner 2.png';
import Logo from '../../assets/logo/barangay buluan seal.png';
import WindowImg from '../../assets/illustraion/window download.png';
import AndroidImg from '../../assets/illustraion/android download.png';
import ContactFooter from '../../components/ContactFooter';

export default function DownloadPage() {
  const [exeCount, setExeCount] = useState(0);
  const [apkCount, setApkCount] = useState(0);

  useEffect(() => {
    document.title = "BDRS | Download";
    window.scrollTo(0, 0);

    const fetchCounts = async () => {
      try {
        // Fetch actual download counts from GitHub Releases
        const ghRes = await fetch('https://api.github.com/repos/johnreybaluca46-lab/BDRS/releases');
        const ghData = await ghRes.json();
        
        let ghExe = 0;
        let ghApk = 0;
        if (Array.isArray(ghData)) {
          ghData.forEach(release => {
            if (release.assets && Array.isArray(release.assets)) {
              release.assets.forEach(asset => {
                if (asset.name.endsWith('.exe')) {
                  ghExe += asset.download_count || 0;
                } else if (asset.name.endsWith('.apk')) {
                  ghApk += asset.download_count || 0;
                }
              });
            }
          });
        }

        // Fetch DB counts
        const docRef = doc(db, 'stats', 'downloads');
        const docSnap = await getDoc(docRef);
        let dbExe = 0;
        let dbApk = 0;
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          dbExe = data.exe || 0;
          dbApk = data.apk || 0;
        } else {
          // Initialize if not exists
          await setDoc(docRef, { exe: 0, apk: 0 });
        }

        setExeCount(ghExe + dbExe);
        setApkCount(ghApk + dbApk);
      } catch (err) {
        console.error('Error fetching download count:', err);
      }
    };

    fetchCounts();
  }, []);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toString();
  };

  const handleExeDownload = async () => {
    setExeCount(prev => prev + 1);
    try {
      const docRef = doc(db, 'stats', 'downloads');
      await updateDoc(docRef, {
        exe: increment(1)
      });
    } catch (err) {
      console.error('Error updating download count:', err);
    }
  };

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
            Latest version: {__APP_VERSION__}
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
              
              <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
                <a 
                  href="https://github.com/johnreybaluca46-lab/BDRS/releases/download/v1.0.1/BDRS-Setup-1.0.1.exe" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="download-btn" 
                  style={{ textDecoration: 'none', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '0' }}
                  onClick={handleExeDownload}
                >
                  <Download size={20} />
                  Download .EXE
                </a>
                <div style={{ color: '#3182ce', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Download size={14} />
                  {formatNumber(exeCount)} Downloads
                </div>
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
              
              <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
                <button 
                  onClick={() => Swal.fire({
                    title: 'Coming Soon!',
                    text: 'The Android App is currently under development and will be available soon.',
                    icon: 'info',
                    confirmButtonText: 'Got it',
                    confirmButtonColor: '#10b981'
                  })}
                  className="download-btn" 
                  style={{ cursor: 'pointer', border: 'none', textDecoration: 'none', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#10b981', color: 'white', marginBottom: '0' }}
                >
                  <Download size={20} />
                  Download .APK
                </button>
                <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Download size={14} />
                  {formatNumber(apkCount)} Downloads
                </div>
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
