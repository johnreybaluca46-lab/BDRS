import React from 'react';
import './lib/SkeletonCardGrid.css';

export default function SkeletonCardGrid() {
  return (
    <div className="skeleton-my-requests-grid">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="skeleton-request-card">
          <div className="skeleton-request-card-content">
            <div className="skeleton-request-icon-container"></div>
            <div className="skeleton-request-details">
              <div className="skeleton-request-header-row">
                <div className="skeleton-header-left">
                  <div className="skeleton-title"></div>
                  <div className="skeleton-subtitle"></div>
                </div>
                <div className="skeleton-badge"></div>
              </div>
              <div className="skeleton-meta">
                <div className="skeleton-meta-item"></div>
                <div className="skeleton-meta-item"></div>
                <div className="skeleton-meta-item"></div>
              </div>
              <div className="skeleton-message-box"></div>
            </div>
          </div>
          <div className="skeleton-request-banner">
            <div className="skeleton-banner-text">
              <div className="skeleton-banner-title"></div>
              <div className="skeleton-banner-desc"></div>
            </div>
            <div className="skeleton-btn"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
