import React from 'react';
import { createPortal } from 'react-dom';
import './Loader.css';

export default function Loader({ text = 'Loading...' }) {
  const loaderContent = (
    <div className="loader-container">
      <div className="loader"></div>
      <div className="loader-text">{text}</div>
    </div>
  );

  return createPortal(loaderContent, document.body);
}
