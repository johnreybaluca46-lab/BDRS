import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './SweetAlert.css';

const SweetAlert = ({ 
  title = "Error !", 
  message = "Oh no!\nYou should login before posting.", 
  onClose,
  duration = 1500,
  type = "error"
}) => {
  const themeColor = type === 'success' ? '#10b981' : 'indianred';
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsExiting(true), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, 1000); // 1s fade out duration
      return () => clearTimeout(timer);
    }
  }, [isExiting, onClose]);

  const alertContent = (
    <div className={`sweet-alert-container ${isExiting ? 'exiting' : ''}`}>
      <svg xmlns="http://www.w3.org/2000/svg" height={96} width={16}>
        <path strokeLinecap="round" strokeWidth={2} stroke={themeColor} fill={themeColor} d="M 8 0 
             Q 4 4.8, 8 9.6 
             T 8 19.2 
             Q 4 24, 8 28.8 
             T 8 38.4 
             Q 4 43.2, 8 48 
             T 8 57.6 
             Q 4 62.4, 8 67.2 
             T 8 76.8 
             Q 4 81.6, 8 86.4 
             T 8 96 
             L 0 96 
             L 0 0 
             Z" />
      </svg>
      <div className="sweet-alert-content">
        <p className="sweet-alert-title" style={{ color: themeColor }}>
          {title}
        </p>
        <p className="sweet-alert-msg">
          {message.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              <br />
            </React.Fragment>
          ))}
        </p>
      </div>
      <button className="sweet-alert-close" onClick={onClose}>
        <svg width="28" height="28" fill="none" stroke={themeColor} strokeWidth={2} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );

  return createPortal(alertContent, document.body);
}

export default SweetAlert;
