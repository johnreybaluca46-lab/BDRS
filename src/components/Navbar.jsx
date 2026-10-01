import React, { useState } from 'react';
import { Home as HomeIcon, Info, FileText, Phone, Menu, X, LogIn, Download } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../assets/logo/barangay buluan seal.png';
import './Navbar.css';
import { isNativeApp } from '../utils/platform';

export default function Navbar({ blockNavigation = false, onBlockedNavigation = null }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLinkClick = (e, targetPath) => {
    if (blockNavigation) {
      e.preventDefault();
      if (onBlockedNavigation) onBlockedNavigation(e, targetPath);
    } else {
      toggleMenu();
    }
  };

  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount === 10) {
      sessionStorage.setItem('loginUnlocked', 'true');
      navigate('/login');
      setClickCount(0);
    }
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  if (isNativeApp) return null;

  return (
    <>
      <header className="navbar">
        <div className="navbar-container">
        <div className="brand-section">
          <img src={Logo} alt="Barangay Buluan Logo" className="logo" onClick={handleLogoClick} />
          <div className="brand-text">
            <h1 className="brand-title">Barangay Buluan</h1>
            <p className="brand-location">Ipil, Zamboanga Sibugay</p>
            <p className="brand-subtitle">Document Request System</p>
          </div>
        </div>

        <button className="mobile-menu-btn" onClick={toggleMenu}>
          {isMenuOpen ? <X size={32} strokeWidth={2} /> : <Menu size={32} strokeWidth={2} />}
        </button>

        <nav className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
          <Link to="/" className={`nav-link ${isActive('/')}`} onClick={(e) => handleLinkClick(e, '/')}>
            <HomeIcon size={22} fill={isActive('/') ? 'currentColor' : 'none'} strokeWidth={2} />
            <span>Home</span>
          </Link>
          <Link to="/services" className={`nav-link ${isActive('/services')}`} onClick={(e) => handleLinkClick(e, '/services')}>
            <FileText size={22} strokeWidth={2.5} />
            <span>Services</span>
          </Link>
          <Link to="/about" className={`nav-link ${isActive('/about')}`} onClick={(e) => handleLinkClick(e, '/about')}>
            <Info size={22} strokeWidth={2.5} />
            <span>About</span>
          </Link>
          <Link to="/contact" className={`nav-link ${isActive('/contact')}`} onClick={(e) => handleLinkClick(e, '/contact')}>
            <Phone size={22} strokeWidth={2.5} />
            <span>Contact</span>
          </Link>
          {!isNativeApp && (
            <Link to="/download" className={`nav-link ${isActive('/download')}`} onClick={(e) => handleLinkClick(e, '/download')}>
              <Download size={22} strokeWidth={2.5} />
              <span>Download</span>
            </Link>
          )}
          <Link to="/user-login" className={`nav-link ${isActive('/user-login')}`} onClick={(e) => handleLinkClick(e, '/user-login')}>
            <LogIn size={22} strokeWidth={2.5} />
            <span>Sign In</span>
          </Link>
        </nav>
      </div>
    </header>
    <div className="navbar-spacer"></div>
    </>
  );
}
