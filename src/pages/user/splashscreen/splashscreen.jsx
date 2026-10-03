import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppIcon from '../../../assets/app icon/Barangay Buluan BDRS.png';
import spl1 from '../../../assets/illustraion/spl1.png';
import spl2 from '../../../assets/illustraion/spl2.png';
import spl3 from '../../../assets/illustraion/spl3.png';
import spl4 from '../../../assets/illustraion/spl4.png';
import './splashscreen.css';

import packageJson from '../../../../package.json';
import { isNativeApp } from '../../../utils/platform';

const slides = [
  {
    image: spl1,
    title: 'Welcome to BDRS',
    subtitle: 'Barangay Document Request System',
    buttonText: 'Get Started →'
  },
  {
    image: spl2,
    title: 'Request Documents Online',
    subtitle: 'Submit your document requests without the need to wait in long lines.',
    buttonText: 'Next →'
  },
  {
    image: spl3,
    title: 'Track Your Request',
    subtitle: 'Stay updated with the status of your document request from submission to completion.',
    buttonText: 'Next →'
  },
  {
    image: spl4,
    title: 'Safe & Convenient',
    subtitle: 'Your personal information and document requests are protected while accessing barangay services.',
    buttonText: 'Start Requesting →'
  }
];

export default function SplashScreen() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    document.title = `BDRS Resident Portal`;
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) {
      navigate('/user-login', { replace: true });
    }
  }, [navigate]);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      sessionStorage.setItem('hasSeenSplash', 'true');
      navigate('/user-login', { replace: true });
    }
  };

  return (
    <div className="splash-container">
      <div className="splash-header">
        <img src={AppIcon} alt="BDRS Logo" className="splash-logo" />
        <div className="splash-header-text">
          <h2 className="splash-title-top">Barangay Buluan</h2>
          <p className="splash-subtitle-top">Ipil, Zamboanga Sibugay<br/>Document Request System</p>
        </div>
      </div>

      <div className="splash-content">
        <img src={slides[currentSlide].image} alt="Illustration" className="splash-illustration" />
        <h1 className="splash-slide-title">{slides[currentSlide].title}</h1>
        <p className="splash-slide-subtitle">{slides[currentSlide].subtitle}</p>
      </div>

      <div className="splash-footer">
        <button className="splash-button" onClick={handleNext}>
          {slides[currentSlide].buttonText}
        </button>
        
        <div className="splash-pagination">
          {slides.map((_, index) => (
            <div 
              key={index} 
              className={`splash-dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      </div>
      
      {isNativeApp && (
        <div style={{ 
          position: 'fixed', 
          bottom: '10px', 
          right: '15px', 
          color: 'rgba(0, 0, 0, 0.4)', 
          fontSize: '0.85rem',
          fontWeight: '500',
          pointerEvents: 'none',
          zIndex: 1000
        }}>
          v{packageJson.version}
        </div>
      )}
    </div>
  );
}
