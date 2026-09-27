import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import '../../lib/home.css';
import { ChevronRight, MapPin, FileText, Users, LogIn } from 'lucide-react';
import Navbar from '../../components/Navbar';
import ContactFooter from '../../components/ContactFooter';
import { useSettings } from '../../context/SettingsContext';
import Logo from '../../assets/logo/barangay buluan seal.png';
import BannerImg from '../../assets/image/banner 2.png';
import TicketIcon from '../../assets/image/ticket.png';
import BarangayClearanceImg from '../../assets/logo/barangay clearance.png';
import CertificateOfResidencyImg from '../../assets/logo/certificate of residency.png';
import CertificateOfIndigencyImg from '../../assets/logo/certificate of indigency.png';
import BusinessClearanceImg from '../../assets/logo/business clearance.png';
import ClockIcon from '../../assets/icon/clock.png';
import HallIcon from '../../assets/icon/hall.png';
import InfoTicketIcon from '../../assets/icon/ticket icon.png';
import Loader from '../../components/Loader';
import BuluanIslandImg from '../../assets/image/buluan iland.jpg';
import Swal from 'sweetalert2';

export default function Home() {
  const { settings } = useSettings();
  useEffect(() => {
    document.title = "BDRS | Home";
  }, []);

  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let keySequence = '';
    const cheatCode = 'administrator';

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      keySequence += e.key.toLowerCase();
      if (keySequence.length > cheatCode.length) {
        keySequence = keySequence.slice(-cheatCode.length);
      }
      
      if (keySequence === cheatCode) {
        navigate('/login');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleRequestClick = (e, path) => {
    e.preventDefault();
    Swal.fire({
      title: 'Sign In Required',
      text: 'You need to sign in first to continue your document request.',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Sign In',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2563eb',
    }).then((result) => {
      if (result.isConfirmed) {
        navigate('/user-login');
      }
    });
  };
  
  const scrollToServices = () => {
    const servicesSection = document.querySelector('.services-section');
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="home-page">
      {isLoading && <Loader />}
      <Navbar />

      <main className="hero-section">
        <div className="hero-content">
          <h2 className="hero-title">Request Barangay<br/>Documents</h2>
          <p className="hero-subtitle">Fast, simple and hassle-free document request.</p>

          <div className="hero-buttons">
            <Link to="/register" className="hero-btn-outline" style={{ textDecoration: 'none' }}>
              <Users size={18} /> Resident Registration
            </Link>
            <Link to="/user-login" className="hero-btn-primary" style={{ textDecoration: 'none', gap: '0.5rem' }}>
              <LogIn size={18} /> Sign In Here
            </Link>
          </div>
        </div>
        
        <div className="hero-image-container">
          <img src={BannerImg} alt="Barangay Hall" className="hero-banner" />
        </div>
      </main>

      <section className="about-section">
        <div className="about-header">
          <h2>About this barangay</h2>
          <div className="header-underline"></div>
        </div>
        <div className="about-content">
          <p>
            Welcome to Barangay Buluan, Municipality of Mabuhay, Zamboanga Sibugay. Our barangay is committed to providing accessible,
            efficient, transparent, and reliable public services to all residents. We strive to create a welcoming and responsive community where
            every resident can easily access the services and assistance they need.
          </p>
          <p>
            Through our Digital Barangay Service System, residents can conveniently request important barangay documents, monitor the status
            of their requests, and receive relevant barangay announcements and information. The system is designed to reduce waiting time,
            improve the processing of requests, and make barangay services more convenient and accessible for everyone.
          </p>
          <p>
            Barangay Buluan values service, transparency, accountability, and community participation. We continue to improve our services by
            embracing technology and providing residents with a more organized and efficient way to communicate with the barangay office.
            Our goal is to build a progressive, connected, and service-oriented community where technology supports better governance and
            where residents can receive the assistance they need in a timely and convenient manner.
          </p>
          <p>
            Barangay Buluan — Serving the Community with Integrity, Efficiency, and Care.
          </p>
        </div>

        <div className="about-island-section">
          <div className="about-island-left">
            <div className="about-island-image">
              <img src={BuluanIslandImg} alt="Buluan Island" />
            </div>
            <div className="about-qr-container">
              <QRCode value={settings?.officialWebsite || "https://bdrs-five.vercel.app/"} size={160} />
              <p>Scan to visit our website</p>
            </div>
          </div>
          <div className="about-island-content">
            <p>
              Welcome to Buluan Island, Zamboanga Sibugay, a beautiful island community surrounded by the waters of the Sulu Sea.
              Buluan Island is known for its peaceful surroundings, natural beauty, and close-knit community. The island is home to
              residents whose daily lives are closely connected to the sea, nature, and the local community.
            </p>
            <p>
              The people of Buluan Island value unity, cooperation, respect, and community development. Through the continuous efforts
              of local leaders and residents, the community works together to improve public services, support local activities, and
              create a safer and more comfortable environment for everyone.
            </p>
            <p>
              Our community is committed to providing accessible, efficient, and reliable barangay services. Through the Digital
              Barangay Service System, residents can conveniently request important documents, check the status of their requests,
              receive barangay announcements, and access essential information without having to make unnecessary trips to the
              barangay office.
            </p>
            <p>
              The digital system aims to make public services more convenient, organized, and transparent for the residents of
              Buluan Island. By using technology, we can improve communication between residents and barangay officials
              while making the processing of requests faster and easier.
            </p>
            <p>
              Buluan Island continues to look toward a future of progress, sustainable development, and stronger community
              cooperation while preserving the natural beauty and unique character of the island.
            </p>
            <p>
              Buluan Island — United in Community, Moving Forward Together.
            </p>
          </div>
        </div>
      </section>

      <section className="services-section">
        <div className="services-header">
          <h2>Select document Request</h2>
          <div className="header-underline"></div>
          <p>Request official barangay documents online quickly and conveniently.</p>
        </div>
        
        <div className="services-grid">
          <div className="service-card">
            <img src={BarangayClearanceImg} alt="Barangay Clearance" className="service-icon" />
            <h3 className="service-title">Barangay Clearance</h3>
            <p className="service-desc">Certificate issued to prove good moral character and residency.</p>
            <Link 
              to="/barangay-clearance" 
              className="service-btn" 
              style={{ textDecoration: 'none' }}
              onClick={(e) => handleRequestClick(e, '/barangay-clearance')}
            >
              Request Now <ChevronRight size={18} />
            </Link>
          </div>

          <div className="service-card">
            <img src={CertificateOfResidencyImg} alt="Certificate of Residency" className="service-icon" />
            <h3 className="service-title">Certificate of Residency</h3>
            <p className="service-desc">Certificate issued to certify that a person is a resident of the barangay.</p>
            <Link 
              to="/certificate-of-residency" 
              className="service-btn" 
              style={{ textDecoration: 'none' }}
              onClick={(e) => handleRequestClick(e, '/certificate-of-residency')}
            >
              Request Now <ChevronRight size={18} />
            </Link>
          </div>

          <div className="service-card">
            <img src={CertificateOfIndigencyImg} alt="Certificate of Indigency" className="service-icon" />
            <h3 className="service-title">Certificate of Indigency</h3>
            <p className="service-desc">Certificate for indigent residents for various legal and financial purposes.</p>
            <Link 
              to="/certificate-of-indigency" 
              className="service-btn" 
              style={{ textDecoration: 'none' }}
              onClick={(e) => handleRequestClick(e, '/certificate-of-indigency')}
            >
              Request Now <ChevronRight size={18} />
            </Link>
          </div>

          <div className="service-card">
            <img src={BusinessClearanceImg} alt="Business Permit" className="service-icon" />
            <h3 className="service-title">Business Permit</h3>
            <p className="service-desc">Certificate issued for business permit and other business transactions.</p>
            <Link 
              to="/business-clearance" 
              className="service-btn" 
              style={{ textDecoration: 'none' }}
              onClick={(e) => handleRequestClick(e, '/business-clearance')}
            >
              Request Now <ChevronRight size={18} />
            </Link>
          </div>
        </div>

        <div className="info-banner">
          <div className="info-item">
            <img src={ClockIcon} alt="Clock" className="info-icon" />
            <div className="info-text-group">
              <h4 className="info-title">No Waiting Online</h4>
              <p className="info-desc">No online queue. Go directly<br/>to the Barangay Hall.</p>
            </div>
          </div>
          
          <div className="info-divider"></div>
          
          <div className="info-item">
            <img src={InfoTicketIcon} alt="Ticket" className="info-icon" />
            <div className="info-text-group">
              <h4 className="info-title">Get Your Polling Number</h4>
              <p className="info-desc">A unique Polling Number will be<br/>generated after submission.</p>
            </div>
          </div>
          
          <div className="info-divider"></div>
          
          <div className="info-item">
            <img src={HallIcon} alt="Hall" className="info-icon" />
            <div className="info-text-group">
              <h4 className="info-title">Visit the Barangay Hall</h4>
              <p className="info-desc">Present your Polling Number and<br/>claim your document.</p>
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
