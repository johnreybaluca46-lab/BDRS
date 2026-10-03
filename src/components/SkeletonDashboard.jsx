import React from 'react';
import './lib/SkeletonDashboard.css';

export default function SkeletonDashboard() {
  return (
    <div className="skeleton-dashboard">
      <div className="skeleton-greeting-banner"></div>
      
      <div className="skeleton-summary-cards">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="skeleton-summary-card">
            <div className="skeleton-card-title"></div>
            <div className="skeleton-card-value"></div>
            <div className="skeleton-card-link"></div>
          </div>
        ))}
      </div>
      
      <div className="dashboard-bottom-grid skeleton-bottom-grid">
        <div className="dashboard-panel skeleton-panel">
          <div className="skeleton-panel-title"></div>
          <div className="skeleton-panel-content-large"></div>
        </div>
        <div className="dashboard-panel skeleton-panel">
          <div className="skeleton-panel-title"></div>
          <div className="skeleton-panel-list">
            <div className="skeleton-list-item"></div>
            <div className="skeleton-list-item"></div>
            <div className="skeleton-list-item"></div>
            <div className="skeleton-list-item"></div>
          </div>
        </div>
      </div>
      
      <div className="dashboard-extra-charts skeleton-extra-charts">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="dashboard-panel skeleton-panel">
            <div className="skeleton-panel-title"></div>
            <div className="skeleton-panel-content-small"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
