import React from 'react';
import './SkeletonProfile.css';

export default function SkeletonProfile() {
  return (
    <div className="profile-content-wrapper skeleton-profile">
      <div className="profile-header-card">
        <div className="profile-avatar-section skeleton-avatar-section">
          <div className="skeleton-avatar"></div>
        </div>
        
        <div className="profile-info-section skeleton-info-section">
          <div className="skeleton-name"></div>
          <div className="skeleton-badge"></div>
          
          <div className="profile-contact-grid skeleton-contact-grid">
            <div className="skeleton-contact-item"></div>
            <div className="skeleton-contact-item"></div>
            <div className="skeleton-contact-item full-width"></div>
          </div>
          
          <div className="skeleton-btn"></div>
        </div>
        
        <div className="profile-meta-section skeleton-meta-section">
          <div className="skeleton-meta-item"></div>
          <div className="skeleton-meta-item"></div>
          <div className="skeleton-meta-item"></div>
        </div>
      </div>
      
      <div className="skeleton-tabs">
        <div className="skeleton-tab active"></div>
        <div className="skeleton-tab"></div>
      </div>
      
      <div className="dashboard-panel profile-details-panel skeleton-details-panel">
        <div className="skeleton-details-header"></div>
        <div className="skeleton-details-grid">
          <div className="skeleton-details-field"></div>
          <div className="skeleton-details-field"></div>
          <div className="skeleton-details-field"></div>
          <div className="skeleton-details-field"></div>
          <div className="skeleton-details-field"></div>
          <div className="skeleton-details-field"></div>
        </div>
      </div>
    </div>
  );
}
